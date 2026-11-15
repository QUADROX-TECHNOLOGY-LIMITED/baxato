ALTER TABLE "beneficiaries" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "meter_number" text;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "disco" text;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "meter_type" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaries_business_meter_idx" ON "beneficiaries" USING btree ("business_id","meter_number","disco","meter_type");

