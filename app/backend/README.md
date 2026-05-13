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
```
