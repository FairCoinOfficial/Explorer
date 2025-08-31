import { NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.redirect(new URL('/', req.url));

  if (/^\d+$/.test(q)) {
    return NextResponse.redirect(new URL(`/block/${q}`, req.url));
  }
  if (/^[0-9a-fA-F]{64}$/.test(q)) {
    // Could be block hash or txid; default to block view, offer a link to tx on that page.
    return NextResponse.redirect(new URL(`/block/${q}`, req.url));
  }
  // Fallback assume txid
  return NextResponse.redirect(new URL(`/tx/${q}`, req.url));
}
