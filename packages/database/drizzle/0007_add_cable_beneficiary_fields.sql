ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "smartcard_number" text;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "operator" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaries_business_smartcard_idx" ON "beneficiaries" USING btree ("business_id","smartcard_number","operator");

