# Nook

Nook is a Vue 3 TV-tracking dashboard backed by Express and MongoDB.

## Requirements

- Node.js 24.x (the repository includes an `.nvmrc`)
- MongoDB
- A TMDB API key

## Local setup

```sh
nvm use
cp nook-server/.env.example nook-server/.env
cd nook-server
npm install
npm run dev
```

In another terminal:

```sh
cd nook-web
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:5001`.

## Environment variables

- `MONGO_URI`: MongoDB connection string.
- `TMDB_API_KEY`: TMDB API key used by search and synchronization.
- `TMDB_TIMEOUT_MS`: optional TMDB request timeout in milliseconds (defaults to 12000).
- `TMDB_CACHE_TTL_MS`: optional successful TMDB response cache duration (defaults to 5 minutes).
- `TMDB_SYNC_CONCURRENCY`: optional concurrent synchronization limit (defaults to 3, maximum 5).
- `HTTP_PROXY` / `HTTPS_PROXY`: optional proxy URLs for local networks that cannot reach TMDB directly.
- `SESSION_SECRET`: at least 32 random characters in production; signs the HttpOnly session cookie.
- `CORS_ORIGIN`: optional comma-separated allowlist for trusted same-site frontend origins. It is not needed for the default same-origin deployment.

## Vercel deployment

Before deploying, add `MONGO_URI`, `TMDB_API_KEY`, and `SESSION_SECRET` in the
project's Vercel Settings → Environment Variables. `SESSION_SECRET` must contain
at least 32 random characters and must not be committed to Git. Apply the values
to Production (and Preview if needed), then redeploy; environment-variable
changes do not affect an existing deployment.

After deployment, open `/api/health`. A working login configuration reports
`"database":"connected"` and `"session":"configured"`. A missing or short
session secret now returns a diagnostic `503` response instead of crashing the
entire Serverless Function during startup.

## Verification

```sh
cd nook-server && npm test
cd nook-web && npm run lint
cd nook-web && npm run build
cd nook-web && npx playwright install chromium && npm run test:e2e -- --project=chromium
```

The backend derives data ownership from the signed session cookie. Client-provided user IDs are ignored.
