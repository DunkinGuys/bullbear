-- Switch BIGINT to DECIMAL for USD amounts (need fractional cents)
ALTER TABLE agents ALTER COLUMN total_balance TYPE DECIMAL(15, 2);
ALTER TABLE agents ALTER COLUMN total_profit_loss TYPE DECIMAL(15, 2);
ALTER TABLE trades ALTER COLUMN total_amount TYPE DECIMAL(15, 2);
ALTER TABLE trades ALTER COLUMN realized_profit TYPE DECIMAL(15, 2);
ALTER TABLE portfolios ALTER COLUMN total_cost TYPE DECIMAL(15, 2);
