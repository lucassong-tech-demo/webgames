import { randomInt } from 'node:crypto';

import { Pool, type QueryResultRow } from 'pg';

import type { StartGameResponse } from '../contracts/start-game';
import { ENGINE_VERSION } from '../engine.ts';

const MAX_DATABASE_SEED = 0x7fffffff;

let pool: Pool | undefined;

type GameSessionRow = QueryResultRow & {
  id: string;
  seed: number;
  engine_version: number;
  expires_at: Date;
};

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

export function createSessionSeed() {
  return randomInt(0, MAX_DATABASE_SEED + 1);
}

export async function createGameSession(
  database: Pick<Pool, 'query'> = getPool(),
  seed = createSessionSeed(),
): Promise<StartGameResponse> {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_DATABASE_SEED) {
    throw new RangeError('Session seed is outside the PostgreSQL integer range');
  }

  const { rows } = await database.query<GameSessionRow>(
    `
      INSERT INTO public.game_session (engine_version, seed)
      VALUES ($1, $2)
      RETURNING id, seed, engine_version, expires_at
    `,
    [ENGINE_VERSION, seed],
  );
  const session = rows[0];

  if (!session) {
    throw new Error('Database did not return the created game session');
  }

  return {
    sessionId: session.id,
    seed: session.seed,
    engineVersion: session.engine_version,
    expiresAt: session.expires_at.toISOString(),
  };
}
