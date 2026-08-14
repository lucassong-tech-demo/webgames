BEGIN;

LOCK TABLE public.game_session IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.player_score IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.game_session
  DROP CONSTRAINT game_session_completion_check,
  DROP CONSTRAINT game_session_expiry_check,
  DROP CONSTRAINT game_session_score_check,
  DROP CONSTRAINT game_session_input_log_check,
  DROP CONSTRAINT game_session_final_tick_check;

DROP INDEX public.game_session_open_expires_at_idx;

ALTER TABLE public.game_session
  DROP COLUMN expires_at,
  DROP COLUMN finished_at,
  DROP COLUMN player_name,
  DROP COLUMN score,
  DROP COLUMN input_log,
  DROP COLUMN final_tick;

DELETE FROM public.player_score
WHERE score IS NULL;

WITH duplicate_scores AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY player_name
      ORDER BY score DESC, game_session_id ASC NULLS LAST, ctid
    ) AS player_rank
  FROM public.player_score
)
DELETE FROM public.player_score AS score
USING duplicate_scores AS duplicate
WHERE score.ctid = duplicate.ctid
  AND duplicate.player_rank > 1;

WITH leaderboard AS (
  SELECT
    ctid,
    row_number() OVER (
      ORDER BY score DESC, player_name ASC
    ) AS leaderboard_rank
  FROM public.player_score
)
DELETE FROM public.player_score AS score
USING leaderboard
WHERE score.ctid = leaderboard.ctid
  AND leaderboard.leaderboard_rank > 5;

ALTER TABLE public.player_score
  ALTER COLUMN score SET NOT NULL,
  ADD CONSTRAINT player_score_player_name_key UNIQUE (player_name);

COMMIT;
