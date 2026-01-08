# Repository Guidelines

## Project Structure & Module Organization
- Vite + React + TypeScript entry lives in `src/main.tsx`, mounting routes defined in `src/App.tsx` and `src/pages` (auth, dashboard, commerce, analytics, storefront flows).
- Shared UI primitives are under `src/components/ui` (shadcn/Radix), with feature-level pieces in `src/components`. Cross-cutting state sits in `src/contexts`, hooks in `src/hooks`, and helpers in `src/lib` (Supabase client, utilities).
- Use the `@/*` path alias (see `tsconfig.json`) instead of deep relative imports. Place static assets in `public/`.

## Build, Test, and Development Commands
- `npm install` to restore dependencies (Node 18+ recommended).
- `npm run dev` launches Vite on port 5173 by default; `npm run build` produces a production bundle; `npm run build:dev` uses development mode flags; `npm run preview` serves the built output.
- `npm run lint` runs ESLint (TS + React hooks + Vite refresh). Resolve warnings before opening PRs.

## Coding Style & Naming Conventions
- Use TypeScript with functional components and hooks. Components/pages in PascalCase (`Dashboard.tsx`), hooks as `useX`, and shared utilities in `src/lib`.
- Tailwind is the primary styling layer; extend tokens in `tailwind.config.ts` and keep class strings readable. Theme values come from CSS variables defined in the design system.
- Follow ESLint guidance; unused-var checks are relaxed, so self-review for dead code. Prefer composition over prop drilling; centralize side effects in hooks/contexts.

## Testing Guidelines
- No automated tests are present yet. When adding logic, prefer Vitest + React Testing Library with co-located `*.test.tsx` files for hooks and utilities.
- At minimum, run `npm run lint` and smoke key flows (login/signup, dashboard navigation, checkout) before pushing. Include manual test notes in PRs.

## Commit & Pull Request Guidelines
- Use concise, imperative commit messages (`add onboarding guard`, `fix: throttle analytics fetch`).
- PRs should summarize changes, list tests run, and include screenshots/GIFs for UI updates. Link issues/tasks when available and note any data/seeding steps.

## Security & Configuration Tips
- Move Supabase credentials into environment variables (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and keep them out of git; add `.env` to `.gitignore` if not already. Avoid hardcoding keys in `src/lib/supabase.ts`.
- Review outbound requests and third-party keys before committing. Scrub sample data/logs from commits.
