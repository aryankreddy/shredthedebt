# Shred the Debt Austin Hub

Internal campaign dashboard for Global Shapers Austin's Shred the Debt medical debt relief campaign with Undue Medical Debt.

## What is included

- Fundraising total, goal, and debt-erased calculator
- Copyable personal outreach and small-business partnership templates
- Editable corporate sponsorship guide
- Eight-member action items board
- Austin fundraising playbook with click-to-cycle statuses
- Live campaign raised/goal totals pulled from the Undue Medical Debt campaign page
- Debounced persistence for internal notes and progress in browser storage for the current MVP

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy on Vercel

Import this folder as a Vercel project. The defaults should work:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Persistence note

The app now tries to use the shared `/api/state` endpoint first, backed by Supabase. If Supabase env vars are not configured, it falls back to `localStorage` so local development still works.

## Shared editing setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-schema.sql`.
3. In Vercel, add these environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional: `STATE_ROW_ID` defaults to `main`
4. Deploy on Vercel.

Use the Supabase service role key only as a Vercel server-side environment variable. Do not expose it as a `VITE_` variable.
