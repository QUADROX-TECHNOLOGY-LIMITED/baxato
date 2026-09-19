import { pgTable, text, timestamp, boolean, jsonb, integer, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { generateEntityId, UserRole } from '@baxato/common';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.SUPER_ADMIN,
  UserRole.STAFF,
  UserRole.SUPPORT,
  UserRole.BUSINESS_OWNER,
  UserRole.BUSINESS_ADMIN,
  UserRole.DEVELOPER,
]);

export const userStatusEnum = pgEnum('user_status', [
  'ACTIVE',
  'SUSPENDED',
  'PENDING_VERIFICATION',
]);

export const kycStatusEnum = pgEnum('kyc_status', [
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);

export const businessStatusEnum = pgEnum('business_status', [
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

// 1. Users Table (Identity, Roles, Instant Verification & NIN KYC Snapshot)
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('usr')),
    clerkId: text('clerk_id').unique(),
    email: text('email').notNull().unique(),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    phoneNumber: text('phone_number'),
    isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    middleName: text('middle_name'),
    avatarUrl: text('avatar_url'),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').default(UserRole.BUSINESS_OWNER).notNull(),
    status: userStatusEnum('status').default('ACTIVE').notNull(),
    kycStatus: kycStatusEnum('kyc_status').default('UNVERIFIED').notNull(),
    nin: text('nin'),
    dob: text('dob'),
    ninData: jsonb('nin_data').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_clerk_id_idx').on(table.clerkId),
    uniqueIndex('users_email_idx').on(table.email),
    index('users_phone_idx').on(table.phoneNumber),
    index('users_role_idx').on(table.role),
    index('users_kyc_status_idx').on(table.kycStatus),
    index('users_status_idx').on(table.status),
  ],
);

// 2. Businesses Table (Multi-tenant isolation, max 3 businesses per user cap)
export const businesses = pgTable(
  'businesses',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('biz')),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    websiteUrl: text('website_url'),
    country: text('country').default('NG').notNull(),
    state: text('state').notNull(),
    lga: text('lga').notNull(),
    status: businessStatusEnum('status').default('ACTIVE').notNull(),
    webhookUrl: text('webhook_url'),
    webhookSecret: text('webhook_secret'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('businesses_slug_idx').on(table.slug),
    index('businesses_owner_id_idx').on(table.ownerId),
    index('businesses_country_state_idx').on(table.country, table.state),
    index('businesses_status_idx').on(table.status),
  ],
);

// 3. Business Members (RBAC team members inside each business)
export const businessMembers = pgTable(
  'business_members',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('mem')),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').default(UserRole.DEVELOPER).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('business_members_biz_user_idx').on(table.businessId, table.userId),
    index('business_members_user_id_idx').on(table.userId),
  ],
);

// 4. KYC Verifications Audit Log Table
export const kycVerifications = pgTable(
  'kyc_verifications',
  {
    id: text('id').primaryKey().$defaultFn(() => generateEntityId('kyc')),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nin: text('nin').notNull(),
    dob: text('dob').notNull(),
    providerName: text('provider_name').default('PREMBLY').notNull(),
    status: kycStatusEnum('status').notNull(),
    matchScore: integer('match_score').default(100).notNull(),
    photoExtracted: boolean('photo_extracted').default(false).notNull(),
    rawResponse: jsonb('raw_response').default({}).notNull(),
    failureReason: text('failure_reason'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('kyc_verifications_user_id_idx').on(table.userId),
    index('kyc_verifications_nin_idx').on(table.nin),
    index('kyc_verifications_status_idx').on(table.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;
export type KycVerification = typeof kycVerifications.$inferSelect;
export type NewKycVerification = typeof kycVerifications.$inferInsert;
