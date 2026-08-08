-- `updated_at` columns default to now() on INSERT, which means they never
-- change afterwards. A trigger is the only way to make them honest for writes
-- that do not go through Drizzle: psql, a seed script, a future admin tool.
--
-- pgcrypto is not needed on Postgres 13+, where gen_random_uuid() is built in.
-- Kept as IF NOT EXISTS so an older instance also works.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER commissions_set_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
