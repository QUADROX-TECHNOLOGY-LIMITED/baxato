DO $$ BEGIN
  CREATE TYPE "public"."kyc_status" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kyc_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"nin" text NOT NULL,
	"dob" text NOT NULL,
	"provider_name" text DEFAULT 'PREMBLY' NOT NULL,
	"status" "kyc_status" NOT NULL,
	"match_score" integer DEFAULT 100 NOT NULL,
	"photo_extracted" boolean DEFAULT false NOT NULL,
	"raw_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "users" SET "first_name" = 'User' WHERE "first_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
UPDATE "users" SET "last_name" = 'Member' WHERE "last_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "website_url" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'NG' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "lga" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "middle_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kyc_status" "kyc_status" DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nin" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dob" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nin_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_verifications_user_id_idx" ON "kyc_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_verifications_nin_idx" ON "kyc_verifications" USING btree ("nin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_verifications_status_idx" ON "kyc_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_country_state_idx" ON "businesses" USING btree ("country","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_kyc_status_idx" ON "users" USING btree ("kyc_status");--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."business_members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."business_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."business_members" SET "role" = 'STAFF' WHERE "role" = 'ADMIN';--> statement-breakpoint
UPDATE "public"."users" SET "role" = 'STAFF' WHERE "role" = 'ADMIN';--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_role" CASCADE;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'STAFF', 'SUPPORT', 'BUSINESS_OWNER', 'BUSINESS_ADMIN', 'DEVELOPER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."business_members" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."business_members" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER'::"public"."user_role";--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."users" ALTER COLUMN "role" SET DEFAULT 'BUSINESS_OWNER'::"public"."user_role";