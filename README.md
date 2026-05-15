# mini-geospacial-ai-assist

Monorepo for an AI-assisted geospatial security and analytics platform focused on live camera inference using YOLO-family models.

## Purpose

This project is being built to support:

- Premise/building/city/map geospatial setup and context modeling
- Live camera channel connectivity and ingestion
- Logging, metrics, visualization, and reporting
- Post-training workflows for model improvement and rebuilds

Primary beneficiaries:

- Building and on-site security operations teams
- Data scientists and ML engineering teams

## Monorepo Structure

```text
app/
  frontend/   # React + TypeScript + Vite client
  backend/    # Laravel backend + Vite-managed frontend assets
```

`app/frontend` and `app/backend` are subprojects, not standalone git repositories.

## Workspace Commands (from repo root)

```bash
npm run frontend:dev
npm run frontend:lint
npm run frontend:build
npm run backend:assets:dev
npm run backend:assets:build
```

## API and UI Baseline

- Login-only authentication (single user type) via `POST /api/login`
- Bearer-token protected dashboard and catalog APIs:
  - `GET /api/dashboard`
  - `GET /api/catalog/locations`
  - `POST /api/catalog/locations`
  - `PUT /api/catalog/locations/{location}`
- Dashboard modules focus on:
  - Live feed configuration
  - Camera specification
  - YOLO model metadata
  - Camera placement locations

For local backend seed data, default credentials are:

- Username: `admin`
- Password: `1234`

## Deployment Automation

Deployment-related automation lives in GitHub Actions and is intentionally scoped to deployment events only:

- Manual runs (`workflow_dispatch`)
- Published releases (`release.published`)

See `.github/workflows/deployment.yml`.

## Safe Developer Workflow

- Use git only from the monorepo root.
- Do not initialize nested git repositories under `app/frontend` or `app/backend`.
- Keep environment files local and uncommitted (`.env*` patterns are ignored).
- Build artifacts (`app/frontend/dist`) are ignored and must not be committed.
