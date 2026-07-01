import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { verifyAccessToken } from '@/modules/auth/session';
import { getMonnifyToken } from '@/modules/monnify/monnify.service';
import crypto from 'crypto';
import { ServiceTransaction } from '@prisma/client'; // FIX: Correct model imported

const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';

const airtimeSchema = z.object({
  phoneNumber: z.string().regex(/^0[789][01]\d{8}$/, "Invalid Nigerian phone number"),
  amount: z.number().min(50, "Minimum amount is ₦50").max(50000, "Maximum amount is ₦50,000"),
  productCode: z.string().min(1, "Product code is required"),
  idempotencyKey: z.string().uuid("Invalid Idempotency Key"),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = payload.userId;

    const body = await req.json();
    const parsed = airtimeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { phoneNumber, amount, productCode, idempotencyKey } = parsed.data;

    // RATE LIMITING
    const rateLimitKey = `rate_limit:vend:${userId}`;
    const rateLimitCounter = await redis.incr(rateLimitKey);
    if (rateLimitCounter === 1) await redis.expire(rateLimitKey, 3);
    if (rateLimitCounter > 1) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    // IDEMPOTENCY LOCK
    const idemKey = `idem:airtime:${idempotencyKey}`;
    const isLocked = await redis.setNX(idemKey, 'LOCKED');
    if (!isLocked) {
      return NextResponse.json({ error: 'Transaction already processing.' }, { status: 409 });
    }
    await redis.expire(idemKey, 60);

    const trxRef = `BAX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    // Math.round ensures no decimals ever sneak in before BigInt conversion
    const amountInKobo = Math.round(amount * 100); 

    // FIX: Using your exact Prisma model type
    let transactionLog: ServiceTransaction; 
    
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Fetch wallet to get the ID for the Ledger
        const userWallet = await tx.wallet.findUnique({ where: { userId } });
        if (!userWallet || userWallet.balance < BigInt(amountInKobo)) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // 2. Safely deduct the balance
        const updateResult = await tx.$executeRaw`
          UPDATE "Wallet" 
          SET balance = balance - ${amountInKobo}, "updatedAt" = NOW()
          WHERE "userId" = ${userId} AND balance >= ${amountInKobo}
        `;

        if (updateResult === 0) throw new Error("INSUFFICIENT_FUNDS");

        // 3. Create the Double-Entry Ledger record (Enforcing your schema rule)
        await tx.walletLedger.create({
          data: {
            walletId: userWallet.id,
            amount: BigInt(amountInKobo),
            type: 'DEBIT',
            balanceAfter: userWallet.balance - BigInt(amountInKobo),
            description: `Airtime Topup: ${phoneNumber}`,
            reference: trxRef
          }
        });

        // 4. Create the Service Transaction log exactly matching your schema fields
        transactionLog = await tx.serviceTransaction.create({
          data: {
            id: trxRef, // We use the BAX- ref as the primary ID
            userId,
            serviceType: 'AIRTIME',
            amount: BigInt(amountInKobo),
            status: 'PENDING',
            provider: 'MONNIFY',
            idempotencyKey,
            requestData: { phoneNumber, productCode, requestedAmount: amount }
          }
        });
      });
    } catch (error: any) {
      await redis.del(idemKey);
      if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 402 });
      }
      throw error;
    }

    // EXTERNAL VEND EXECUTION
    try {
      const monnifyToken = await getMonnifyToken(); 

      const monnifyResponse = await fetch(`${MONNIFY_BASE_URL}/api/v1/vas/bills-payment/vend`, {
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
        await prisma.serviceTransaction.update({
          where: { id: transactionLog!.id }, 
          data: { 
            status: 'SUCCESSFUL', 
            providerRef: monnifyData.responseBody.vendReference,
            responseData: monnifyData
          }
        });

        await redis.set(idemKey, JSON.stringify({ status: 'SUCCESS', reference: trxRef }), { EX: 86400 });

        return NextResponse.json({
          success: true,
          message: 'Airtime successful',
          reference: trxRef
        });
      } else {
        throw new Error(monnifyData.responseMessage || "Vending Failed");
      }

    } catch (monnifyError: any) {
      // ATOMIC SAFETYNET REFUND
      await prisma.$transaction(async (tx) => {
        const refundWallet = await tx.wallet.findUnique({ where: { userId } });
        
        // 1. Refund the Wallet
        await tx.$executeRaw`
          UPDATE "Wallet" 
          SET balance = balance + ${amountInKobo}, "updatedAt" = NOW()
          WHERE "userId" = ${userId}
        `;

        // 2. Log the Refund Ledger
        if (refundWallet) {
          await tx.walletLedger.create({
            data: {
              walletId: refundWallet.id,
              amount: BigInt(amountInKobo),
              type: 'CREDIT',
              balanceAfter: refundWallet.balance + BigInt(amountInKobo),
              description: `Refund: Airtime Failed`,
              reference: `${trxRef}-REFUND`
            }
          });
        }

        // 3. Update Transaction Status
        await tx.serviceTransaction.update({
          where: { id: transactionLog!.id },
          data: { 
            status: 'FAILED', 
            responseData: { error: monnifyError.message } 
          }
        });
      });

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
