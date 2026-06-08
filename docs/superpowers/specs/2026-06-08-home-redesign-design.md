# FairCoin Explorer — Home Redesign & Production Hardening

Date: 2026-06-08
Status: Approved, in implementation

## Goal
Turn the cramped home page (5-row blocks/tx, plain stat row, ugly outline-button
chips, "latest transactions" that only lists the newest block's txids) into a
polished **Dashboard + bento** app that matches the sidebar's rounded, flat,
brand-colored visual language. Add info-rich modules, port relevant FairCoin
facts, and harden the API for production.

## Layout (top → bottom)
1. **Compact header** — title + `NetworkStatus` + `● Live · {phase} · #{height}` pill + search. Removes the outline-button chip row.
2. **Live stat strip** — from `/api/stats` (home doesn't use it today): Height · Supply · Difficulty · Connections · Mempool · Masternodes · Phase. `rounded-xl`, `bg-muted/60`, `tabular-nums`, 30s refresh.
3. **Bento row (4 modules):**
   - Price FAIR + sparkline — `/api/price`
   - GitHub — latest release v3.0.x + stars + download buttons (.deb/.zip/macOS) — NEW `/api/github`
   - WFAIR bridge reserves/peg — existing `use-wfair-reserves` / `use-wfair-chain-data` hooks
   - Network & Masternodes — connections, peers, PoW→PoS phase, MN count (currently 0, PoS chain)
4. **Two columns:** Recent Blocks (15–20) + Latest Transactions (15–20). Tx feed **aggregates txids across the last N blocks** with real block/time (fix), not just the newest block.
5. **Supply / halving bar** (bonus, no endpoint) — computed client-side: premine 5,000,000 @ block 1, reward 10, halving every 525,600, min 1.25, max 33,000,000.

## Backend
- NEW `GET /api/github` (cached 15 min; modeled on Oxy `server/services/githubSync.ts`).
- Fix masternode reward split `60/36/4` → **50/50/0** (`FairCoin/src/main.cpp` `GetMasternodePayment` = `blockValue/2`).
- Supply accuracy: `/api/stats` ignores the 5M premine (height×10); UI computes the correct figure.

## Security / performance (audit — production)
Critical: `.env` tracked in git → untrack + rotate; unbounded `?limit` → DoS → clamp 1–50 + validate `network ∈ {mainnet,testnet}`; CORS wide open → allowlist.
High: error.message leakage → generic errors; add helmet + express-rate-limit + compression + json 64kb limit; cache single-flight + Mongo TTL index; WS per-IP cap uses spoofable XFF → `trust proxy` + `req.ip`.
Medium: home/`setInterval` pages → React Query.

## Build approach
- Reuse tokens (`--primary` green, `--accent` lime, `--radius` 14px, Inter), `rounded-full/xl`, `bg-muted/60`. Reuse Badge/Button/Tabs/Table/NetworkStatus. No card overuse.
- React Query `useQuery` only (no useEffect/setInterval). i18n via `useTranslations('home')` across all `src/messages/*.json`.
- Split into `src/components/home/*`. No `as any`, no `!`, proper types.
- Two parallel subagents: frontend (`src/`) + backend (`server/`).

## Dev preview
- Vite on **:5180** (dedicated port), `/api` → prod (`VITE_API_TARGET=https://explorer.fairco.in`) for real data, no local node.
- New `/api/github` previewed via a local API instance on :4100 proxied for that path only.
- Oxy website stays up on :5173 (+ API :4000).
