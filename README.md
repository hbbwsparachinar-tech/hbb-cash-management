# HBB Hospital Cash Management

A simple, professional cash book for HBB Hospital. It records Cash In and Cash Out, shows available cash, filters transactions, and generates daily, monthly, category-wise, and complete cash-book reports in Pakistani Rupees.

## What it includes

- Cash In entries without a voucher number
- Cash Out entries with a manually entered voucher / bill number
- Dashboard balances, daily totals, recent transactions, and category summaries
- Transaction search, date, type, and category filters
- Edit and delete actions with a deletion confirmation
- Printable reports and CSV export for Excel
- A secure server-side Supabase connection: no database secret is exposed to the browser

Cash Locations, Settings, user roles, approval flows, and receipt uploads are intentionally not included.

## Stack

- Next.js
- Supabase Postgres
- Vercel deployment

## Local setup

1. Install Node.js 22 or newer, then install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add the two values from the hospital-owned Supabase project:

   ```bash
   SUPABASE_URL=
   SUPABASE_SECRET_KEY=
   ```

   Use a Supabase **secret key** (or the legacy service-role key) only in `.env.local` and Vercel Environment Variables. Never put it in the browser, GitHub, or an `NEXT_PUBLIC_` variable.

3. Apply the database migration before starting the app. In the Supabase Dashboard, open **SQL Editor**, paste the contents of [`supabase/migrations/20260911062805_create_cash_management_schema.sql`](supabase/migrations/20260911062805_create_cash_management_schema.sql), and select **Run**.

4. Start the app:

   ```bash
   npm run dev
   ```

## Vercel deployment

1. Import this GitHub repository in Vercel.
2. In **Project Settings → Environment Variables**, create `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for Production, Preview, and Development.
3. Deploy. Vercel detects the project as Next.js and uses `npm run build`.

Because this application manages hospital financial records and currently has no login screen, keep Vercel Deployment Protection enabled until an approved authentication flow is added.

## Verification

```bash
npm run build
npm run lint
```
