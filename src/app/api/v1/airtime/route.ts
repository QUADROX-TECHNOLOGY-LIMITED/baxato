import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import redis from '@/lib/redis'; // Assuming you have an exported Redis client
import { verifyAccessToken } from '@/modules/auth/session';
import crypto from 'crypto';

// 1. ZOD SCHEMA: Strict validation
const airtimeSchema = z.object({
  phoneNumber: z.string().regex(/^0[789][01]\d{8}$/, "Invalid Nigerian phone number"),
  amount: z.number().min(50, "Minimum amount is ₦50").max(50000, "Maximum amount is ₦50,000"),
  productCode: z.string().min(1, "Product code is required"), // e.g., '11' for Airtel, '10' for MTN
  idempotencyKey: z.string().uuid("Invalid Idempotency Key"), // Provided by the frontend to prevent double-clicks
});

export async function POST(req: Request) {
  try {
    // --- AUTHENTICATION ---
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = payload.userId;

    // --- PAYLOAD VALIDATION ---
    const body = await req.json();
    const parsed = airtimeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { phoneNumber, amount, productCode, idempotencyKey } = parsed.data;

    // --- SECURITY LAYER 1: REDIS RATE LIMITING ---
    // Limit to 1 request per 3 seconds per user
    const rateLimitKey = `rate_limit:vend:${userId}`;
    const rateLimitCounter = await redis.incr(rateLimitKey);
    if (rateLimitCounter === 1) await redis.expire(rateLimitKey, 3);
    if (rateLimitCounter > 1) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    // --- SECURITY LAYER 2: REDIS IDEMPOTENCY LOCK ---
    // Ensure this exact request hasn't been processed already
    const idemKey = `idem:airtime:${idempotencyKey}`;
    const isLocked = await redis.setnx(idemKey, 'LOCKED');
    if (!isLocked) {
      return NextResponse.json({ error: 'Transaction already processing.' }, { status: 409 });
    }
    await redis.expire(idemKey, 60); // Lock expires in 60s as a failsafe

    // Generate a secure, unique transaction reference for Monnify
    const trxRef = `BAX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const amountInKobo = amount * 100;

    // --- SECURITY LAYER 3: POSTGRES ATOMIC DEDUCTION & LOGGING ---
    // We use a Prisma Transaction to ensure if the wallet deduction fails, the transaction log is never created.
    let transactionLog;
    try {
      await prisma.$transaction(async (tx) => {
        // 1. ATOMIC WALLET DEDUCTION: This raw SQL is immune to race conditions.
        // It updates the balance ONLY if the balance is greater than the amount.
        const updateResult = await tx.$executeRaw`
          UPDATE "Wallet" 
          SET balance = balance - ${amountInKobo}, "updatedAt" = NOW()
          WHERE "userId" = ${userId} AND balance >= ${amountInKobo}
        `;

        if (updateResult === 0) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // 2. CREATE PENDING TRANSACTION
        transactionLog = await tx.transaction.create({
          data: {
            userId,
            reference: trxRef,
            type: 'AIRTIME',
            amount: amountInKobo,
            status: 'PENDING',
            description: `Airtime Topup to ${phoneNumber}`,
            metadata: { phoneNumber, productCode }
          }
        });
      });
    } catch (error: any) {
      await redis.del(idemKey); // Release lock so they can try again with money
      if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 402 });
      }
      throw error; // Unexpected DB error
    }

    // --- PHASE 4: THE MONNIFY API CALL ---
    // At this point, the user's money is safely deducted, and a PENDING log exists.
    try {
      // NOTE: You will need to implement a function to get your Monnify Bearer token
      const monnifyToken = await getMonnifyToken(); 

      const monnifyResponse = await fetch(`${process.env.MONNIFY_BASE_URL}/api/v1/vas/bills-payment/vend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${monnifyToken}`
        },
        body: JSON.stringify({
          productCode: productCode,
          customerId: phoneNumber,
          amount: amount,
          reference: trxRef
        })
      });

      const monnifyData = await monnifyResponse.json();

      if (monnifyData.requestSuccessful && monnifyData.responseBody?.vendStatus === 'SUCCESS') {
        // MARK SUCCESS
        await prisma.transaction.update({
          where: { id: transactionLog.id },
          data: { status: 'SUCCESSFUL', externalReference: monnifyData.responseBody.vendReference }
        });

        // Store successful idempotency response so duplicate requests get the success message
        await redis.set(idemKey, JSON.stringify({ status: 'SUCCESS', reference: trxRef }), 'EX', 86400);

        return NextResponse.json({
          success: true,
          message: 'Airtime successful',
          reference: trxRef
        });

      } else {
        throw new Error(monnifyData.responseMessage || "Vending Failed");
      }

    } catch (monnifyError: any) {
      // --- PHASE 5: THE FAILSAFE REFUND ---
      // If Monnify fails (e.g., MTN network down), we MUST refund the user.
      
      await prisma.$transaction(async (tx) => {
        // 1. Mark transaction as failed
        await tx.transaction.update({
          where: { id: transactionLog.id },
          data: { 
            status: 'FAILED', 
            metadata: { error: monnifyError.message, phoneNumber, productCode } 
          }
        });

        // 2. Atomically Refund the Wallet
        await tx.$executeRaw`
          UPDATE "Wallet" 
          SET balance = balance + ${amountInKobo}, "updatedAt" = NOW()
          WHERE "userId" = ${userId}
        `;
      });

      // Release idempotency lock so user can try again immediately
      await redis.del(idemKey);

      return NextResponse.json({ 
        error: 'Network provider error. Your wallet has been refunded.', 
        details: monnifyError.message 
      }, { status: 502 });
    }

  } catch (error) {
    console.error('[AIRTIME_VEND_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper mock for getting Monnify Auth Token (We will build the real one next)
async function getMonnifyToken() {
  // Logic to fetch and cache Monnify Basic Auth Token goes here
  return "MOCK_TOKEN";
}
