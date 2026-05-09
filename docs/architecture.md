# Caterpillar Serverless Architecture

## Scalable directory structure

```text
caterpillar/
├── .github/workflows/deploy-frontend.yml  # GitHub Pages deployment for the Vite SPA
├── docs/architecture.md                   # Product architecture, schema notes, and deploy commands
├── migrations/0001_initial.sql            # Cloudflare D1 schema
├── public/                                # Static PWA assets and offline service worker
├── src/
│   ├── App.tsx                            # Mobile-first/offline-first SPA shell and feature dashboard
│   ├── components/PillEditor.tsx          # 1:1 SVG pill editor component
│   ├── styles/app.css                     # WebView-safe responsive styles
│   └── types/pill.ts                      # Shared pill template types
├── worker/index.ts                        # Cloudflare Worker API routes
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc                         # Worker and D1 binding configuration
```

As the app grows, split `src` into `features/pill-editor`, `features/pet`, `features/reminders`, and `features/leaderboard`. Keep API validation types shared between the Vite app and Worker where possible. Pill SVGs are intentionally stored directly in D1 as `svg_text` because editor-generated SVG payloads are small enough for the database and keeping them with the searchable medication metadata simplifies offline sync.

## D1 data model

- `users`: stores profile, timezone, and accessibility preferences.
- `pill_templates`: stores public pill repo records including name, dosage, pills per box, SVG markup, shape, colors, dividers, and imprint text.
- `medications`: stores user medication schedules and associated pill template references.
- `dose_events`: records scheduled, taken, missed, and skipped doses for adherence analytics and offline sync reconciliation.
- `pet_stats`: stores Tamagotchi energy, mood, and consistency streaks for the global leaderboard.

## Offline-first frontend behavior

The SPA saves exported pill templates to `localStorage` before attempting any network call. If the Cloudflare Worker is unavailable, users can still create pill visuals, view their local pill box, see local pet/streak feedback, and request local notification permissions. Online-only functions, such as syncing to the shared D1 pill repo and global leaderboard updates, can retry after the Worker is reachable.

## Deployment

- Frontend: `.github/workflows/deploy-frontend.yml` builds the Vite SPA with `GITHUB_PAGES=true` and publishes `dist` to GitHub Pages.
- Backend: run `npm run worker:deploy` locally or from a Cloudflare-provisioned CI workflow to deploy the Worker with Wrangler.
- Database: replace `database_id` in `wrangler.jsonc`, then run `npm run db:migrate:remote`.
