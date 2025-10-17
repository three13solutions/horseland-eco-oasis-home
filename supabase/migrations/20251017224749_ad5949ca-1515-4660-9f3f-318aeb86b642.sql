-- Add benefits text field to spa_services table
ALTER TABLE spa_services 
ADD COLUMN benefits TEXT;

COMMENT ON COLUMN spa_services.benefits IS 'Detailed description of benefits (different from tags)';