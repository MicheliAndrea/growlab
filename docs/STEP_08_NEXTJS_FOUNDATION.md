# STEP 08 — Next.js Foundation

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Orval
- pnpm
- output standalone Docker

## Hybrid frontend

- Server Components dove possibile.
- Client Components dove serve.
- WASM solo predisposto in `lib/wasm`, non implementato.

## Output

- app layout
- shadcn install/config
- Orval config
- generated API client
- Dockerfile standalone

## Implementazione

- Creata app Next.js in `apps/web`.
- App Router configurato con `app/layout.tsx`, `app/page.tsx` e `app/providers.tsx`.
- TypeScript strict configurato in `apps/web/tsconfig.json`.
- TailwindCSS configurato con `tailwind.config.ts`, `postcss.config.js` e `app/globals.css`.
- Config shadcn in `apps/web/components.json`.
- Componenti UI locali shadcn-style:
  - button
  - card
  - badge
  - input
  - label
  - chart wrapper Recharts
- TanStack Query configurato nel provider client.
- React Hook Form e Zod installati; schema form base in `apps/web/lib/forms.ts`.
- Recharts installato e predisposto con `MiniLineChart`.
- Client Orval importabile da `apps/web/lib/api.ts`.
- Runtime fetcher Orval aggiornato per la firma generata.
- WASM solo predisposto in `apps/web/lib/wasm`.
- Dockerfile web aggiornato con output standalone.
- `make dev-web` punta a `pnpm --filter @growlab/web dev`.

## Esclusioni confermate

- Nessuna pagina dashboard avanzata oltre la foundation.
- Nessuna autenticazione.
- Nessuna AI.
- Nessuna irrigazione attiva.
- Nessun build globale eseguito.
