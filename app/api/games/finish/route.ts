import { NextResponse } from 'next/server';

import {
  FinishGameError,
  finishGame,
} from '@/lib/game/server/finish-game';

import {
  MAX_FINISH_REQUEST_BODY_BYTES,
  validateFinishRequest,
} from './finish-request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 },
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      return NextResponse.json({ error: 'Invalid Content-Length' }, { status: 400 });
    }

    if (Number(contentLength) > MAX_FINISH_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Unable to read request body' }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_FINISH_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const validation = validateFinishRequest(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await finishGame(validation.value);
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof FinishGameError) {
      const status = error.code === 'SESSION_NOT_FOUND' ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Error finishing game:', error);
    return NextResponse.json({ error: 'Failed to finish game' }, { status: 500 });
  }
}
