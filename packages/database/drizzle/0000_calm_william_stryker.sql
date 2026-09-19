CREATE TYPE "public"."business_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'BUSINESS_OWNER', 'BUSINESS_ADMIN', 'DEVELOPER');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');--> statement-breakpoint
CREATE TYPE "public"."ledger_category" AS ENUM('FUNDING', 'AIRTIME_PURCHASE', 'DATA_PURCHASE', 'CABLE_TV_PURCHASE', 'ELECTRICITY_PURCHASE', 'EXAM_PIN_PURCHASE', 'COMMISSION_EARNED', 'REFUND', 'ADJUSTMENT', 'WITHDRAWAL');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('MAIN', 'COMMISSION');--> statement-breakpoint
CREATE TYPE "public"."exam_body" AS ENUM('WAEC', 'NECO', 'NABTEB', 'JAMB');--> statement-breakpoint
CREATE TYPE "public"."exam_pin_status" AS ENUM('AVAILABLE', 'RESERVED', 'DISPENSED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."provider_name" AS ENUM('INTERSWITCH', 'MONNIFY', 'INTERNAL_MOCK');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('ACTIVE', 'DEGRADED', 'MAINTENANCE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('AIRTIME', 'DATA', 'CABLE_TV', 'ELECTRICITY', 'EXAM_PIN');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."api_key_environment" AS ENUM('LIVE', 'TEST');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('PENDING', 'SUCCESSFUL', 'FAILED');--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role" DEFAULT 'DEVELOPER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "business_status" DEFAULT 'ACTIVE' NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"phone_number" text,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'BUSINESS_OWNER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "financial_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"transaction_id" text,
	"entry_type" "ledger_entry_type" NOT NULL,
	"amount" bigint NOT NULL,
	"balance_before" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"category" "ledger_category" NOT NULL,
	"description" text NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"type" "wallet_type" DEFAULT 'MAIN' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"locked_balance" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_body" "exam_body" NOT NULL,
	"pin_encrypted" text NOT NULL,
	"serial_encrypted" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" "exam_pin_status" DEFAULT 'AVAILABLE' NOT NULL,
	"dispensed_transaction_id" text,
	"dispensed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"provider_name" "provider_name" NOT NULL,
	"request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_code" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "provider_name" NOT NULL,
	"status" "provider_status" DEFAULT 'ACTIVE' NOT NULL,
	"failure_rate" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "service_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"service_type" "service_type" NOT NULL,
	"amount" bigint NOT NULL,
	"fee" bigint DEFAULT 0 NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"recipient" text NOT NULL,
	"provider_name" "provider_name" NOT NULL,
	"provider_reference" text,
	"client_reference" text,
	"request_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"environment" "api_key_environment" DEFAULT 'TEST' NOT NULL,
	"status" "api_key_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"business_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"business_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_pins" ADD CONSTRAINT "exam_pins_dispensed_transaction_id_service_transactions_id_fk" FOREIGN KEY ("dispensed_transaction_id") REFERENCES "public"."service_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transactions" ADD CONSTRAINT "provider_transactions_transaction_id_service_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."service_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_transactions" ADD CONSTRAINT "service_transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_transactions" ADD CONSTRAINT "service_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_biz_user_idx" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_members_user_id_idx" ON "business_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_idx" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_owner_id_idx" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ledger_business_id_idx" ON "financial_ledger" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ledger_wallet_id_idx" ON "financial_ledger" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "ledger_transaction_id_idx" ON "financial_ledger" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ledger_reference_idx" ON "financial_ledger" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "ledger_created_at_idx" ON "financial_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_biz_type_idx" ON "wallets" USING btree ("business_id","type");--> statement-breakpoint
CREATE INDEX "wallets_business_id_idx" ON "wallets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "pins_exam_body_status_idx" ON "exam_pins" USING btree ("exam_body","status");--> statement-breakpoint
CREATE INDEX "pins_dispensed_txn_idx" ON "exam_pins" USING btree ("dispensed_transaction_id");--> statement-breakpoint
CREATE INDEX "ptx_transaction_id_idx" ON "provider_transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "ptx_provider_name_idx" ON "provider_transactions" USING btree ("provider_name");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_name_idx" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "providers_status_idx" ON "providers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "txn_business_id_idx" ON "service_transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "txn_user_id_idx" ON "service_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "txn_service_type_idx" ON "service_transactions" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "txn_status_idx" ON "service_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "txn_client_reference_idx" ON "service_transactions" USING btree ("client_reference");--> statement-breakpoint
CREATE INDEX "txn_request_reference_idx" ON "service_transactions" USING btree ("request_reference");--> statement-breakpoint
CREATE INDEX "txn_provider_reference_idx" ON "service_transactions" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "txn_created_at_idx" ON "service_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_business_id_idx" ON "api_keys" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "api_keys_status_idx" ON "api_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_business_id_idx" ON "audit_logs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_biz_key_idx" ON "idempotency_keys" USING btree ("business_id","key");--> statement-breakpoint
CREATE INDEX "idempotency_locked_until_idx" ON "idempotency_keys" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "whd_business_id_idx" ON "webhook_deliveries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "whd_status_next_retry_idx" ON "webhook_deliveries" USING btree ("status","next_retry_at");