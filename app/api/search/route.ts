import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const network = req.nextUrl.searchParams.get('network') || 'mainnet';
  
  if (!q) return NextResponse.redirect(new URL('/', req.url));

  // Add network parameter to redirects
  const addNetworkParam = (url: string) => {
    const redirectUrl = new URL(url, req.url);
    redirectUrl.searchParams.set('network', network);
    return redirectUrl;
  };

  if (/^\d+$/.test(q)) {
    return NextResponse.redirect(addNetworkParam(`/block/${q}`));
  }
  if (/^[0-9a-fA-F]{64}$/.test(q)) {
    // Could be block hash or txid; default to block view, offer a link to tx on that page.
    return NextResponse.redirect(addNetworkParam(`/block/${q}`));
  }
  
  // Check if it looks like a FairCoin address
  if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24,61}$/.test(q)) {
    // Redirect to address page (we'll create this)
    return NextResponse.redirect(addNetworkParam(`/address/${q}`));
  }
  
  // Fallback assume txid
  return NextResponse.redirect(addNetworkParam(`/tx/${q}`));
}
