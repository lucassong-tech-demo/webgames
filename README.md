# Snake Game

一个用 Next.js 构建的全栈贪吃蛇小游戏：游戏本身运行在浏览器中，玩家失败后可以在 10 秒内提交昵称和分数，服务端再将成绩写入 PostgreSQL。

这个仓库更适合作为一个小型全栈 Web Demo，而不是完整的游戏产品。它用很少的文件展示了一条完整链路：Canvas 游戏逻辑、React 状态管理、Next.js Route Handler、PostgreSQL 持久化，以及 Vercel Serverless 部署。

> 当前版本可以构建并部署，但还不适合直接公开上线。数据库凭据写在源码中，Next.js 版本也存在已知安全漏洞。请先完成[上线前必须处理的事项](#上线前必须处理的事项)。

## Big picture

项目由三部分组成：

1. **浏览器游戏**：`app/page.tsx` 是 Client Component，负责键盘输入、游戏循环、碰撞判断、Canvas 绘制、速度调整和计分。
2. **成绩 API**：`POST /api/scores` 接收玩家昵称和分数，通过参数化 SQL 写入数据库。
3. **外部服务**：PostgreSQL/Neon 保存成绩，Microsoft Clarity 收集页面行为分析数据。

```mermaid
flowchart LR
    Player["玩家"] -->|方向键 / 速度按钮| Game["React + Canvas 游戏"]
    Game -->|游戏结束后 POST| API["Next.js /api/scores"]
    API -->|参数化 INSERT| DB[("PostgreSQL / Neon")]
    Browser["浏览器"] -->|行为数据| Clarity["Microsoft Clarity"]

    subgraph Vercel["可部署在 Vercel"]
        Game
        API
    end
```

首页在构建时静态生成，游戏循环完全在客户端执行；只有保存分数时才调用服务端函数。因此，大部分游玩流量不消耗数据库连接，部署成本较低。

## 已实现的功能

- 20 × 20 网格、400 × 400 Canvas 游戏区域
- 方向键控制，阻止蛇直接反向移动
- 穿墙后从对侧出现
- 撞到自身后游戏结束
- 每个食物增加 10 分
- 可在 50–300 ms/步之间调整速度
- 游戏结束后有 10 秒成绩提交窗口
- 玩家昵称最长 50 个字符
- PostgreSQL 成绩写入
- Microsoft Clarity 行为分析

目前**没有**排行榜读取接口或排行榜 UI；数据库只负责接收成绩。

## 技术与架构

| 层 | 技术 | 在本项目中的职责 |
| --- | --- | --- |
| 框架 | Next.js 15.3.1（App Router） | 页面、构建、Route Handler 和部署单元 |
| UI | React 19 + TypeScript | 游戏状态、生命周期和交互 |
| 游戏渲染 | HTML Canvas 2D | 网格、蛇和食物绘制 |
| 样式 | Tailwind CSS 4 | 页面布局与组件样式 |
| API | Next.js Route Handler | 处理 `POST /api/scores` |
| 数据库 | PostgreSQL + `pg` | 持久化玩家昵称和分数 |
| 字体 | `next/font` + Geist | 构建时下载并优化字体 |
| 分析 | Microsoft Clarity | 页面行为分析 |

### 游戏状态流

`setInterval` 按当前速度推进蛇的位置；React state 保存蛇身、方向、食物、分数、速度和游戏结束状态。每次 state 变化后，Canvas 根据最新数据重新绘制。蛇撞到自身时进入 Game Over 状态，并启动独立的 10 秒保存倒计时。

### 成绩写入流

客户端向 `/api/scores` 发送：

```json
{
  "playerName": "Ada",
  "score": 120
}
```

服务端执行参数化插入：

```sql
INSERT INTO public.player_score (player_name, score)
VALUES ($1, $2);
```

参数化查询可以降低 SQL 注入风险，但当前 API 还没有服务端字段校验、鉴权、限流或防作弊逻辑。

## 项目结构

```text
.
├── app/
│   ├── api/scores/route.ts  # 保存成绩的 POST API
│   ├── globals.css          # Tailwind、主题变量和全局样式
│   ├── layout.tsx           # 字体、元数据、Clarity 和页脚
│   └── page.tsx             # 游戏 UI、状态、循环与 Canvas 绘制
├── public/                  # 静态资源
├── next.config.ts           # Next.js 配置
├── package.json             # 依赖和 npm scripts
├── postcss.config.mjs       # Tailwind PostCSS 插件
└── tsconfig.json            # TypeScript 配置
```

## 本地运行

### 前置条件

- Node.js 20 LTS（推荐）
- npm
- PostgreSQL 数据库（只试玩游戏时可暂不配置；保存成绩需要）

### 1. 安装与启动

```bash
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，点击游戏画布后使用方向键操作。

### 2. 准备数据库

可在 PostgreSQL 中创建最小数据表：

```sql
CREATE TABLE IF NOT EXISTS public.player_score (
  id BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. 改用环境变量

当前 `app/api/scores/route.ts` 将连接字符串直接写在源码中。部署或共享仓库前，应先轮换已经暴露的数据库凭据，再将连接池改为读取服务端环境变量：

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

本地创建不会提交到 Git 的 `.env.local`：

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

`DATABASE_URL` 不要加 `NEXT_PUBLIC_` 前缀，否则可能被打包进浏览器代码。

## 常用命令

| 命令 | 说明 | 当前状态 |
| --- | --- | --- |
| `npm run dev` | 使用 Turbopack 启动开发服务器 | 可用 |
| `npm run build` | 创建生产构建并执行类型检查 | 已验证通过 |
| `npm run start` | 启动已构建的生产服务 | 需先运行 `npm run build` |
| `npm run lint` | 运行 Next.js lint | ESLint 尚未配置，首次执行会进入交互式配置 |

## 可以免费部署到 Vercel 吗？

**可以，前提是用于个人、非商业项目，并且使用量不超过 Vercel Hobby 免费额度。** 本项目不需要修改整体架构：

- `/` 会作为静态页面部署；
- `/api/scores` 会作为 Node.js Vercel Function 按需运行；
- PostgreSQL 是外部服务，费用和额度不包含在 Vercel Hobby 中；
- 当前的 Neon pooler 连接方式适合短生命周期函数，但数据库也必须有可用额度。

Vercel Hobby 是 `$0/月`，但官方将其限定为个人、非商业用途；超出免费用量后，Hobby 项目通常需要等待额度周期恢复。具体数字会变化，部署前请查看 [Hobby Plan](https://vercel.com/docs/plans/hobby)、[Vercel Limits](https://vercel.com/docs/limits) 和 [Pricing](https://vercel.com/pricing)。

### Vercel 部署步骤

1. 完成下面的[上线前必须处理的事项](#上线前必须处理的事项)。
2. 将仓库推送到个人 GitHub/GitLab/Bitbucket 仓库。
3. 在 Vercel 中选择 **Add New → Project** 并导入仓库。
4. 保持自动识别的 Next.js 构建配置。
5. 在 **Project Settings → Environment Variables** 添加 `DATABASE_URL`，至少应用到 Production；需要预览环境写库时也应用到 Preview。
6. 部署后实际玩一局并提交分数，再在数据库中确认记录。

Vercel 构建环境需要能访问 Google Fonts，因为 `app/layout.tsx` 使用 `next/font/google`。如需在完全离线或严格受限的构建环境部署，应改用本地字体。

## 上线前必须处理的事项

按优先级排序：

1. **立即轮换数据库凭据。** 当前连接字符串及密码已经进入源码和 Git 历史；仅删除当前文件中的密码并不能使旧密码失效。
2. **改用 `DATABASE_URL`。** 按[改用环境变量](#3-改用环境变量)中的方式修改 API，并在本地/Vercel 分别配置秘密值。
3. **升级存在漏洞的依赖。** 2026-08-12 执行 `npm audit` 报告 1 个 critical、3 个 high 风险，主要来自 Next.js 15.3.1 及其传递依赖；审计建议至少升级到修复版本 15.5.23。升级后应重新构建和回归测试。
4. **校验服务端输入。** 验证 `playerName` 类型、去除空白、限制长度，并验证 `score` 是合理的非负整数。客户端的 `maxLength` 不是安全边界。
5. **增加限流或挑战机制。** 当前任何人都可以直接调用 API 写入任意分数，可能污染数据或耗尽数据库/Vercel 免费额度。
6. **确认数据与隐私政策。** 页面加载了 Microsoft Clarity；公开部署前应根据目标地区和使用场景处理告知、同意和隐私政策。
7. **配置可重复的 lint。** 添加 ESLint 配置，使 `npm run lint` 能在 CI 中非交互执行。

## 当前验证结果

在 2026-08-12 基于锁文件安装依赖后：

- `npm run build`：通过；首页为静态输出，成绩 API 为动态服务端函数。
- TypeScript 检查：随生产构建通过。
- `npm run lint`：未完成，因为仓库还没有 ESLint 配置并会弹出初始化选项。
- `npm audit`：4 个风险（1 critical、3 high），上线前需要升级依赖并复查。

## 已知限制与后续方向

- 增加 `GET /api/scores` 和排行榜 UI
- 防止食物生成在蛇身上
- 增加暂停、触屏/移动端控制和响应式 Canvas
- 服务端计算或签名分数，降低客户端伪造成绩的风险
- 增加单元测试、游戏逻辑测试和 API 集成测试
- 将 Clarity 项目标识移入配置，并补充隐私说明
- 更新页面 title、description 和语言设置；当前仍保留 create-next-app 默认元数据

## License

仓库目前没有声明开源许可证。在添加许可证前，请不要默认其代码可被自由复制、修改或再分发。
