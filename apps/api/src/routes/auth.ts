import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  registerUserSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  loginUserSchema,
  changePasswordRequestSchema,
  changePasswordConfirmSchema,
  verify2FaEmailSchema,
  verify2FaTotpSchema,
  disable2FaSchema,
  createSuccessResponse,
  ValidationError,
  ConflictError,
  AuthenticationError,
  UserRole,
  WalletType,
  KycStatus,
  generateEntityId,
} from '@baxato/common';
import { db, users, businesses, wallets, eq } from '@baxato/database';
import { env } from '@baxato/config';
import { whatsAppService } from '../services/whatsapp.service.js';
import { zeptoMailService } from '../services/zeptomail.service.js';
import { twoFactorService } from '../services/two-factor.service.js';
import { generateToken, authenticate } from '../plugins/auth.plugin.js';
import { auditService } from '../services/audit.service.js';

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
    const rawClerkId = data.clerkId?.trim() || (request.body as Record<string, any>)?.clerkId?.trim();

    // Check if email already exists
    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase().trim()))
      .limit(1);

    if (existingEmail) {
      throw new ConflictError(`An account with email ${data.email} already exists.`);
    }

    // Check if clerkId already exists (if provided)
    if (rawClerkId) {
      const [existingClerk] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, rawClerkId))
        .limit(1);

      if (existingClerk) {
        throw new ConflictError('An account is already linked to this authentication identity. Please sign in.');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    const normalizedPhone = whatsAppService.normalizePhoneNumber(data.phoneNumber);
    const userId = generateEntityId('usr');
    const finalClerkId = rawClerkId || `clerk_${userId}`;

    let newUser;
    let newBusiness;

    try {
      // 1. Create User
      const [createdUser] = await db
        .insert(users)
        .values({
          id: userId,
          clerkId: finalClerkId,
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

      newUser = createdUser;
      if (!newUser) {
        throw new Error('Failed to create user record.');
      }

      // 2. Create Initial Business (with Country, State, LGA)
      const rawSlug = data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const baseSlug = rawSlug || 'business';
      const slug = `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const [createdBusiness] = await db
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

      newBusiness = createdBusiness;

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
    } catch (dbErr: any) {
      request.log.error({ err: dbErr }, 'Database error during merchant registration');
      if (dbErr.code === '23505') {
        const detail = dbErr.detail || dbErr.message || '';
        if (detail.includes('email')) {
          throw new ConflictError(`An account with email ${data.email} already exists.`);
        }
        if (detail.includes('clerk_id') || detail.includes('clerk')) {
          throw new ConflictError('An account is already linked to this authentication identity. Please sign in.');
        }
        if (detail.includes('slug')) {
          throw new ConflictError('A business with this name already exists. Please choose a different business name.');
        }
        throw new ConflictError(`Registration conflict: ${detail}`);
      }
      if (dbErr.code === '23502') {
        throw new ValidationError(`Required field missing in database: ${dbErr.column || 'column'}`);
      }
      throw dbErr;
    }

    // 4. Dispatch Email Verification via ZeptoMail ONLY if not already verified
    if (!newUser.isEmailVerified) {
      try {
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
      } catch (mailErr) {
        request.log.warn({ err: mailErr }, 'ZeptoMail email verification failed during registration (non-blocking)');
      }
    }

    // 5. Dispatch WhatsApp OTP for phone verification if not already verified
    if (!data.isPhoneVerified) {
      try {
        await whatsAppService.sendOtp(normalizedPhone);
      } catch (waErr) {
        request.log.warn({ err: waErr }, 'WhatsApp OTP dispatch failed during registration (non-blocking)');
      }
    }

    // 6. Generate Session Token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      businessId: newBusiness?.id,
      kycStatus: newUser.kycStatus as KycStatus,
    });

    // 7. Record registration in audit_logs
    await auditService.log({
      userId: newUser.id,
      businessId: newBusiness?.id,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: newUser.id,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || undefined,
      changes: {
        email: newUser.email,
        businessName: newBusiness?.name,
        role: newUser.role,
      },
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
    request.log.info({ body: request.body }, '[WhatsApp] Received phone OTP verification request');

    const parseResult = verifyPhoneOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid OTP payload');
    }

    const { phoneNumber, otp } = parseResult.data;
    const verification = whatsAppService.verifyOtp(phoneNumber, otp);

    if (!verification.valid) {
      request.log.warn(
        { phoneNumber, reason: verification.reason },
        '[WhatsApp] Phone OTP verification rejected',
      );
      throw new ValidationError(verification.reason || 'Invalid verification code.');
    }

    request.log.info({ phoneNumber }, '[WhatsApp] Phone OTP verification succeeded');

    // Update user record if matching phone exists (for existing registered users)
    try {
      const normalizedPhone = whatsAppService.normalizePhoneNumber(phoneNumber);
      await db
        .update(users)
        .set({ isPhoneVerified: true, updatedAt: new Date() })
        .where(eq(users.phoneNumber, normalizedPhone));
    } catch (dbErr) {
      request.log.warn(
        { phoneNumber, err: dbErr },
        '[WhatsApp] DB user update skipped (user may be registering in-flow)',
      );
    }

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

    // Handle Two-Factor Authentication if enabled
    if (user.twoFactorEnabled) {
      const code = parseResult.data.twoFactorCode?.trim();
      if (!code) {
        if (user.twoFactorMethod === 'EMAIL') {
          await zeptoMailService.sendTwoFactorOtp(user.email, user.firstName);
          const activeOtp = zeptoMailService.getActiveTwoFactorOtp(user.email);
          if (env.NODE_ENV !== 'production') {
            request.log.info({ email: user.email, otp: activeOtp }, '[DEV] Login 2FA Email OTP dispatched');
          }
        }

        return reply.status(200).send(
          createSuccessResponse(
            {
              requiresTwoFactor: true,
              twoFactorMethod: user.twoFactorMethod || 'EMAIL',
              email: user.email,
              message:
                user.twoFactorMethod === 'TOTP'
                  ? 'Please enter the 6-digit code from your authenticator app.'
                  : `A 6-digit verification code has been dispatched to ${user.email}.`,
            },
            request.id,
          ),
        );
      }

      let is2FaValid = false;
      if (user.twoFactorMethod === 'TOTP') {
        if (user.twoFactorSecret) {
          is2FaValid = twoFactorService.verifyTotp(user.twoFactorSecret, code);
        }
        if (!is2FaValid && Array.isArray(user.twoFactorBackupCodes)) {
          const codeHash = crypto.createHash('sha256').update(code).digest('hex');
          const backupList = user.twoFactorBackupCodes as string[];
          const matchIdx = backupList.indexOf(codeHash);
          if (matchIdx !== -1) {
            is2FaValid = true;
            const remaining = backupList.filter((_, idx) => idx !== matchIdx);
            await db
              .update(users)
              .set({ twoFactorBackupCodes: remaining, updatedAt: new Date() })
              .where(eq(users.id, user.id));
          }
        }
      } else {
        const emailVerify = zeptoMailService.verifyTwoFactorOtp(user.email, code);
        is2FaValid = emailVerify.valid;
      }

      if (!is2FaValid) {
        throw new ValidationError('Invalid or expired two-factor authentication code.');
      }
    }

    // Fetch primary business
    const [biz] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        country: businesses.country,
        state: businesses.state,
        lga: businesses.lga,
      })
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

    // Record login in audit_logs
    await auditService.log({
      userId: user.id,
      businessId: biz?.id,
      action: 'USER_LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || undefined,
      changes: {
        email: user.email,
        role: user.role,
      },
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
          business: biz
            ? {
                id: biz.id,
                name: biz.name,
                slug: biz.slug,
                country: biz.country,
                state: biz.state,
                lga: biz.lga,
              }
            : null,
          token,
        },
        request.id,
      ),
    );
  });

  /**
   * POST /auth/change-password/request
   * Validates current password and dispatches 6-digit confirmation code to registered email via ZeptoMail.
   */
  fastify.post(
    '/change-password/request',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const parseResult = changePasswordRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(
          parseResult.error.errors.map((e) => e.message).join(', '),
        );
      }

      const { currentPassword, newPassword } = parseResult.data;

      if (currentPassword === newPassword) {
        throw new ValidationError('New password must be different from your current password.');
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('User account not found or password not set.');
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new ValidationError('Current password is incorrect.');
      }

      const emailResult = await zeptoMailService.sendPasswordChangeOtp(
        user.email,
        user.firstName,
      );

      const activeOtp = zeptoMailService.getActivePasswordChangeOtp(user.email);
      if (env.NODE_ENV !== 'production') {
        request.log.info({ email: user.email, otp: activeOtp }, '[DEV] Password change confirmation code dispatched');
      }

      if (!emailResult.success) {
        request.log.error(
          { email: user.email, error: emailResult.error },
          'Failed to dispatch password change confirmation email',
        );
      }

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'PASSWORD_CHANGE_REQUESTED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { email: user.email },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            sent: true,
            message: 'A 6-digit confirmation code was sent to your registered email address.',
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/change-password/confirm
   * Validates current password + email OTP code and commits new password hash.
   */
  fastify.post(
    '/change-password/confirm',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const parseResult = changePasswordConfirmSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(
          parseResult.error.errors.map((e) => e.message).join(', '),
        );
      }

      const { currentPassword, newPassword, otp } = parseResult.data;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('User account not found.');
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new ValidationError('Current password is incorrect.');
      }

      const verification = zeptoMailService.verifyPasswordChangeOtp(user.email, otp);
      if (!verification.valid) {
        throw new ValidationError(
          verification.reason || 'Invalid or expired confirmation code.',
        );
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'PASSWORD_CHANGED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { email: user.email },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            updated: true,
            message: 'Password updated successfully. Please use your new password next time you sign in.',
          },
          request.id,
        ),
      );
    },
  );

  /**
   * GET /auth/2fa/status
   * Returns current Two-Factor Authentication state for the authenticated user.
   */
  fastify.get(
    '/2fa/status',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          twoFactorEnabled: users.twoFactorEnabled,
          twoFactorMethod: users.twoFactorMethod,
          twoFactorBackupCodes: users.twoFactorBackupCodes,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User account not found');
      }

      const backupCodesList = Array.isArray(user.twoFactorBackupCodes)
        ? (user.twoFactorBackupCodes as any[])
        : [];

      return reply.status(200).send(
        createSuccessResponse(
          {
            enabled: Boolean(user.twoFactorEnabled),
            method: user.twoFactorMethod || null,
            hasBackupCodes: backupCodesList.length > 0,
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/2fa/email/request
   * Dispatches a real 6-digit confirmation code via ZeptoMail to the user's verified email.
   */
  fastify.post(
    '/2fa/email/request',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User account not found');
      }

      const result = await zeptoMailService.sendTwoFactorOtp(user.email, user.firstName);
      const activeOtp = zeptoMailService.getActiveTwoFactorOtp(user.email);
      if (env.NODE_ENV !== 'production') {
        request.log.info({ email: user.email, otp: activeOtp }, '[DEV] 2FA Email verification code dispatched');
      }

      if (!result.success) {
        request.log.warn(
          { email: user.email, error: result.error },
          'ZeptoMail dispatch warning during 2FA request',
        );
        if (env.NODE_ENV === 'production') {
          throw new ValidationError('Could not dispatch verification email. Please try again or check your mailbox.');
        }
      }

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'USER_2FA_EMAIL_REQUESTED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { email: user.email },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            sent: true,
            email: user.email,
            message: `A 6-digit verification code has been dispatched to ${user.email}.`,
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/2fa/email/verify
   * Validates the 6-digit email OTP and permanently enables Email Two-Factor Authentication.
   */
  fastify.post(
    '/2fa/email/verify',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const parseResult = verify2FaEmailSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid verification code');
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User account not found');
      }

      const verification = zeptoMailService.verifyTwoFactorOtp(user.email, parseResult.data.otp);
      if (!verification.valid) {
        throw new ValidationError(verification.reason || 'Invalid or expired verification code.');
      }

      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorMethod: 'EMAIL',
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'USER_2FA_ENABLED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { method: 'EMAIL' },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            enabled: true,
            method: 'EMAIL',
            message: 'Two-Factor Authentication via Email Code enabled successfully.',
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/2fa/totp/setup
   * Generates a cryptographically secure TOTP secret, standard otpauth URI, and QR code Data URL.
   */
  fastify.post(
    '/2fa/totp/setup',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User account not found');
      }

      const secret = twoFactorService.generateSecret();
      const otpAuthUri = twoFactorService.generateOtpAuthUri(user.email, secret, 'BAXATO');
      const qrCodeDataUrl = await twoFactorService.generateQrCodeDataUrl(otpAuthUri);
      const { codes } = twoFactorService.generateBackupRecoveryCodes();

      return reply.status(200).send(
        createSuccessResponse(
          {
            secret,
            qrCodeDataUrl,
            otpAuthUri,
            backupCodes: codes,
            message: 'Scan the QR code in Google Authenticator or enter the secret manually, then verify with a 6-digit code.',
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/2fa/totp/verify
   * Verifies the 6-digit TOTP code against the secret and activates TOTP Two-Factor Authentication.
   */
  fastify.post(
    '/2fa/totp/verify',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const parseResult = verify2FaTotpSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid parameters');
      }

      const { secret, token, backupCodes } = parseResult.data;

      const isValid = twoFactorService.verifyTotp(secret, token);
      if (!isValid) {
        throw new ValidationError('Invalid authenticator code. Please check your authenticator app and try again.');
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User account not found');
      }

      let hashedList: string[] = [];
      if (backupCodes && Array.isArray(backupCodes) && backupCodes.length > 0) {
        hashedList = backupCodes.map((code) =>
          crypto.createHash('sha256').update(code.trim()).digest('hex'),
        );
      } else {
        const generated = twoFactorService.generateBackupRecoveryCodes();
        hashedList = generated.hashedCodes;
      }

      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorMethod: 'TOTP',
          twoFactorSecret: secret,
          twoFactorBackupCodes: hashedList,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'USER_2FA_ENABLED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { method: 'TOTP' },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            enabled: true,
            method: 'TOTP',
            message: 'Authenticator App (TOTP) Two-Factor Authentication activated successfully.',
          },
          request.id,
        ),
      );
    },
  );

  /**
   * POST /auth/2fa/disable
   * Validates account password and safely turns off Two-Factor Authentication.
   */
  fastify.post(
    '/2fa/disable',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new ValidationError('Authentication required');
      }

      const parseResult = disable2FaSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors[0]?.message || 'Password is required to disable 2FA');
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('User account not found');
      }

      const isMatch = await bcrypt.compare(parseResult.data.password, user.passwordHash);
      if (!isMatch) {
        throw new ValidationError('Current password is incorrect.');
      }

      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await auditService.log({
        userId: user.id,
        businessId: request.user?.businessId,
        action: 'USER_2FA_DISABLED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) || undefined,
        changes: { enabled: false },
      });

      return reply.status(200).send(
        createSuccessResponse(
          {
            enabled: false,
            message: 'Two-Factor Authentication has been disabled.',
          },
          request.id,
        ),
      );
    },
  );
};
