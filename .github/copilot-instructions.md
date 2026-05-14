# Copilot Instructions — mini-geospatial-ai-assist Monorepo

## Repository Intent (Read First)
- This is a monorepo for an AI-assisted geospatial security and analytics platform.
- Follow `README.md`, `app/frontend/README.md`, and `app/backend/README.md` before proposing or implementing changes.
- Keep changes aligned with current baseline APIs (`/api/login`, `/api/dashboard`, `/api/locations`) and dashboard goals (live feeds, camera specs, YOLO metadata, placement locations).

## Monorepo Scope
- `app/frontend`: React + TypeScript + Vite UI.
- `app/backend`: Laravel 11 API + PostgreSQL domain.
- Treat frontend and backend as one product surface: UI behavior and API contracts must evolve together.

## Shared Delivery Rules (Frontend + Backend)
- Always inspect existing code patterns first; do not invent new architecture.
- Prefer small, focused changes that preserve existing structure.
- Do not introduce new libraries unless explicitly requested.
- Ask clarifying questions before large or cross-cutting changes.
- Propose a short plan before implementation.
- Prefer incremental commits.
- Do not add unnecessary comments.
- Do not implement tests unless explicitly requested.

## Contract-First Synchronization Rules
- Any UI change that affects data shape, validation, filtering, pagination, or workflow state must trigger matching API contract updates.
- Frontend must not be constrained by current API limitations; when UX needs new fields or flows, extend backend accordingly.
- Backend must not ship request/response formats that block intended UI interactions.
- Keep request and response contracts synchronized for every feature:
  - **FormRequest (backend validation/input contract)** must match UI form intent.
  - **JSON response (API Resource/output contract)** must match UI rendering and state needs.
- When contract changes are made, update all affected layers in the same task: route, FormRequest, service, controller, resource, and frontend service/types/components.

## Frontend Standards
- Use functional components only.
- Use explicit TypeScript types; avoid `any`.
- Use `async/await`; avoid promise chaining.
- Keep business logic outside UI components.
- Isolate API calls in frontend service modules.
- Naming:
  - camelCase for variables/functions and API values consumed in frontend code.
  - PascalCase for components/classes.
  - kebab-case for file names.

## Backend Standards (Laravel API)
- Every backend feature must traverse impacted layers: migration (if needed) → model → FormRequest → service → controller → route → resource.
- Keep controllers thin; business logic belongs in services.
- Use FormRequest per action (`store`, `update`, etc.) with explicit `authorize()` and `rules()`.
- Return API Resources/collections, not raw models.
- Apply middleware and authorization consistently at route and policy/request levels.
- Naming:
  - snake_case for API endpoints and backend payload keys.

## Validation and Response Coupling
- For each create/update flow, align these three artifacts:
  1. Frontend form model and UI validation rules.
  2. Backend FormRequest rules and authorization.
  3. API Resource JSON response consumed by frontend.
- If frontend adds or changes a field, backend must:
  - accept/validate it in FormRequest,
  - process it in service logic,
  - return it (or derived state) in JSON response when needed by UI.
- If backend introduces a field/state, frontend must expose or handle it where relevant.

## Security and Data Safety
- Never log secrets or tokens.
- Never hardcode credentials.
- Validate all user input on backend even if frontend validates.
- Never rely on frontend-only role enforcement.

## File Upload Pattern (When Applicable)
- Default to PDF-only uploads unless requirements say otherwise.
- Default maximum size: 1MB unless requirements say otherwise.
- Store file paths (not public URLs) and keep storage handling in services.

## Done Criteria per Feature
- Frontend UI/services/types updated for intended UX.
- Backend FormRequest and API Resource updated to match UX contract.
- Route/controller/service/model/migration changes completed where applicable.
- No contract mismatch between submitted frontend data and returned backend JSON.
