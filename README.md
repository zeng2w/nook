# Nook

Nook is a Vue 3 TV-tracking dashboard backed by Express and MongoDB.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB
- A TMDB API key

## Local setup

```sh
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
- `SESSION_SECRET`: at least 32 random characters in production; signs the HttpOnly session cookie.
- `CORS_ORIGIN`: optional comma-separated allowlist for trusted same-site frontend origins. It is not needed for the default same-origin deployment.

## Verification

```sh
cd nook-server && npm test
cd nook-web && npm run lint
cd nook-web && npm run build
cd nook-web && npx playwright install chromium && npm run test:e2e -- --project=chromium
```

The backend derives data ownership from the signed session cookie. Client-provided user IDs are ignored.
