-- Atomic buy trade: balance check + trade insert + portfolio upsert + agent stats
CREATE OR REPLACE FUNCTION execute_buy_trade(
  p_agent_id UUID,
  p_stock_id UUID,
  p_stock_symbol VARCHAR,
  p_quantity INTEGER,
  p_price DECIMAL(15,2)
) RETURNS JSON AS $$
DECLARE
  v_total_amount DECIMAL(15,2);
  v_balance DECIMAL(15,2);
  v_trade_id UUID;
  v_existing_qty INTEGER;
  v_existing_avg DECIMAL(15,2);
  v_new_qty INTEGER;
  v_new_avg DECIMAL(15,2);
  v_new_balance DECIMAL(15,2);
  v_trade_count INTEGER;
BEGIN
  v_total_amount := ROUND(p_quantity * p_price, 2);

  -- Lock agent row and check balance
  SELECT total_balance, trade_count INTO v_balance, v_trade_count
  FROM agents WHERE id = p_agent_id FOR UPDATE;

  IF v_balance < v_total_amount THEN
    RETURN json_build_object(
      'error', format('잔고가 부족합니다. (필요: $%s, 보유: $%s)', v_total_amount, v_balance)
    );
  END IF;

  -- Insert trade
  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'buy', p_quantity, p_price, v_total_amount)
  RETURNING id INTO v_trade_id;

  -- Upsert portfolio
  SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
  FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id FOR UPDATE;

  IF FOUND THEN
    v_new_qty := v_existing_qty + p_quantity;
    v_new_avg := ROUND((v_existing_avg * v_existing_qty + p_price * p_quantity) / v_new_qty, 2);
    UPDATE portfolios
    SET quantity = v_new_qty, avg_price = v_new_avg, total_cost = ROUND(v_new_qty * v_new_avg, 2), updated_at = NOW()
    WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  ELSE
    INSERT INTO portfolios (agent_id, stock_id, stock_symbol, quantity, avg_price, total_cost)
    VALUES (p_agent_id, p_stock_id, p_stock_symbol, p_quantity, p_price, v_total_amount);
  END IF;

  -- Update agent balance + stats
  v_new_balance := v_balance - v_total_amount;
  UPDATE agents
  SET total_balance = v_new_balance,
      trade_count = v_trade_count + 1,
      last_active = NOW()
  WHERE id = p_agent_id;

  RETURN json_build_object(
    'tradeId', v_trade_id,
    'totalAmount', v_total_amount,
    'newBalance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Atomic sell trade: position check + trade insert + portfolio update + agent stats
CREATE OR REPLACE FUNCTION execute_sell_trade(
  p_agent_id UUID,
  p_stock_id UUID,
  p_stock_symbol VARCHAR,
  p_quantity INTEGER,
  p_price DECIMAL(15,2)
) RETURNS JSON AS $$
DECLARE
  v_total_amount DECIMAL(15,2);
  v_balance DECIMAL(15,2);
  v_trade_id UUID;
  v_existing_qty INTEGER;
  v_existing_avg DECIMAL(15,2);
  v_new_qty INTEGER;
  v_realized_profit DECIMAL(15,2);
  v_profit_rate DECIMAL(10,4);
  v_new_balance DECIMAL(15,2);
  v_trade_count INTEGER;
  v_win_count INTEGER;
  v_total_pnl DECIMAL(15,2);
  v_new_pnl DECIMAL(15,2);
  v_new_profit_rate DECIMAL(10,4);
  v_is_win BOOLEAN;
BEGIN
  v_total_amount := ROUND(p_quantity * p_price, 2);

  -- Lock agent row
  SELECT total_balance, trade_count, win_count, total_profit_loss
  INTO v_balance, v_trade_count, v_win_count, v_total_pnl
  FROM agents WHERE id = p_agent_id FOR UPDATE;

  -- Lock portfolio row and check position
  SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
  FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id FOR UPDATE;

  IF NOT FOUND OR v_existing_qty < p_quantity THEN
    RETURN json_build_object(
      'error', format('보유 수량이 부족합니다. (보유: %s주, 매도 요청: %s주)', COALESCE(v_existing_qty, 0), p_quantity)
    );
  END IF;

  -- Calculate profit
  v_realized_profit := ROUND((p_price - v_existing_avg) * p_quantity, 2);
  v_profit_rate := ROUND(((p_price - v_existing_avg) / v_existing_avg) * 100, 4);
  v_is_win := v_realized_profit > 0;

  -- Insert trade
  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount, realized_profit, profit_rate)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'sell', p_quantity, p_price, v_total_amount, v_realized_profit, v_profit_rate)
  RETURNING id INTO v_trade_id;

  -- Update portfolio
  v_new_qty := v_existing_qty - p_quantity;
  IF v_new_qty = 0 THEN
    DELETE FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  ELSE
    UPDATE portfolios
    SET quantity = v_new_qty, total_cost = ROUND(v_new_qty * v_existing_avg, 2), updated_at = NOW()
    WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  END IF;

  -- Update agent balance + stats
  v_new_balance := v_balance + v_total_amount;
  v_new_pnl := v_total_pnl + v_realized_profit;
  v_new_profit_rate := ROUND((v_new_pnl / 100000) * 100, 4); -- Based on initial $100K

  UPDATE agents
  SET total_balance = v_new_balance,
      total_profit_loss = v_new_pnl,
      profit_rate = v_new_profit_rate,
      trade_count = v_trade_count + 1,
      win_count = CASE WHEN v_is_win THEN v_win_count + 1 ELSE v_win_count END,
      last_active = NOW()
  WHERE id = p_agent_id;

  RETURN json_build_object(
    'tradeId', v_trade_id,
    'totalAmount', v_total_amount,
    'realizedProfit', v_realized_profit,
    'profitRate', v_profit_rate,
    'newBalance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;
