CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"to_email" text NOT NULL,
	"to_name" text NOT NULL,
	"subject" text NOT NULL,
	"trigger_event" text NOT NULL,
	"body_html" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"related_type" text,
	"related_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "email_reads_email_user_unique" UNIQUE("email_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "motorcycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"plate" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"color" text,
	"mileage" integer DEFAULT 0,
	"client_id" integer NOT NULL,
	"client_name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "motorcycles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
CREATE TABLE "part_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"client_name" text NOT NULL,
	"work_order_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"status" text DEFAULT 'en camino' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'General',
	"stock" integer DEFAULT 0 NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"sale_price" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 3,
	"supplier_id" integer,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "parts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "postponement_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"mechanic_id" integer,
	"mechanic_name" text NOT NULL,
	"previous_date" text NOT NULL,
	"new_date" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "repair_suggestion_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggestion_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"part_name" text NOT NULL,
	"part_code" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"mechanic_id" integer,
	"mechanic_name" text NOT NULL,
	"description" text NOT NULL,
	"previous_labor_cost" integer DEFAULT 0 NOT NULL,
	"previous_parts_cost" integer DEFAULT 0 NOT NULL,
	"previous_total_estimate" integer DEFAULT 0 NOT NULL,
	"additional_labor_cost" integer DEFAULT 0 NOT NULL,
	"additional_parts_cost" integer DEFAULT 0 NOT NULL,
	"new_labor_cost" integer DEFAULT 0 NOT NULL,
	"new_parts_cost" integer DEFAULT 0 NOT NULL,
	"new_total_estimate" integer DEFAULT 0 NOT NULL,
	"previous_estimated_delivery" text NOT NULL,
	"new_estimated_delivery" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reason" text NOT NULL,
	"user_id" integer,
	"user_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"address" text NOT NULL,
	"notes" text,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"motorcycle_id" integer NOT NULL,
	"mechanic_id" integer,
	"mechanic_name" text,
	"status" text DEFAULT 'en curso' NOT NULL,
	"entry_date" text NOT NULL,
	"estimated_delivery" text NOT NULL,
	"initial_diagnosis" text NOT NULL,
	"suggested_repairs" text,
	"labor_cost" integer DEFAULT 0,
	"parts_cost" integer DEFAULT 0,
	"total_estimate" integer DEFAULT 0,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "email_reads" ADD CONSTRAINT "email_reads_email_id_email_logs_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reads" ADD CONSTRAINT "email_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motorcycles" ADD CONSTRAINT "motorcycles_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postponement_logs" ADD CONSTRAINT "postponement_logs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postponement_logs" ADD CONSTRAINT "postponement_logs_mechanic_id_users_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_suggestion_parts" ADD CONSTRAINT "repair_suggestion_parts_suggestion_id_repair_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."repair_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_suggestion_parts" ADD CONSTRAINT "repair_suggestion_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_suggestions" ADD CONSTRAINT "repair_suggestions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_suggestions" ADD CONSTRAINT "repair_suggestions_mechanic_id_users_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_motorcycle_id_motorcycles_id_fk" FOREIGN KEY ("motorcycle_id") REFERENCES "public"."motorcycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_mechanic_id_users_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;