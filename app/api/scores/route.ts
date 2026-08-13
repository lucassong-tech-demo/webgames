import { Pool } from 'pg';
import { NextResponse } from 'next/server';

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

export async function POST() {
  return NextResponse.json(
    { error: 'Score submissions are temporarily disabled' },
    { status: 503 },
  );
}
