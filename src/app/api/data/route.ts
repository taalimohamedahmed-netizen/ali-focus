import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Single shared document key — this is a personal single-user app.
const DATA_KEY = 'ali-focus-data';

// Read Upstash/Vercel KV credentials from whichever env var names are present.
function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.SYNC_PASSWORD;
  // If no password is configured, allow access (e.g. local dev).
  if (!expected) return true;
  const provided =
    req.headers.get('x-sync-password') ||
    req.nextUrl.searchParams.get('password') ||
    '';
  return provided === expected;
}

export async function GET(req: NextRequest) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ configured: false }, { status: 501 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const data = await redis.get(DATA_KEY);
    return NextResponse.json({ configured: true, data: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: 'read_failed', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ configured: false }, { status: 501 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || typeof body.days !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    await redis.set(DATA_KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'write_failed', detail: String(err) },
      { status: 500 }
    );
  }
}
