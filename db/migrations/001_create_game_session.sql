BEGIN;

CREATE TABLE public.game_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_version smallint NOT NULL DEFAULT 1,
  seed integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  finished_at timestamptz,
  player_name varchar(24),
  score integer,
  input_log jsonb,

  CONSTRAINT game_session_engine_version_check
    CHECK (engine_version > 0),
  CONSTRAINT game_session_expiry_check
    CHECK (expires_at > started_at),
  CONSTRAINT game_session_score_check
    CHECK (score IS NULL OR (score BETWEEN 0 AND 3990 AND score % 10 = 0)),
  CONSTRAINT game_session_input_log_check
    CHECK (input_log IS NULL OR jsonb_typeof(input_log) = 'array'),
  CONSTRAINT game_session_completion_check
    CHECK (
      (
        finished_at IS NULL
        AND player_name IS NULL
        AND score IS NULL
        AND input_log IS NULL
      )
      OR
      (
        finished_at IS NOT NULL
        AND player_name IS NOT NULL
        AND score IS NOT NULL
        AND input_log IS NOT NULL
      )
    )
);

CREATE INDEX game_session_open_expires_at_idx
  ON public.game_session (expires_at)
  WHERE finished_at IS NULL;

ALTER TABLE public.player_score
  ADD COLUMN game_session_id uuid;

ALTER TABLE public.player_score
  ADD CONSTRAINT player_score_game_session_id_fkey
    FOREIGN KEY (game_session_id)
    REFERENCES public.game_session (id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT player_score_game_session_id_key
    UNIQUE (game_session_id);

COMMIT;
