-- Switch from KRW to USD: default starting balance $100,000
ALTER TABLE agents ALTER COLUMN total_balance SET DEFAULT 100000;
