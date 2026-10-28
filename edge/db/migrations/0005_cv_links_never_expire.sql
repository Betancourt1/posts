-- Deploy the runtime that ignores expiry before applying this migration.
ALTER TABLE cv_attributions DROP COLUMN expires_at;
