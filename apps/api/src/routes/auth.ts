import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import {
  registerUserSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  loginUserSchema,
  createSuccessResponse,
  ValidationError,
  ConflictError,
  AuthenticationError,
  UserRole,
  WalletType,
  KycStatus,
} from '@baxato/common';
import { db, users, businesses, wallets, eq } from '@baxato/database';
import { env } from '@baxato/config';
import { whatsAppService } from '../services/whatsapp.service';
import { zeptoMailService } from '../services/zeptomail.service';
import { generateToken } from '../plugins/auth.plugin';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/register
   * Registers a new merchant user, creates their primary business & wallets, and dispatches phone OTP.
   */
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const data = parseResult.data;

    // Check if email already exists
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase().trim()))
      .limit(1);

    if (existingEmail) {
      throw new ConflictError(`An account with email ${data.email} already exists.`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    const normalizedPhone = whatsAppService.normalizePhoneNumber(data.phoneNumber);

    // 1. Create User
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName ? data.middleName.trim() : null,
        phoneNumber: normalizedPhone,
        passwordHash,
        isEmailVerified: true,
        isPhoneVerified: data.isPhoneVerified ?? false,
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.UNVERIFIED,
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user record.');
    }

    // 2. Create Initial Business (with Country, State, LGA)
    const baseSlug = data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const [newBusiness] = await db
      .insert(businesses)
      .values({
        ownerId: newUser.id,
        name: data.businessName.trim(),
        slug,
        websiteUrl: data.websiteUrl || null,
        country: data.country.toUpperCase(),
        state: data.state.trim(),
        lga: data.lga.trim(),
        status: 'ACTIVE',
      })
      .returning();

    // 3. Provision Initial Main and Commission Wallets
    if (newBusiness) {
      await db.insert(wallets).values([
        {
          businessId: newBusiness.id,
          type: WalletType.MAIN,
          balance: 0n,
        },
        {
          businessId: newBusiness.id,
          type: WalletType.COMMISSION,
          balance: 0n,
        },
      ]);
    }

    // 4. Dispatch Email Verification via ZeptoMail
    const emailVerificationToken = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      businessId: newBusiness?.id,
      kycStatus: newUser.kycStatus as KycStatus,
    });
    await zeptoMailService.sendVerificationEmail(
      newUser.email,
      `${newUser.firstName} ${newUser.lastName}`,
      emailVerificationToken,
    );

    // 5. Dispatch WhatsApp OTP for phone verification if not already verified
    if (!data.isPhoneVerified) {
      await whatsAppService.sendOtp(normalizedPhone);
    }

    // 6. Generate Session Token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      businessId: newBusiness?.id,
      kycStatus: newUser.kycStatus as KycStatus,
    });

    return reply.status(201).send(
      createSuccessResponse(
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            middleName: newUser.middleName,
            phoneNumber: newUser.phoneNumber,
            isEmailVerified: newUser.isEmailVerified,
            isPhoneVerified: newUser.isPhoneVerified,
            kycStatus: newUser.kycStatus,
            role: newUser.role,
          },
          business: newBusiness
            ? {
                id: newBusiness.id,
                name: newBusiness.name,
                slug: newBusiness.slug,
                country: newBusiness.country,
                state: newBusiness.state,
                lga: newBusiness.lga,
              }
            : null,
          token,
          message: data.isPhoneVerified
            ? 'Account created successfully.'
            : 'Account created successfully. A WhatsApp verification code was sent to your phone.',
        },
        request.id,
      ),
    );
  });

  /**
   * POST /auth/send-phone-otp
   */
  fastify.post('/send-phone-otp', async (request, reply) => {
    const parseResult = sendPhoneOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid phone number');
    }

    const { phoneNumber } = parseResult.data;
    request.log.info({ phoneNumber }, '[WhatsApp] Phone OTP verification request received');

    const result = await whatsAppService.sendOtp(phoneNumber);
    const activeCode = whatsAppService.getActiveOtpForTesting(phoneNumber);
    if (env.NODE_ENV !== 'production') {
      request.log.info({ phone: phoneNumber, otp: activeCode }, '[DEV] WhatsApp OTP code dispatched');
    }

    if (!result.success) {
      request.log.error(
        { phone: phoneNumber, error: result.error },
        '[WhatsApp] WhatsApp OTP dispatch failed',
      );
      throw new ValidationError(
        result.error || 'Could not send WhatsApp message. Please check WhatsApp service configuration.',
      );
    }

    request.log.info(
      { phone: phoneNumber, messageId: result.messageId },
      '[WhatsApp] Phone OTP message accepted by Meta Cloud API',
    );

    return reply.status(200).send(
      createSuccessResponse(
        {
          sent: true,
          messageId: result.messageId,
          message: 'Verification code sent to WhatsApp successfully.',
        },
        request.id,
      ),
    );
  });

  /**
   * POST /auth/verify-phone & POST /auth/verify-phone-otp
   */
  const handleVerifyPhone = async (request: any, reply: any) => {
    const parseResult = verifyPhoneOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid OTP payload');
    }

    const { phoneNumber, otp } = parseResult.data;
    const verification = whatsAppService.verifyOtp(phoneNumber, otp);

    if (!verification.valid) {
      throw new ValidationError(verification.reason || 'Invalid verification code.');
    }

    // Update user record if matching phone exists
    const normalizedPhone = whatsAppService.normalizePhoneNumber(phoneNumber);
    await db
      .update(users)
      .set({ isPhoneVerified: true, updatedAt: new Date() })
      .where(eq(users.phoneNumber, normalizedPhone));

    return reply.status(200).send(
      createSuccessResponse(
        {
          verified: true,
          message: 'Phone number verified successfully.',
        },
        request.id,
      ),
    );
  };

  fastify.post('/verify-phone', handleVerifyPhone);
  fastify.post('/verify-phone-otp', handleVerifyPhone);

  /**
   * POST /auth/send-email-otp
   */
  fastify.post('/send-email-otp', async (request, reply) => {
    const body = request.body as { email?: string; name?: string };
    if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new ValidationError('A valid email address is required.');
    }

    const result = await zeptoMailService.sendOtp(body.email, body.name);
    const activeCode = zeptoMailService.getActiveOtp(body.email);
    if (env.NODE_ENV !== 'production') {
      request.log.info({ email: body.email, otp: activeCode }, '[DEV] Email OTP code dispatched');
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          sent: result.success,
          message: result.success
            ? 'Verification code sent to your email.'
            : 'Could not dispatch email. Please check your address.',
        },
        request.id,
      ),
    );
  });

  /**
   * POST /auth/verify-email-otp
   */
  fastify.post('/verify-email-otp', async (request, reply) => {
    const body = request.body as { email?: string; otp?: string };
    if (!body?.email || !body?.otp) {
      throw new ValidationError('Email and 6-digit OTP code are required.');
    }

    const verification = zeptoMailService.verifyOtp(body.email, body.otp);
    if (!verification.valid) {
      throw new ValidationError(verification.reason || 'Invalid verification code.');
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          verified: true,
          message: 'Email address verified successfully.',
        },
        request.id,
      ),
    );
  });



  /**
   * POST /auth/login
   */
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Email and password are required');
    }

    const { email, password } = parseResult.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError(`Your account is ${user.status}. Please contact support.`);
    }

    // Fetch primary business
    const [biz] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerId, user.id))
      .limit(1);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      businessId: biz?.id,
      kycStatus: user.kycStatus as KycStatus,
    });

    return reply.status(200).send(
      createSuccessResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            phoneNumber: user.phoneNumber,
            avatarUrl: user.avatarUrl,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            kycStatus: user.kycStatus,
            role: user.role,
          },
          token,
        },
        request.id,
      ),
    );
  });
};
