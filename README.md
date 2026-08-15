# Webgames — Snake Game

一个使用 Next.js、React 和 PostgreSQL 构建的贪吃蛇游戏 Demo。

- Production: [https://easternpurity.com/](https://easternpurity.com/)
- Framework: Next.js 16.3 / React 19.2
- Database: PostgreSQL（Production 使用 Neon）
- Deployment: Vercel

## 功能

- 20 × 20 游戏棋盘
- 蛇可以穿过棋盘边界
- 每吃到一个食物增加 10 分
- 每局最多转向 100 次
- 蛇身达到 100 时显示 `You Win!`
- Game Over 或 Win 后有 10 秒提交成绩
- 排行榜只保留并显示 Top 5
- 同名玩家只保留其历史最高分
- 浏览器标签页不可见时自动暂停游戏

## 游戏与成绩提交流程

```text
浏览器                           Next.js API                 PostgreSQL
  │                                  │                           │
  ├─ POST /api/games/start ─────────>│                           │
  │                                  ├─ 创建 game_session ─────>│
  │<─ sessionId / seed / version ────┤                           │
  │                                  │                           │
  ├─ 在客户端运行游戏                │                           │
  │                                  │                           │
  ├─ POST /api/games/finish ────────>│                           │
  │  sessionId / playerName / score  ├─ 校验并事务更新 Top 5 ──>│
  │<─ 保存结果 ──────────────────────┤                           │
  │                                  │                           │
  └─ GET /api/scores ───────────────>│<─ 查询 Top 5 ────────────│
```

旧的 `POST /api/scores` 已禁用并返回 `405 Method Not Allowed`；`GET /api/scores` 继续用于读取排行榜。

## API

### `POST /api/games/start`

创建一局服务端游戏会话。请求不需要 body。

成功响应示例：

```json
{
  "sessionId": "5be0f9ad-3d7f-4cbe-9e3e-8a0c0ce83712",
  "seed": 123456789,
  "engineVersion": 2
}
```

### `POST /api/games/finish`

提交本局结果：

```json
{
  "sessionId": "5be0f9ad-3d7f-4cbe-9e3e-8a0c0ce83712",
  "playerName": "Lucas",
  "score": 120
}
```

服务端会验证：

- JSON 字段必须精确匹配协议
- `playerName` 长度为 1–24 个字符
- `score` 必须为 0–990 之间的 10 的倍数
- 游戏会话必须存在且引擎版本受支持
- 同一个会话只能产生一条排行榜记录

写入在数据库事务中完成。同名玩家再次提交时，只有更高的分数会替换旧分数；最终只保留 Top 5。

### `GET /api/scores`

返回当前排行榜，按分数从高到低排列，最多 5 条。

## 数据库

当前核心数据结构：

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

迁移文件位于 [`db/migrations`](db/migrations)。现有数据库应按顺序执行：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_create_game_session.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_add_game_session_final_tick.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_simplify_game_sessions_and_leaderboard.sql
```

> 注意：迁移 `001` 基于项目早期已经存在的 `player_score` 表。全新空数据库在执行迁移前，需要先创建该基础表：

```sql
CREATE TABLE public.player_score (
  id BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

本地开发建议使用独立数据库（当前约定为 `snakegame_dev`），不要让本地 `.env.local` 指向 Production Neon 数据库。

## 本地开发

安装依赖：

```bash
npm install
```

在 `.env.local` 中配置本地 PostgreSQL：

```dotenv
DATABASE_URL=postgresql://<user>:<password>@localhost:<port>/snakegame_dev
```

启动开发服务器：

```bash
npm run dev
```

然后访问 [http://localhost:3000](http://localhost:3000)。

## 验证

类型检查：

```bash
npx tsc --noEmit --incremental false
```

单元测试：

```bash
node --test \
  app/api/games/finish/finish-request.test.ts \
  app/api/games/start/start-request.test.ts \
  lib/game/client/game-api.test.ts \
  lib/game/client/game-state.test.ts \
  lib/game/engine.test.ts
```

数据库集成测试：

```bash
node --test lib/game/server/start-game.integration.test.ts
node --test lib/game/server/finish-game.integration.test.ts
```

集成测试会拒绝连接非本地数据库，并要求数据库名为 `snakegame_dev`。

Production 构建：

```bash
npm run build
```

当前 `npm run lint` 仍沿用旧的 `next lint` 脚本，而 Next.js 16 已不再提供该命令；在替换 lint 配置前，请以 TypeScript 检查和测试作为主要验证。

## 项目结构

```text
app/
├── api/
│   ├── games/start/       # 创建游戏会话
│   ├── games/finish/      # 完成游戏并更新排行榜
│   └── scores/            # 只读排行榜 API
├── game/                  # 游戏页面
└── page.tsx               # 首页

lib/game/
├── client/                # 客户端状态与 API 调用
├── contracts/             # API 数据协议
├── server/                # 服务端会话和排行榜事务
└── engine.ts              # 确定性游戏引擎与 seeded PRNG

db/migrations/             # PostgreSQL 迁移
```

## 部署与安全边界

Vercel Production 需要配置 `DATABASE_URL`，并重新部署后才会应用环境变量变化。当前 Vercel Firewall 对游戏开始和结束接口按 IP 限流；Firewall 规则属于 Vercel 控制台配置，不在本仓库中。

当前实现提供以下保护：

- HTTPS 保护传输中的请求内容
- 服务端会话限制无会话提交
- 严格输入校验缩小可接受请求范围
- 唯一约束和事务防止重复提交及并发写入破坏 Top 5
- Vercel Firewall 缓解高频滥用
- 旧的直接写分数接口已关闭

这是一个强调简单性的 Demo，不是完全防作弊的竞技排行榜。最终分数仍由客户端提交，因此攻击者可以构造合法格式的虚假分数；HTTPS、JWT 或隐藏计算公式都不能证明客户端确实完成了真实游戏。若未来需要可信排行榜，应恢复服务端确定性重放，或采用权威服务端实时运行游戏状态。

另外，当前 `game_session` 不设过期时间，未完成的会话会保留在数据库中；这是移除生命周期字段后接受的存储权衡。

## License

MIT
