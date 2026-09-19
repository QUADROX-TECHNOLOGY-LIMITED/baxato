import { z } from 'zod';
import { UserRole } from './enums';

export const MAX_BUSINESSES_PER_USER = 3;

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  country: z.string().min(2, 'Country code must be at least 2 characters').default('NG'),
  state: z.string().min(2, 'State is required'),
  lga: z.string().min(2, 'LGA or City is required'),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  webhookUrl: z.string().url('Invalid webhook URL').optional().or(z.literal('')),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const inviteBusinessMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([UserRole.BUSINESS_ADMIN, UserRole.DEVELOPER], {
    errorMap: () => ({ message: 'Member role must be BUSINESS_ADMIN or DEVELOPER' }),
  }),
});

export type InviteBusinessMemberInput = z.infer<typeof inviteBusinessMemberSchema>;

export const updateBusinessMemberSchema = z.object({
  role: z.enum([UserRole.BUSINESS_ADMIN, UserRole.DEVELOPER]),
});

export type UpdateBusinessMemberInput = z.infer<typeof updateBusinessMemberSchema>;
