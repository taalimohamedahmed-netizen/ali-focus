import { NextRequest, NextResponse } from 'next/server';
import { put, get } from '@vercel/blob';

// Single shared document — this is a personal single-user app.
const BLOB_PATH = 'ali-focus-data.json';

function isConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
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
  if (!isConfigured()) {
    return NextResponse.json({ configured: false }, { status: 501 });
  }
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await get(BLOB_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ configured: true, data: null });
    }
    const text = await new Response(result.stream).text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json({ configured: true, data });
  } catch (err) {
    // A missing blob throws — treat as "no data yet".
    const msg = String(err);
    if (msg.includes('not found') || msg.includes('404')) {
      return NextResponse.json({ configured: true, data: null });
    }
    return NextResponse.json(
      { error: 'read_failed', detail: msg },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isConfigured()) {
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
    await put(BLOB_PATH, JSON.stringify(body), {
      access: 'private',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'write_failed', detail: String(err) },
      { status: 500 }
    );
  }
}
