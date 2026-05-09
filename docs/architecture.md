# Medication Adherence SPA — Scalable Serverless Structure

```text
caterpillar/
├── frontend/                        # Vite React SPA (Tailwind, Zustand, Lucide)
│   ├── public/
│   │   ├── icons/
│   │   └── manifest.webmanifest
│   ├── src/
│   │   ├── app/                     # App shell, routing, providers
│   │   ├── components/              # Shared UI components
│   │   ├── features/
│   │   │   ├── pills/
│   │   │   │   ├── PillEditor.tsx
│   │   │   │   ├── pillPresets.ts
│   │   │   │   └── api.ts
│   │   │   ├── medications/
│   │   │   ├── reminders/
│   │   │   └── pet/
│   │   ├── stores/                  # Zustand stores
│   │   ├── services/                # API, notifications, offline sync
│   │   ├── workers/                 # Service worker helpers
│   │   ├── styles/
│   │   └── types/
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
├── backend/                         # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts                 # Worker entrypoint
│   │   ├── routes/
│   │   ├── lib/
│   │   └── types.ts
│   └── wrangler.toml
├── infra/
│   └── d1/
│       ├── schema.sql               # Canonical D1 schema
│       └── migrations/
├── shared/                          # Shared DTOs/schemas across FE + Worker
│   └── src/
│       └── types.ts
└── .github/
    └── workflows/
        └── deploy.yml               # GitHub Pages + Wrangler deploy
```

## Notes
- Mobile-first layout should use safe viewport units (`100dvh`) and touch-sized controls.
- Keep high-contrast mode and larger tap targets enabled through design tokens in `frontend/src/styles`.
- Store SVG blobs in R2, and metadata/index rows in D1 for search/import.
