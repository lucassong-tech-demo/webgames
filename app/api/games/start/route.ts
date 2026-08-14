import { NextResponse } from 'next/server';

import { createGameSession } from '@/lib/game/server/start-game';

import { validateStartRequest } from './start-request';

export async function POST(request: Request) {
  const validation = await validateStartRequest(request);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const session = await createGameSession();

    return NextResponse.json(session, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
