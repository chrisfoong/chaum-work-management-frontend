<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Chaum frontend instructions

Preserve this Next.js App Router structure. Read docs/TASKS.md and docs/USECASE_MATRIX.md. Implement UI according to Figma; Go API and latest user-confirmed use cases define business behavior. Frontend only; Backend stays in its separate repository.

Never open, read, inspect, copy, modify or log .env files, directly or through commands, diagnostics or agents. .env.example contains placeholders only. Never log LINE tokens, credentials or bank details. Do not use or expose Supabase keys in the frontend.

All roles use verified LINE ID tokens. Resolve identity/role from Go /me; reject unknown/inactive users and mismatched Web/Worker platform. Web is Supervisor/Assistant; Mini App is Worker. Backend enforces role/ownership on every request. Preview is visibly separate, sample data only and no mutations.

Use API schema names: tor_base/additional, request_id, shift_status, check_in/check_out, photo_url, penalty_amount, labor/material/profit. Money is decimal string or BigInt satang. Never add SQL/schema/migrations or write generated to_buy_qty. No shared Supabase mutation tests.

Eight-hour shifts including overnight, GPS AND signed area QR, server timestamps. Assistant handles leave and all areas. No advance acceptance/rejection for replacements. Checkout images required. 6W stays LINE Chat. 9A realtime operational only, no Assistant financials or snapshot/send/read history; Supervisor manually notifies after reviewing 5S/6S.

Use feature/<name> branches, keep user changes, no deploy or push unless specifically requested for this repository. Run lint, typecheck, test, build and formatting. Tests with mocks are not live integration. Document limits accurately. Do not delegate to sub-agents unless user explicitly requests it.
