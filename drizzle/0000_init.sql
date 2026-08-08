CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time NOT NULL,
	"meeting_platform" text NOT NULL,
	"meeting_link" text,
	"google_calendar_event_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"commission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_meeting_platform" CHECK ("bookings"."meeting_platform" IN ('google_meet', 'discord', 'zoom')),
	CONSTRAINT "bookings_status" CHECK ("bookings"."status" IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'))
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"yarn_color" text NOT NULL,
	"yarn_type" text NOT NULL,
	"yarn_thickness" text NOT NULL,
	"item_description" text NOT NULL,
	"is_gift" boolean DEFAULT false NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"fulfillment_type" text NOT NULL,
	"shipping_address_line1" text,
	"shipping_address_line2" text,
	"shipping_city" text,
	"shipping_state" text,
	"shipping_zip" text,
	"dropoff_location_name" text,
	"dropoff_location_address" text,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"status" text DEFAULT 'submitted' NOT NULL,
	"final_price" numeric(10, 2),
	"materials_cost" numeric(10, 2),
	"shipping_cost" numeric(10, 2),
	"deadline" date,
	"contract_signed" boolean DEFAULT false NOT NULL,
	"contract_signed_at" timestamp with time zone,
	"contract_document_url" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_payment_method" CHECK ("commissions"."payment_method" IS NULL OR "commissions"."payment_method" IN ('zelle', 'venmo', 'cash')),
	CONSTRAINT "commissions_payment_status" CHECK ("commissions"."payment_status" IN ('unpaid', 'partial', 'paid')),
	CONSTRAINT "commissions_fulfillment_type" CHECK ("commissions"."fulfillment_type" IN ('shipping', 'pickup')),
	CONSTRAINT "commissions_status" CHECK ("commissions"."status" IN ('submitted', 'consulted', 'quoted', 'confirmed', 'in_progress', 'completed', 'shipped', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"selected_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"payment_method" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"fulfillment_type" text NOT NULL,
	"shipping_address" text,
	"dropoff_location_name" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_type" CHECK ("orders"."order_type" IN ('shop', 'build_a_bunny')),
	CONSTRAINT "orders_payment_method" CHECK ("orders"."payment_method" IS NULL OR "orders"."payment_method" IN ('zelle', 'venmo', 'cash', 'card')),
	CONSTRAINT "orders_payment_status" CHECK ("orders"."payment_status" IN ('unpaid', 'paid', 'refunded')),
	CONSTRAINT "orders_fulfillment_type" CHECK ("orders"."fulfillment_type" IN ('shipping', 'pickup')),
	CONSTRAINT "orders_cash_is_local_only" CHECK ("orders"."payment_method" IS DISTINCT FROM 'cash' OR "orders"."fulfillment_type" = 'pickup'),
	CONSTRAINT "orders_status" CHECK ("orders"."status" IN ('received', 'in_progress', 'completed', 'shipped', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "portfolio_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_item_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "portfolio_images_local_path" CHECK ("portfolio_images"."image_url" LIKE '/%' AND "portfolio_images"."image_url" NOT LIKE '%?%')
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"yarn_type" text,
	"yarn_color" text,
	"designer_credit" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_items_category" CHECK ("portfolio_items"."category" IN ('clothing', 'plushie', 'crochet', 'engineering', 'jewelry'))
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_images_local_path" CHECK ("product_images"."image_url" LIKE '/%' AND "product_images"."image_url" NOT LIKE '%?%')
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_type" text NOT NULL,
	"option_value" text NOT NULL,
	"price_modifier" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"description" text,
	"details" text[],
	"category" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"is_made_to_order" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"designer_credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_category" CHECK ("products"."category" IN ('shop_item', 'bunny_base', 'bunny_outfit', 'bunny_addon')),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock_quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_portfolio_item_id_portfolio_items_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_date" ON "bookings" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_commissions_status" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_commissions_deadline" ON "commissions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_portfolio_images_item_id" ON "portfolio_images" USING btree ("portfolio_item_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_id" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");