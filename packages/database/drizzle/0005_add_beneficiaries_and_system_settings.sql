CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "maintenance_mode" boolean DEFAULT false NOT NULL,
  "kill_switches" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "disabled_networks" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "disabled_data_plans" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_by_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_idx" ON "system_settings" USING btree ("key");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beneficiaries" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "user_id" text,
  "phone_number" text NOT NULL,
  "network" text,
  "label" text,
  "service_type" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beneficiaries_business_id_idx" ON "beneficiaries" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beneficiaries_created_at_idx" ON "beneficiaries" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaries_business_phone_idx" ON "beneficiaries" USING btree ("business_id", "phone_number");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

