// src/modules/auth/otp.ts

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const OTP_EXPIRY_MINUTES = 10;

export async function generateAndSaveOtp(target: string, type: 'EMAIL' | 'PHONE'): Promise<string> {
  // 1. Generate 6-digit numeric code
  const code = crypto.randomInt(100000, 999999).toString();
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // 2. Delete any existing OTPs for this target to prevent spam buildup
  await prisma.verificationToken.deleteMany({
    where: { target, type },
  });

  // 3. Save new OTP
  await prisma.verificationToken.create({
    data: {
      type,
      target,
      code,
      expiresAt,
    },
  });

  return code;
}

export async function verifyOtpCode(target: string, type: 'EMAIL' | 'PHONE', code: string): Promise<boolean> {
  const record = await prisma.verificationToken.findFirst({
    where: {
      target,
      type,
      code,
      expiresAt: { gt: new Date() }, // Must not be expired
    },
  });

  if (!record) return false;

  // Once verified successfully, delete it so it cannot be reused
  await prisma.verificationToken.delete({
    where: { id: record.id },
  });

  return true;
}
