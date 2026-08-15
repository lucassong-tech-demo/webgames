# Webgames — Snake Game

A Snake web game built with Next.js, React, and PostgreSQL.

- Production: [https://easternpurity.com/](https://easternpurity.com/)
- Framework: Next.js 16.3 / React 19.2
- Database: PostgreSQL (Neon in production)
- Deployment: Vercel

## Features

- 20 × 20 game board
- The snake wraps around the board edges
- Each food item adds 10 points
- Up to 100 turns per game
- `You Win!` appears when the snake reaches a length of 100
- A score can be submitted within 10 seconds after Game Over or a win
- The leaderboard stores and displays only the top five players
- Each player name retains only its highest score
- The game pauses automatically when the browser tab is hidden

## Game and score submission flow

```text
Browser                           Next.js API                 PostgreSQL
  │                                  │                           │
  ├─ POST /api/games/start ─────────>│                           │
  │                                  ├─ Create game_session ───>│
  │<─ sessionId / seed / version ────┤                           │
  │                                  │                           │
  ├─ Run the game on the client       │                           │
  │                                  │                           │
  ├─ POST /api/games/finish ────────>│                           │
  │  sessionId / playerName / score  ├─ Validate and update ───>│
  │                                  │  Top 5 in a transaction   │
  │<─ Save result ───────────────────┤                           │
  │                                  │                           │
  └─ GET /api/scores ───────────────>│<─ Query Top 5 ───────────│
```

The legacy `POST /api/scores` endpoint is disabled and returns `405 Method Not Allowed`. `GET /api/scores` remains available for reading the leaderboard.

## API

### `POST /api/games/start`

Creates a server-side game session. No request body is required.

Example success response:

```json
{
  "sessionId": "5be0f9ad-3d7f-4cbe-9e3e-8a0c0ce83712",
  "seed": 123456789,
  "engineVersion": 2
}
```

### `POST /api/games/finish`

Submits the result of a game:

```json
{
  "sessionId": "5be0f9ad-3d7f-4cbe-9e3e-8a0c0ce83712",
  "playerName": "Lucas",
  "score": 120
}
```

The server validates that:

- The JSON fields match the API contract exactly
- `playerName` contains 1–24 characters
- `score` is a multiple of 10 between 0 and 990
- The game session exists and uses a supported engine version
- Each session produces at most one leaderboard entry

Database writes are completed in a transaction. When the same player name submits again, only a higher score replaces the previous score. The leaderboard retains the top five entries.

### `GET /api/scores`

Returns up to five leaderboard entries ordered by score from highest to lowest.

## Database

Core data structure:

```text
game_session
├── id                UUID PRIMARY KEY
├── engine_version    SMALLINT
├── seed              INTEGER
└── started_at        TIMESTAMPTZ

player_score
├── player_name       VARCHAR
├── score             INTEGER
└── game_session_id   UUID UNIQUE REFERENCES game_session(id)

UNIQUE (player_name)
```

Migration files are located in [`db/migrations`](db/migrations). Run them in order for an existing database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_create_game_session.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_add_game_session_final_tick.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_simplify_game_sessions_and_leaderboard.sql
```

> Note: Migration `001` expects the `player_score` table from an earlier version of the project. For a new empty database, create this base table before running the migrations:

```sql
CREATE TABLE public.player_score (
  id BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Use a separate database for local development. The current convention is `snakegame_dev`. Do not point the local `.env.local` file to the production Neon database.

## Local development

Install dependencies:

```bash
npm install
```

Configure local PostgreSQL in `.env.local`:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@localhost:<port>/snakegame_dev
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Verification

Type checking:

```bash
npx tsc --noEmit --incremental false
```

Unit tests:

```bash
node --test \
  app/api/games/finish/finish-request.test.ts \
  app/api/games/start/start-request.test.ts \
  lib/game/client/game-api.test.ts \
  lib/game/client/game-state.test.ts \
  lib/game/engine.test.ts
```

Database integration tests:

```bash
node --test lib/game/server/start-game.integration.test.ts
node --test lib/game/server/finish-game.integration.test.ts
```

The integration tests reject non-local database connections and require the database name to be `snakegame_dev`.

Production build:

```bash
npm run build
```

## Project structure

```text
app/
├── api/
│   ├── games/start/       # Create a game session
│   ├── games/finish/      # Finish a game and update the leaderboard
│   └── scores/            # Read-only leaderboard API
├── game/                  # Game page
└── page.tsx               # Home page

lib/game/
├── client/                # Client state and API calls
├── contracts/             # API contracts
├── server/                # Server-side sessions and leaderboard transactions
└── engine.ts              # Deterministic game engine and seeded PRNG

db/migrations/             # PostgreSQL migrations
```

## Deployment

Set `DATABASE_URL` for the Production environment in Vercel. Redeploy the application after changing an environment variable. Vercel Firewall currently applies per-IP rate limits to the game start and finish endpoints. Firewall rules are managed in the Vercel dashboard and are not stored in this repository.

## License

MIT
