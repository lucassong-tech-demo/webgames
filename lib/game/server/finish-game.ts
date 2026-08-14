import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import type {
  FinishGameRequest,
  FinishGameResponse,
} from '../contracts/finish-game.ts';
import { ENGINE_VERSION } from '../engine.ts';
import { calculateFinalScore, replayGame } from './replay-game.ts';

let pool: Pool | undefined;

type SessionRow = QueryResultRow & {
  id: string;
  engine_version: number;
  seed: number;
};

type ScoreRow = QueryResultRow & {
  player_name: string;
  score: number;
  game_session_id: string | null;
};

type FinishGameDatabase = Pick<Pool, 'connect' | 'query'>;

export type FinishGameErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'UNSUPPORTED_ENGINE_VERSION'
  | 'SESSION_ALREADY_FINISHED';

export class FinishGameError extends Error {
  readonly code: FinishGameErrorCode;

  constructor(code: FinishGameErrorCode, message: string) {
    super(message);
    this.name = 'FinishGameError';
    this.code = code;
  }
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

async function loadSession(
  database: Pick<Pool, 'query'> | Pick<PoolClient, 'query'>,
  sessionId: string,
  forUpdate = false,
) {
  const { rows } = await database.query<SessionRow>(
    `
      SELECT id, engine_version, seed
      FROM public.game_session
      WHERE id = $1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [sessionId],
  );

  return rows[0];
}

function assertSupportedSession(session: SessionRow | undefined) {
  if (!session) {
    throw new FinishGameError('SESSION_NOT_FOUND', 'Game session was not found');
  }

  if (session.engine_version !== ENGINE_VERSION) {
    throw new FinishGameError(
      'UNSUPPORTED_ENGINE_VERSION',
      'Game session uses an unsupported engine version',
    );
  }

  return session;
}

async function deleteSession(client: Pick<PoolClient, 'query'>, sessionId: string | null) {
  if (sessionId) {
    await client.query('DELETE FROM public.game_session WHERE id = $1', [sessionId]);
  }
}

export async function recordFinishedGame(
  client: Pick<PoolClient, 'query'>,
  input: Readonly<{
    session: SessionRow;
    playerName: string;
    finalScore: number;
  }>,
) {
  await client.query('LOCK TABLE public.player_score IN SHARE ROW EXCLUSIVE MODE');

  const lockedSession = assertSupportedSession(
    await loadSession(client, input.session.id, true),
  );

  if (
    lockedSession.seed !== input.session.seed ||
    lockedSession.engine_version !== input.session.engine_version
  ) {
    throw new Error('Game session changed during finalization');
  }

  const duplicate = await client.query<ScoreRow>(
    `
      SELECT player_name, score, game_session_id
      FROM public.player_score
      WHERE game_session_id = $1
    `,
    [input.session.id],
  );

  if (duplicate.rows[0]) {
    throw new FinishGameError(
      'SESSION_ALREADY_FINISHED',
      'Game session has already been finished',
    );
  }

  const existingPlayer = await client.query<ScoreRow>(
    `
      SELECT player_name, score, game_session_id
      FROM public.player_score
      WHERE player_name = $1
    `,
    [input.playerName],
  );
  const previousScore = existingPlayer.rows[0];

  if (previousScore) {
    if (input.finalScore <= previousScore.score) {
      await deleteSession(client, input.session.id);
      return false;
    }

    await client.query(
      `
        UPDATE public.player_score
        SET score = $1, game_session_id = $2
        WHERE player_name = $3
      `,
      [input.finalScore, input.session.id, input.playerName],
    );
    await deleteSession(client, previousScore.game_session_id);
    return true;
  }

  const leaderboard = await client.query<ScoreRow>(
    `
      SELECT player_name, score, game_session_id
      FROM public.player_score
      ORDER BY score DESC, player_name ASC
      LIMIT 5
    `,
  );
  const lowestScore = leaderboard.rows.at(-1);
  const qualifies = leaderboard.rows.length < 5 || input.finalScore > lowestScore!.score;

  if (!qualifies) {
    await deleteSession(client, input.session.id);
    return false;
  }

  await client.query(
    `
      INSERT INTO public.player_score (player_name, score, game_session_id)
      VALUES ($1, $2, $3)
    `,
    [input.playerName, input.finalScore, input.session.id],
  );

  if (leaderboard.rows.length === 5 && lowestScore) {
    await client.query(
      'DELETE FROM public.player_score WHERE player_name = $1',
      [lowestScore.player_name],
    );
    await deleteSession(client, lowestScore.game_session_id);
  }

  return true;
}

export async function finishGame(
  input: FinishGameRequest,
  database: FinishGameDatabase = getPool(),
): Promise<FinishGameResponse> {
  const session = assertSupportedSession(await loadSession(database, input.sessionId));
  const replayed = replayGame(session.seed, input);
  const finalScore = calculateFinalScore(replayed);
  const client = await database.connect();

  try {
    await client.query('BEGIN');
    const qualifiedForLeaderboard = await recordFinishedGame(client, {
      session,
      playerName: input.playerName,
      finalScore,
    });
    await client.query('COMMIT');

    return {
      finalScore,
      qualifiedForLeaderboard,
      result: replayed.result,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
