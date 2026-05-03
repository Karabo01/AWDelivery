-- Drivers now authenticate by email; email must be unique when set.
-- Postgres treats NULLs as distinct, so existing drivers without an email are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_email_key" ON "drivers" ("email");
