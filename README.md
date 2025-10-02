# CrownShield

CrownShield is a video-first community built with React, Vite, and Tailwind CSS on the frontend and Vercel serverless functions for the API layer. It stores catalog metadata in Vercel Blob so deployments remain stateless and easy to scale.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173). API routes live under `/api` and are executed by Vercel's Node 18 runtime.

### Environment variables

Copy `.env.example` to `.env.local` (not committed) and provide values:

- `BLOB_READ_WRITE_TOKEN` – scoped token generated from the Vercel dashboard for the shared store `store_dPOa6uxzT8rs5bEK`.
- `BLOB_PUBLIC_BASE_URL` – public base URL for that store. For production we use `https://dpoa6uxzt8rs5bek.public.blob.vercel-storage.com`.
- `FILE_SIZE_LIMIT_MB` – maximum file size accepted for uploads.
- `JWT_SECRET` – secret string for signing auth tokens.

For local development without Vercel Blob the application falls back to JSON files written to `catalog/` and `data/`.

## Available scripts

- `npm run dev` – start Vite in development mode.
- `npm run build` – run type checking and create a production build in `dist/`.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint on the project.

## Serverless API

All API handlers live in `/api` and are written in TypeScript. Highlights:

- `api/auth` – login, register, fetch current session, and logout (httpOnly cookie).
- `api/upload/create` – generates presigned Blob URLs for MP4 videos and poster images.
- `api/videos` – list, create, update, and delete video metadata.
- `api/comments` – post and manage threaded discussion for each video.
- `api/likes` – toggle likes per user and maintain counts.
- `api/view` – record anonymised views with IP-based deduplication windows.
- `api/profile` – update channel metadata.

Storage is abstracted via `api/_lib/storage.ts`. When Blob credentials are present the JSON documents are kept in Vercel Blob, otherwise the helper writes to disk.

A lightweight rate limiter lives in `api/_lib/rate-limit.ts` to protect from spam based on the requester IP and action key.

## Frontend features

The SPA uses React Router and React Query. Auth state is synchronised via a context that reads the httpOnly cookie session. Features include:

- Catalog landing page with tag filters.
- Watch view with progressive playback, likes, and real-time comments.
- Upload flow with MP4 support, poster capture from `<canvas>`, and metadata persistence.
- Channel and search pages that filter catalog metadata.
- Profile settings page for managing display name, bio, and avatar URL.

Tailwind CSS provides the design system, configured via `tailwind.config.cjs`.

## Deployment

Deploy to Vercel:

1. Create a new Vercel project and link this repository.
2. Set the required environment variables inside the Vercel dashboard (Production and Preview).
   - `BLOB_READ_WRITE_TOKEN` must be a scoped token generated for `store_dPOa6uxzT8rs5bEK`.
   - `BLOB_PUBLIC_BASE_URL` should be `https://dpoa6uxzt8rs5bek.public.blob.vercel-storage.com`.
3. Ensure the project has access to a Vercel Blob store and the provided token.
4. Push to the default branch – Vercel will build the Vite frontend and compile TypeScript API routes automatically.

The provided `vercel.json` adds SPA rewrites so client-side routes resolve to `index.html` while keeping API routes intact.

## Catalog data

The canonical catalog lives at `catalog/index.json`. It is updated every time a video is created or metadata changes. Query parameters `q` and `tag` are supported for in-app search filters.

---

Happy streaming! 🎬
