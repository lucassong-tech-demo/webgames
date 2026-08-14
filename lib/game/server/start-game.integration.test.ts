import assert from 'node:assert/strict';
import test from 'node:test';

import nextEnv from '@next/env';
import { Pool } from 'pg';

import { ENGINE_VERSION } from '../engine.ts';
import { createGameSession } from './start-game.ts';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

test('creates an unfinished game session in local PostgreSQL', async () => {
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
  let sessionId: string | undefined;

  try {
    const session = await createGameSession(database, 123456789);
    sessionId = session.sessionId;

    assert.equal(session.seed, 123456789);
    assert.equal(session.engineVersion, ENGINE_VERSION);
    assert.ok(Date.parse(session.expiresAt) > Date.now());

    const { rows } = await database.query(
      `
        SELECT finished_at, player_name, score, input_log
        FROM public.game_session
        WHERE id = $1
      `,
      [session.sessionId],
    );

    assert.deepEqual(rows, [
      {
        finished_at: null,
        player_name: null,
        score: null,
        input_log: null,
      },
    ]);
  } finally {
    if (sessionId) {
      await database.query('DELETE FROM public.game_session WHERE id = $1', [sessionId]);
    }
    await database.end();
  }
});
