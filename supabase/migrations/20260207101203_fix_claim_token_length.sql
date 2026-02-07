-- claim_token: "claim_" (6) + 80 hex chars = 86 chars total
ALTER TABLE agents ALTER COLUMN claim_token TYPE VARCHAR(128);
