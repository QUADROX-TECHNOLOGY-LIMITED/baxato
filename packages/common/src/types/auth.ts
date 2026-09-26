import { z } from 'zod';
import { UserRole, KycStatus, ApiKeyEnvironment, ApiKeyStatus } from './enums.js';

export const registerUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  isPhoneVerified: z.boolean().optional().default(false),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  clerkId: z.string().optional(),
  // Initial Business Details
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  country: z.string().min(2, 'Country code must be at least 2 characters').default('NG'),
  state: z.string().min(2, 'State must be specified'),
  lga: z.string().min(2, 'LGA or City must be specified'),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const sendPhoneOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema>;

export const verifyPhoneOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export type VerifyPhoneOtpInput = z.infer<typeof verifyPhoneOtpSchema>;

export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

export const verifyNinSchema = z.object({
  nin: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in YYYY-MM-DD format'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type VerifyNinInput = z.infer<typeof verifyNinSchema>;

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  middleName: z.string().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export interface AuthSessionUser {
  id: string;
  email: string;
  role: UserRole;
  businessId?: string;
  kycStatus: KycStatus;
}

export interface ApiKeyDto {
  id: string;
  businessId: string;
  name: string;
  keyPrefix: string;
  environment: ApiKeyEnvironment;
  status: ApiKeyStatus;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createApiKeySchema = z.object({
  name: z.string().min(2, 'Key name must be at least 2 characters').max(64),
  environment: z.nativeEnum(ApiKeyEnvironment).default(ApiKeyEnvironment.TEST),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export interface ApiKeyGeneratedResponse {
  apiKey: ApiKeyDto;
  secretKey: string;
}

export interface ApiKeyContext {
  id: string;
  name: string;
  businessId: string;
  environment: ApiKeyEnvironment;
}
