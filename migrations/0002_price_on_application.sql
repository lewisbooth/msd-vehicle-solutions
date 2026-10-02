-- POA is a display setting, independent from the saved amount. Existing -1
-- sentinels do not contain a recoverable price; preserve them as POA with no amount.
ALTER TABLE vehicles ADD COLUMN poa_hire INTEGER NOT NULL DEFAULT 0 CHECK (poa_hire IN (0, 1));
ALTER TABLE vehicles ADD COLUMN poa_sales INTEGER NOT NULL DEFAULT 0 CHECK (poa_sales IN (0, 1));
ALTER TABLE vehicles ADD COLUMN poa_lease INTEGER NOT NULL DEFAULT 0 CHECK (poa_lease IN (0, 1));

UPDATE vehicles SET poa_hire = 1, pricing_hire = NULL WHERE pricing_hire = -1;
UPDATE vehicles SET poa_sales = 1, pricing_sales = NULL WHERE pricing_sales = -1;
UPDATE vehicles SET poa_lease = 1, pricing_lease = NULL WHERE pricing_lease = -1;
