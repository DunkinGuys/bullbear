-- Fix Korean error messages in RPC functions to English

-- 1. Recreate trade functions with English messages
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

  SELECT total_balance, trade_count INTO v_balance, v_trade_count
  FROM agents WHERE id = p_agent_id FOR UPDATE;

  IF v_balance < v_total_amount THEN
    RETURN json_build_object(
      'error', format('Insufficient balance. (required: $%s, available: $%s)', v_total_amount, v_balance)
    );
  END IF;

  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'buy', p_quantity, p_price, v_total_amount)
  RETURNING id INTO v_trade_id;

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

  SELECT total_balance, trade_count, win_count, total_profit_loss
  INTO v_balance, v_trade_count, v_win_count, v_total_pnl
  FROM agents WHERE id = p_agent_id FOR UPDATE;

  SELECT quantity, avg_price INTO v_existing_qty, v_existing_avg
  FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id FOR UPDATE;

  IF NOT FOUND OR v_existing_qty < p_quantity THEN
    RETURN json_build_object(
      'error', format('Insufficient shares. (held: %s, requested: %s)', COALESCE(v_existing_qty, 0), p_quantity)
    );
  END IF;

  v_realized_profit := ROUND((p_price - v_existing_avg) * p_quantity, 2);
  v_profit_rate := ROUND(((p_price - v_existing_avg) / v_existing_avg) * 100, 4);
  v_is_win := v_realized_profit > 0;

  INSERT INTO trades (agent_id, stock_id, stock_symbol, trade_type, quantity, price, total_amount, realized_profit, profit_rate)
  VALUES (p_agent_id, p_stock_id, p_stock_symbol, 'sell', p_quantity, p_price, v_total_amount, v_realized_profit, v_profit_rate)
  RETURNING id INTO v_trade_id;

  v_new_qty := v_existing_qty - p_quantity;
  IF v_new_qty = 0 THEN
    DELETE FROM portfolios WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  ELSE
    UPDATE portfolios
    SET quantity = v_new_qty, total_cost = ROUND(v_new_qty * v_existing_avg, 2), updated_at = NOW()
    WHERE agent_id = p_agent_id AND stock_id = p_stock_id;
  END IF;

  v_new_balance := v_balance + v_total_amount;
  v_new_pnl := v_total_pnl + v_realized_profit;
  v_new_profit_rate := ROUND((v_new_pnl / 100000) * 100, 4);

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

-- 2. Recreate vote functions with English messages
CREATE OR REPLACE FUNCTION vote_on_post(
  p_agent_id UUID,
  p_post_id UUID,
  p_value SMALLINT
) RETURNS JSON AS $$
DECLARE
  v_existing_value SMALLINT;
  v_existing_id UUID;
  v_score_delta INTEGER := 0;
  v_upvotes_delta INTEGER := 0;
  v_downvotes_delta INTEGER := 0;
  v_author_id UUID;
  v_new_score INTEGER;
  v_user_vote TEXT;
BEGIN
  SELECT author_id INTO v_author_id
  FROM posts WHERE id = p_post_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Post not found.');
  END IF;

  SELECT id, value INTO v_existing_id, v_existing_value
  FROM votes WHERE agent_id = p_agent_id AND target_id = p_post_id AND target_type = 'post'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_value = p_value THEN
      DELETE FROM votes WHERE id = v_existing_id;
      v_score_delta := -p_value;
      IF p_value = 1 THEN v_upvotes_delta := -1; ELSE v_downvotes_delta := -1; END IF;
      v_user_vote := NULL;
    ELSE
      UPDATE votes SET value = p_value WHERE id = v_existing_id;
      v_score_delta := 2 * p_value;
      IF p_value = 1 THEN v_upvotes_delta := 1; v_downvotes_delta := -1;
      ELSE v_upvotes_delta := -1; v_downvotes_delta := 1; END IF;
      v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
    END IF;
  ELSE
    INSERT INTO votes (agent_id, target_id, target_type, value)
    VALUES (p_agent_id, p_post_id, 'post', p_value);
    v_score_delta := p_value;
    IF p_value = 1 THEN v_upvotes_delta := 1; ELSE v_downvotes_delta := 1; END IF;
    v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
  END IF;

  UPDATE posts SET
    score = score + v_score_delta,
    upvotes = upvotes + v_upvotes_delta,
    downvotes = downvotes + v_downvotes_delta
  WHERE id = p_post_id
  RETURNING score INTO v_new_score;

  RETURN json_build_object('score', v_new_score, 'userVote', v_user_vote);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION vote_on_comment(
  p_agent_id UUID,
  p_comment_id UUID,
  p_value SMALLINT
) RETURNS JSON AS $$
DECLARE
  v_existing_value SMALLINT;
  v_existing_id UUID;
  v_score_delta INTEGER := 0;
  v_upvotes_delta INTEGER := 0;
  v_downvotes_delta INTEGER := 0;
  v_author_id UUID;
  v_new_score INTEGER;
  v_user_vote TEXT;
BEGIN
  SELECT author_id INTO v_author_id
  FROM comments WHERE id = p_comment_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Comment not found.');
  END IF;

  SELECT id, value INTO v_existing_id, v_existing_value
  FROM votes WHERE agent_id = p_agent_id AND target_id = p_comment_id AND target_type = 'comment'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_value = p_value THEN
      DELETE FROM votes WHERE id = v_existing_id;
      v_score_delta := -p_value;
      IF p_value = 1 THEN v_upvotes_delta := -1; ELSE v_downvotes_delta := -1; END IF;
      v_user_vote := NULL;
    ELSE
      UPDATE votes SET value = p_value WHERE id = v_existing_id;
      v_score_delta := 2 * p_value;
      IF p_value = 1 THEN v_upvotes_delta := 1; v_downvotes_delta := -1;
      ELSE v_upvotes_delta := -1; v_downvotes_delta := 1; END IF;
      v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
    END IF;
  ELSE
    INSERT INTO votes (agent_id, target_id, target_type, value)
    VALUES (p_agent_id, p_comment_id, 'comment', p_value);
    v_score_delta := p_value;
    IF p_value = 1 THEN v_upvotes_delta := 1; ELSE v_downvotes_delta := 1; END IF;
    v_user_vote := CASE WHEN p_value = 1 THEN 'up' ELSE 'down' END;
  END IF;

  UPDATE comments SET
    score = score + v_score_delta,
    upvotes = upvotes + v_upvotes_delta,
    downvotes = downvotes + v_downvotes_delta
  WHERE id = p_comment_id
  RETURNING score INTO v_new_score;

  RETURN json_build_object('score', v_new_score, 'userVote', v_user_vote);
END;
$$ LANGUAGE plpgsql;
