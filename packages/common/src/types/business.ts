import { z } from 'zod';
import { UserRole } from './enums.js';

export const MAX_BUSINESSES_PER_USER = 3;

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Please enter a valid business email address').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  country: z.string().min(2).default('NG').optional(),
  state: z.string().default('Lagos').optional(),
  lga: z.string().default('Ikeja').optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const switchBusinessSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
});

export type SwitchBusinessInput = z.infer<typeof switchBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  webhookUrl: z.string().url('Invalid webhook URL').optional().or(z.literal('')),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const inviteBusinessMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([
    UserRole.BUSINESS_ADMIN,
    UserRole.FINANCE,
    UserRole.DEVELOPER,
    UserRole.SUPPORT,
    UserRole.VIEWER,
  ], {
    errorMap: () => ({ message: 'Member role must be BUSINESS_ADMIN, FINANCE, DEVELOPER, SUPPORT, or VIEWER' }),
  }),
});

export type InviteBusinessMemberInput = z.infer<typeof inviteBusinessMemberSchema>;

export const updateBusinessMemberSchema = z.object({
  role: z.enum([
    UserRole.BUSINESS_ADMIN,
    UserRole.FINANCE,
    UserRole.DEVELOPER,
    UserRole.SUPPORT,
    UserRole.VIEWER,
  ]),
});

export type UpdateBusinessMemberInput = z.infer<typeof updateBusinessMemberSchema>;

export const acceptTeamInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  phoneNumber: z.string().optional(),
});

export type AcceptTeamInvitationInput = z.infer<typeof acceptTeamInvitationSchema>;
