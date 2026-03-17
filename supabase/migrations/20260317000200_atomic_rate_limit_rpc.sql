CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - make_interval(secs => p_window_seconds);
  v_oldest TIMESTAMPTZ;
BEGIN
  DELETE FROM public.rate_limits
  WHERE key = p_key
    AND created_at < v_window_start;

  SELECT COUNT(*)::INTEGER, MIN(created_at)
  INTO current_count, v_oldest
  FROM public.rate_limits
  WHERE key = p_key;

  IF current_count < p_max_requests THEN
    INSERT INTO public.rate_limits (key, created_at)
    VALUES (p_key, v_now);

    current_count := current_count + 1;
    allowed := TRUE;
    reset_at := v_now + make_interval(secs => p_window_seconds);
    RETURN NEXT;
    RETURN;
  END IF;

  allowed := FALSE;
  reset_at := COALESCE(
    v_oldest + make_interval(secs => p_window_seconds),
    v_now + make_interval(secs => p_window_seconds)
  );
  RETURN NEXT;
END;
$$;
