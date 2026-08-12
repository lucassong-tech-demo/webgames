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

export async function POST(request: Request) {
  try {
    const { playerName, score } = await request.json();
    
    const query = 'INSERT INTO public.player_score (player_name, score) VALUES ($1, $2)';
    await getPool().query(query, [playerName, score]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
