# Backend (Monorepo Subproject)

This directory contains the Laravel backend for `mini-geospacial-ai-assist`.

## Important

This folder is part of the monorepo and is **not** a separate git repository.

Use git commands from the repository root:

`/home/runner/work/mini-geospacial-ai-assist/mini-geospacial-ai-assist`

## Backend Runtime Notes

- The backend composer dependencies currently require PHP `^8.4`.
- Frontend assets for Laravel are built with Vite from this same folder.

## Commands

From repo root (assets only):

```bash
npm run backend:assets:dev
npm run backend:assets:build
```

From this folder:

```bash
npm run dev
npm run build
composer test
php artisan raw-data-collection:capture-frames-forever --sleep=5
```

## Raw Data Collection Scheduler Capacity Controls

Scheduled raw-data capture dispatches independent per-setting queue jobs every second on `raw-data-collection`.
Tune these environment variables to match validated node capacity and worker sizing:

- `RAW_DATA_COLLECTION_MAX_CAMERAS_PER_NODE` (default: `50`)
- `RAW_DATA_COLLECTION_MAX_DISPATCH_PER_TICK` (default: `10`)
- `RAW_DATA_COLLECTION_CAPTURE_JOB_LOCK_TTL_SECONDS` (default: `120`)
- `RAW_DATA_COLLECTION_INTERVAL_DUE_CACHE_TTL_FLOOR_SECONDS` (default: `60`)
- `RAW_DATA_COLLECTION_INTERVAL_DUE_CACHE_TTL_MULTIPLIER` (default: `2`)

Run dedicated workers for this queue and scale horizontally as camera count grows, for example:

```bash
php artisan queue:work --queue=raw-data-collection
```
