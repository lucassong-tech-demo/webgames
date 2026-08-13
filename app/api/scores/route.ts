import { Pool } from 'pg';
import { NextResponse } from 'next/server';

import { validateScoreSubmission } from './score-submission';

const MAX_REQUEST_BODY_BYTES = 1024;

let pool: Pool | undefined;

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

export async function GET() {
  try {
    const query = `
      SELECT player_name, MAX(score)::integer AS score
      FROM public.player_score
      GROUP BY player_name
      ORDER BY score DESC, player_name ASC
      LIMIT 5
    `;
    const { rows } = await getPool().query(query);

    return NextResponse.json(
      { scores: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error loading scores:', error);
    return NextResponse.json({ error: 'Failed to load scores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 },
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Unable to read request body' }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const validation = validateScoreSubmission(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  return NextResponse.json(
    { error: 'Score submissions are temporarily disabled' },
    { status: 503 },
  );
}
