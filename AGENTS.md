# Webgames Repository Guidance

## Project scope

- This repository is a small Next.js App Router snake game deployed on Vercel with PostgreSQL/Neon persistence.
- Preserve the single-application modular monolith. Do not introduce a monorepo, microfrontend, separate backend, global state library, ORM, or other production dependency without a demonstrated need and explicit user approval.

## Working agreement

- Inspect `git status` before editing and preserve all existing user changes.
- Keep changes limited to the requested phase. Do not automatically continue to the next security or refactoring phase.
- Do not create or update README files or unrelated documentation unless explicitly requested.
- Do not commit, push, deploy, or run production database migrations unless explicitly requested.
- Explain the need before adding a production dependency.
- Prefer small, reviewable changes. Separate behavior changes from file moves when practical.

## Public security disclosure policy

- Do not place known, suspected, hypothetical, or potential security weaknesses, attack paths, bypass methods, incomplete defenses, or exploitable implementation details in README files, public documentation, release notes, UI copy, examples, or other public-facing artifacts.
- Keep public-facing content focused on supported behavior, setup, operation, and required configuration. Do not volunteer security weakness information or proof-of-concept attack instructions in user-facing output.
- If a security concern is discovered, report it privately to the repository owner and keep remediation details out of public repository content unless the owner explicitly approves publication.
- When the owner explicitly requests private security troubleshooting, provide only the information necessary to remediate the issue and do not copy those details into public-facing files without separate approval.

## Architecture

- Keep `app/` pages and Route Handlers thin. They should compose UI or adapt HTTP requests to feature-level code.
- Organize new or extracted business code by feature, primarily `game` and `leaderboard`, rather than by global technical layer.
- Use only the internal separation a feature needs: `domain`, `contracts`, `client`, and `server`. Do not create empty architectural folders in advance.
- Migrate existing code incrementally. Do not perform a broad directory rewrite solely to match a target structure.
- Avoid generic dumping grounds such as global `utils`, `helpers`, `hooks`, or `types` directories. Shared code must have a clear owner and more than one real consumer.
- Avoid cross-feature deep imports. Compose features at the route/page boundary or expose a deliberately small feature entry point.

## Client, server, and game-domain boundaries

- Game-domain code must remain deterministic and usable by both client and server.
- Game-domain code must not import React, Next.js, `pg`, environment variables, or browser-only APIs.
- Do not read `Math.random()`, `Date.now()`, `crypto`, or other nondeterministic state inside the game engine. Pass seeds, time, and other external values explicitly.
- Treat `ENGINE_VERSION` as a persisted protocol version. A game-rule change requires an explicit compatibility decision and tests.
- Client modules must not import server modules, database code, or secrets.
- Mark server-only modules with `server-only` when that dependency is available and the module could otherwise enter the client graph.
- Keep database row shapes internal. Map snake_case database fields to explicit API/domain DTOs instead of leaking them into UI types.

## API and score-submission rules

- Treat every Route Handler as a public endpoint and every request value as untrusted.
- Validate content type, body size, exact JSON shape, player-name limits, score bounds, session state, and engine version.
- Accept only integer scores attainable by the current game rules, while recognizing that bounds validation does not establish score authenticity.
- Finalizing a game session and recording its score must be atomic and idempotent.
- Use database constraints and a unique session-to-score relationship as defense in depth.
- Do not expose secrets, SQL details, stack traces, or internal error messages in API responses.
- Rate limiting is supplemental protection; it does not replace validation, transactions, or uniqueness constraints.

## PostgreSQL and migrations

- Schema migrations are the authoritative database history. Do not rely on README snippets or manual SQL as the only definition of a table.
- Treat applied migrations as append-only. Add a new migration instead of editing one that may already be deployed.
- Keep local PostgreSQL and production Neon behavior aligned.
- Use parameterized SQL for all untrusted values.
- Execute every statement in one transaction through the same checked-out `PoolClient`; do not call the pool independently mid-transaction.
- Do not run destructive SQL or any production migration without explicit user approval.

## Verification

- Run the smallest relevant tests while iterating and report exactly what was run.
- For the current repository, the known working checks are:
  - `npx tsc --noEmit --incremental false`
  - `node --test lib/game/engine.test.ts app/api/scores/score-submission.test.ts`
- `npm run lint` currently invokes the removed `next lint` command and is not a valid lint check. Do not report lint as passing until the project script is repaired.
- When stable `test`, `typecheck`, and `lint` package scripts are introduced, prefer those scripts and update this section in the same change.
- Add pure unit tests beside deterministic domain and validation code. Put tests requiring a real PostgreSQL transaction in a clearly named integration-test location.
- Before handing off a score-submission change, cover malformed input, impossible score values, duplicate submission, unsupported engine versions, and transaction rollback.
- If a check was not run, state the reason instead of implying it passed.

## Review priorities

- Engine-version compatibility and attainable score bounds.
- Client/server boundary violations or secrets entering the client graph.
- Untrusted input reaching SQL, logs, or rendered output without appropriate validation.
- Missing transaction, locking, idempotency, or uniqueness protection.
- Migration reproducibility from an empty database and compatibility with already deployed data.
- Scope creep, speculative abstraction, and dependencies added without evidence of need.
