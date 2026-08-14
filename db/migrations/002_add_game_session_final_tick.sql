BEGIN;

LOCK TABLE public.game_session IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.game_session
    WHERE finished_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot add final_tick because completed game sessions already exist';
  END IF;
END
$$;

ALTER TABLE public.game_session
  ADD COLUMN final_tick integer;

ALTER TABLE public.game_session
  ADD CONSTRAINT game_session_final_tick_check
    CHECK (final_tick IS NULL OR final_tick BETWEEN 1 AND 72000);

ALTER TABLE public.game_session
  DROP CONSTRAINT game_session_completion_check;

ALTER TABLE public.game_session
  ADD CONSTRAINT game_session_completion_check
    CHECK (
      (
        finished_at IS NULL
        AND player_name IS NULL
        AND score IS NULL
        AND input_log IS NULL
        AND final_tick IS NULL
      )
      OR
      (
        finished_at IS NOT NULL
        AND player_name IS NOT NULL
        AND score IS NOT NULL
        AND input_log IS NOT NULL
        AND final_tick IS NOT NULL
      )
    );

COMMENT ON COLUMN public.game_session.final_tick IS
  'Terminal engine tick used to verify replay and exact idempotent retries';

COMMIT;
