# Tummer

A personal Next.js app for tracking meals and related data, built with Next 16, React 19 and Supabase for authentication and storage.

## Features

- Next.js App Router structure under `app/`
- Supabase integration (`@supabase/supabase-js`)
- Tailwind + Radix UI for styling and components

## Quick Start

Requirements: Node.js 18+ and npm (or pnpm/yarn).

1. Install dependencies

```bash
npm install
```

2. Create environment variables

Create an `.env.local` in the project root with at least the following values:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# (optional) SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do NOT commit secrets to source control. If you see a file named `tummer-supabase-pass.txt` in the repository, move its contents to a secure environment variable store and remove the file from the repo.

3. Run the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

- `npm run dev` — Runs the app in development mode.
- `npm run build` — Builds the production app.
- `npm run start` — Starts the production server (after build).
- `npm run lint` — Runs ESLint.

## Project Structure

- `app/` — Next.js App Router pages and layouts.
  - `dashboard/`, `log/`, `trackMeals/`, `settings/`, `login/`, `signup/` — main app areas.
- `lib/` — helpers and clients (e.g. `supabaseClient.ts`).
- `src/context/` — React contexts (e.g. `ProfileContext.tsx`).
- `public/` — static assets and fonts.

## Environment & Supabase

This project relies on Supabase for auth and persistence. Create a Supabase project, then add the project's URL and anon key to your `.env.local`. For server-side operations that require elevated privileges do not use the anon key — use server-side secrets and the service role key only on trusted backends.

## Deployment

Deploy to Vercel for the easiest integration with Next.js. In the Vercel project settings, add the same environment variables you used locally (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.).

Other hosts that support Node/Next will also work; ensure environment variables are configured there as well.

## Contributing

If you plan to contribute or extend the project:

- Follow the existing coding style (TypeScript + Next + Tailwind).
- Keep secrets out of the repository and use environment variables.

## Troubleshooting

- If Supabase auth fails, verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct and available to the frontend.
- If pages don't update on edit, ensure `next dev` is running and you edited files under `app/`.

## Contact

If you need help or want to suggest changes, open an issue or reach out to the maintainer.

---

Generated README: updated with quickstart, env setup, scripts, structure, and deployment notes.
