import * as dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config({ path: '.env.local' });
dotenv.config();

const target = process.argv[2] === 'main' ? process.env.DATABASE_URL : process.env.DATABASE_TEST_BRANCH;
if (!target) { console.error('Missing DB url for', process.argv[2]); process.exit(1); }
console.log(`Applying motilon migration to ${process.argv[2] === 'main' ? 'MAIN' : 'TEST'}`);

const pool = new Pool({ connectionString: target, ssl: { rejectUnauthorized: false } });

const sqls: [string, string][] = [
  ['sessions', `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" serial PRIMARY KEY NOT NULL,
    "token" text NOT NULL UNIQUE,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "created_at" timestamp DEFAULT now(),
    "expires_at" timestamp NOT NULL
  );`],
  ['email_reads', `CREATE TABLE IF NOT EXISTS "email_reads" (
    "id" serial PRIMARY KEY NOT NULL,
    "email_id" integer NOT NULL REFERENCES "email_logs"("id") ON DELETE cascade,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "read_at" timestamp DEFAULT now(),
    CONSTRAINT "email_reads_email_user_unique" UNIQUE("email_id","user_id")
  );`],
  ['repair_suggestions', `CREATE TABLE IF NOT EXISTS "repair_suggestions" (
    "id" serial PRIMARY KEY NOT NULL,
    "work_order_id" integer NOT NULL REFERENCES "work_orders"("id") ON DELETE cascade,
    "mechanic_id" integer REFERENCES "users"("id"),
    "mechanic_name" text NOT NULL,
    "description" text NOT NULL,
    "previous_labor_cost" integer NOT NULL DEFAULT 0,
    "previous_parts_cost" integer NOT NULL DEFAULT 0,
    "previous_total_estimate" integer NOT NULL DEFAULT 0,
    "additional_labor_cost" integer NOT NULL DEFAULT 0,
    "additional_parts_cost" integer NOT NULL DEFAULT 0,
    "new_labor_cost" integer NOT NULL DEFAULT 0,
    "new_parts_cost" integer NOT NULL DEFAULT 0,
    "new_total_estimate" integer NOT NULL DEFAULT 0,
    "previous_estimated_delivery" text NOT NULL,
    "new_estimated_delivery" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pendiente',
    "responded_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  );`],
  ['repair_suggestion_parts', `CREATE TABLE IF NOT EXISTS "repair_suggestion_parts" (
    "id" serial PRIMARY KEY NOT NULL,
    "suggestion_id" integer NOT NULL REFERENCES "repair_suggestions"("id") ON DELETE cascade,
    "part_id" integer NOT NULL REFERENCES "parts"("id"),
    "part_name" text NOT NULL,
    "part_code" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    "subtotal" integer NOT NULL
  );`],
  ['suppliers visible', `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "visible" boolean NOT NULL DEFAULT true;`],
  ['parts visible', `ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "visible" boolean NOT NULL DEFAULT true;`],
  ['work_orders delivered_at', `ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp;`],
  ['fill nulls', `UPDATE "suppliers" SET "contact_name"='Pendiente' WHERE "contact_name" IS NULL;
    UPDATE "suppliers" SET "phone"='Pendiente' WHERE "phone" IS NULL;
    UPDATE "suppliers" SET "email"='pendiente@localhost' WHERE "email" IS NULL;
    UPDATE "suppliers" SET "address"='Pendiente' WHERE "address" IS NULL;`],
  ['suppliers not null', `ALTER TABLE "suppliers" ALTER COLUMN "contact_name" SET NOT NULL;
    ALTER TABLE "suppliers" ALTER COLUMN "phone" SET NOT NULL;
    ALTER TABLE "suppliers" ALTER COLUMN "email" SET NOT NULL;
    ALTER TABLE "suppliers" ALTER COLUMN "address" SET NOT NULL;`],
  ['suppliers unique', `ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_name_unique" UNIQUE("name");`],
  ['parts fk set null', `ALTER TABLE "parts" DROP CONSTRAINT IF EXISTS "parts_supplier_id_suppliers_id_fk";
    ALTER TABLE "parts" ADD CONSTRAINT "parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE set null;`],
  ['indexes', `CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions"("token");
    CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
    CREATE INDEX IF NOT EXISTS "repair_suggestions_order_status_idx" ON "repair_suggestions"("work_order_id","status");
    CREATE INDEX IF NOT EXISTS "repair_suggestion_parts_suggestion_idx" ON "repair_suggestion_parts"("suggestion_id");
    CREATE INDEX IF NOT EXISTS "email_reads_email_idx" ON "email_reads"("email_id");
    CREATE INDEX IF NOT EXISTS "email_reads_user_idx" ON "email_reads"("user_id");`],
];

async function run() {
  for (const [name, s] of sqls) {
    try {
      await pool.query(s);
      console.log(` - ${name} OK`);
    } catch (e: any) {
      if (e.code === '42710' || e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        console.log(` - ${name} SKIP (exists)`);
      } else {
        console.error(` - ${name} FAIL:`, e.message);
        throw e;
      }
    }
  }
  await pool.end();
  console.log('Migration applied successfully.');
}
run().catch(e => { console.error(e); process.exit(1); });
