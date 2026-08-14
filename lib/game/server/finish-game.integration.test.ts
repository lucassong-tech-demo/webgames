import assert from 'node:assert/strict';
import test from 'node:test';

import nextEnv from '@next/env';
import { Pool, type PoolClient } from 'pg';

import { ENGINE_VERSION } from '../engine.ts';
import {
  FinishGameError,
  recordFinishedGame,
} from './finish-game.ts';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

async function createSession(client: PoolClient, seed: number) {
  const { rows } = await client.query(
    `
      INSERT INTO public.game_session (engine_version, seed)
      VALUES ($1, $2)
      RETURNING id, engine_version, seed
    `,
    [ENGINE_VERSION, seed],
  );

  return rows[0] as { id: string; engine_version: number; seed: number };
}

test('records only the Top 5 atomically in local PostgreSQL', async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, 'DATABASE_URL must be configured');

  const databaseUrl = new URL(connectionString);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname),
    'Integration test refuses to connect to a non-local PostgreSQL server',
  );
  assert.equal(
    databaseUrl.pathname,
    '/snakegame_dev',
    'Integration test only runs against snakegame_dev',
  );

  const database = new Pool({ connectionString });
  const client = await database.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.player_score');
    await client.query(
      `
        INSERT INTO public.player_score (player_name, score)
        VALUES
          ('Player500', 500),
          ('Player400', 400),
          ('Player300', 300),
          ('Player200', 200),
          ('Player100', 100)
      `,
    );

    const qualifyingSession = await createSession(client, 101);
    assert.equal(
      await recordFinishedGame(client, {
        session: qualifyingSession,
        playerName: 'NewPlayer',
        finalScore: 250,
      }),
      true,
    );

    const leaderboard = await client.query(
      `
        SELECT player_name, score
        FROM public.player_score
        ORDER BY score DESC, player_name ASC
      `,
    );
    assert.deepEqual(leaderboard.rows, [
      { player_name: 'Player500', score: 500 },
      { player_name: 'Player400', score: 400 },
      { player_name: 'Player300', score: 300 },
      { player_name: 'NewPlayer', score: 250 },
      { player_name: 'Player200', score: 200 },
    ]);

    await assert.rejects(
      recordFinishedGame(client, {
        session: qualifyingSession,
        playerName: 'AnotherPlayer',
        finalScore: 600,
      }),
      (error: unknown) =>
        error instanceof FinishGameError && error.code === 'SESSION_ALREADY_FINISHED',
    );

    const improvedSession = await createSession(client, 102);
    assert.equal(
      await recordFinishedGame(client, {
        session: improvedSession,
        playerName: 'Player500',
        finalScore: 600,
      }),
      true,
    );

    const nonQualifyingSession = await createSession(client, 103);
    assert.equal(
      await recordFinishedGame(client, {
        session: nonQualifyingSession,
        playerName: 'LowPlayer',
        finalScore: 200,
      }),
      false,
    );
    assert.equal(
      (await client.query('SELECT id FROM public.game_session WHERE id = $1', [
        nonQualifyingSession.id,
      ])).rowCount,
      0,
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await database.end();
  }
});
