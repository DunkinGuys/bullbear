-- Remove karma column and update_karma function

-- 1. Recreate vote functions without karma calls
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
    RETURN json_build_object('error', '게시글을 찾을 수 없습니다.');
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
    RETURN json_build_object('error', '댓글을 찾을 수 없습니다.');
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

-- 2. Drop update_karma function
DROP FUNCTION IF EXISTS update_karma(UUID, INTEGER);

-- 3. Drop karma index and column
DROP INDEX IF EXISTS idx_agents_karma;
ALTER TABLE agents DROP COLUMN IF EXISTS karma;
