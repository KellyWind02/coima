# 赛马数据平台 — MVP 实现方案

> 状态：待确认后开工  
> 目标：历史赛马数据聚合与筛选，辅助投注研究；为策略中心预留扩展点。

---

## 1. 产品定位

| 项 | 结论 |
|----|------|
| 阶段 | MVP：数据展示 + 筛选 + 排序 |
| 用户 | 浏览器端研究用户，以桌面 1920×1080 为主 |
| 核心成功动作 | 选定日期/马名/场地 → 点击筛选 → 在表格中读到排位与赔率 |
| 非目标（本阶段） | 登录、投注、策略计算、爬虫入库流水线、实时赔率 |

后续扩展（架构需预留，本阶段不实现）：

- 策略中心（组合赔率计算）
- 更多筛选字段
- 近 5 场成绩深化、图表
- PostgreSQL 正式库 + 爬虫 ETL

---

## 2. 技术选型（建议）

采用需求中的**前后端分离**方案：

| 层 | 选型 | 理由 |
|----|------|------|
| 后端 | Python **FastAPI** | 轻量、类型友好、易接 PG |
| MVP 存储 | **JSON 种子文件** + 启动时加载到内存（或可选 SQLite） | 易清空、易替换、无 DB 运维成本 |
| 正式存储（后续） | **PostgreSQL** | 多场次、筛选索引、策略计算 |
| 前端 | **React + Vite + TypeScript** | 表格/筛选扩展性好；策略中心可加路由与模块 |
| 表格 | 自研轻量表格 或 TanStack Table | 排序、列扩展、行选中 |
| 样式 | CSS Modules / 普通 CSS + **page knobs** | 见 [design-brief.md](./design-brief.md) |

### 为何 MVP 推荐 JSON 而不是先上 PG？

需求明确：模拟数据会统一清空，之后才进 PG。因此：

1. **JSON 更合适作为 MVP 数据载体**：单文件、可整文件删除、diff 清晰、无迁移残留。
2. **API 契约按「未来 PG 表结构」设计**：前端只依赖 HTTP/JSON，不感知文件还是数据库。
3. **清理策略**：`data/seed/` 下种子可一键替换；提供 `POST /admin/reload`（仅本地）或启动脚本 `scripts/reset_data.sh`。
4. 若希望提前练 SQLite：可用同一 schema 灌入 SQLite，仍保留 JSON 为权威种子；**正式环境再迁 PG**。

详细模型见 [data-schema.md](./data-schema.md)。

### React 还是 Vue？

二者均可。本方案默认 **React + Vite + TS**。若你更熟 Vue 3，可改为 Vue + Vite，目录与 API 契约不变。请在确认清单中勾选。

---

## 3. 系统架构

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────┐
│  React (Vite)   │ ◄───────────────► │  FastAPI         │
│  / 数据页        │   GET /races…     │  routers/        │
│  /strategies*   │   GET /horses…    │  services/       │
│  (*后续)         │                   │  repositories/   │
└─────────────────┘                   └────────┬─────────┘
                                               │
                    MVP: read seed JSON ───────┤
                    Later: PostgreSQL ─────────┘
```

**扩展预留**：

- 前端：路由模块化（`pages/data`、`pages/strategies`），共享 `api/`、`types/`、筛选组件注册表。
- 后端：`Repository` 接口（`JsonRaceRepository` → `PgRaceRepository`），业务层不绑存储。
- 筛选：后端 `FilterSpec` + 前端 filter registry，MVP 只启用 date / horseName / venue。

---

## 4. 建议目录结构

```
coima/
├── docs/                          # 本文档
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI 入口、CORS
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routes/
│   │   │       ├── races.py       # 赛事/参赛记录查询
│   │   │       └── meta.py        # 马名补全、场地枚举、最近比赛日
│   │   ├── domain/
│   │   │   ├── models.py          # Pydantic 模型（与前端共享语义）
│   │   │   └── filters.py         # 可扩展 FilterSpec
│   │   ├── services/
│   │   │   └── race_query.py
│   │   └── repositories/
│   │       ├── base.py            # Protocol / ABC
│   │       └── json_repo.py       # MVP 实现
│   ├── data/
│   │   └── seed/
│   │       └── races.seed.json    # 模拟数据（可整文件清空）
│   ├── scripts/
│   │   ├── reset_data.sh          # 清空/恢复种子
│   │   └── validate_seed.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                # 路由壳：预留 /strategies
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── race.ts
│   │   ├── pages/
│   │   │   ├── data/
│   │   │   │   ├── DataPage.tsx
│   │   │   │   ├── data.knobs.css # 布局 knobs（设计规范）
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── RaceTable.tsx
│   │   │   │   └── filters/
│   │   │   │       ├── registry.ts  # 筛选器扩展注册表
│   │   │   │       ├── DateFilter.tsx
│   │   │   │       ├── HorseNameFilter.tsx
│   │   │   │       └── VenueFilter.tsx
│   │   │   └── strategies/        # 占位：后续策略中心
│   │   │       └── StrategiesPage.tsx
│   │   ├── components/
│   │   │   └── PageFooter.tsx
│   │   └── styles/
│   │       └── tokens.css         # 全局色板/字体
│   └── README.md
└── README.md
```

构建产物：`frontend` 用 Vite 产出 `dist/`；开发期前后端分离；可选由 FastAPI 挂载静态资源做单仓部署。

---

## 5. 功能范围（MVP）

### 5.1 数据展示

表格字段（列配置化，便于后续增列）：

| 字段 | 列 key | MVP |
|------|--------|-----|
| 赛事日期 | `raceDate` | ✅ |
| 场地 | `venue` | ✅（沙田 / 跑马地） |
| 场次 | `raceNo` | ✅ |
| 马号 | `horseNo` | ✅ |
| 马名 | `horseName` | ✅ |
| 骑师 | `jockey` | ✅ |
| 练马师 | `trainer` | ✅ |
| 负磅 | `weight` | ✅ |
| 档位 | `barrier` | ✅ |
| 独赢赔率 | `winOdds` | ✅（可空） |
| 位置赔率 | `placeOdds` | ✅（可空） |
| 连赢赔率 | `quinellaOdds` | ✅（可先单值或空） |
| 近 5 场成绩 | `recentForm` | ✅（有则显示） |

交互：

- 点击列头排序（升/降/取消）
- 行选中高亮
- 横向滚动保证桌面端多列可读

### 5.2 筛选

| 筛选项 | MVP | 扩展方式 |
|--------|-----|----------|
| 日期（默认最近有数据的一天） | ✅ | Filter registry |
| 马名（模糊 + 自动补全） | ✅ | 同上 |
| 场地（沙田 / 跑马地 / 全部） | ✅ | 同上 |
| 骑师 / 练马师 / 场次 / 赔率区间等 | ❌ 预留 | 注册新 Filter + API query 参数 |

行为：点击「筛选」按钮后刷新表格（不强制每次输入即时请求，避免抖动；补全可 debounce）。

### 5.3 界面文案

- 页面标题：**赛马数据平台**
- 页脚固定一行：`数据来源：历史数据整理 | 仅供研究参考`

设计细节见 [design-brief.md](./design-brief.md)。

### 5.4 模拟数据量（最低）

- ≥ 3 个不同日期  
- 2 个场地（沙田、跑马地）  
- ≥ 10 匹不同马名  
- 建议：每日期 1–2 场、每场 8–14 匹，便于表格与筛选联调  

---

## 6. API 草案（MVP）

基址：`http://localhost:8000/api/v1`

### `GET /meta/venues`

返回：`["沙田", "跑马地"]`

### `GET /meta/latest-race-date`

返回：`{ "raceDate": "2025-03-15" }`  
用途：日期选择器默认值。

### `GET /meta/horse-names?q=`

马名模糊补全，返回：`string[]`（上限如 20）。

### `GET /entries`

参赛记录列表（一行 = 一场赛事中的一匹马）。

Query（均可选，便于扩展）：

| 参数 | 说明 |
|------|------|
| `race_date` | `YYYY-MM-DD` |
| `horse_name` | 模糊匹配 |
| `venue` | `沙田` \| `跑马地` |
| `sort_by` | 列 key |
| `sort_dir` | `asc` \| `desc` |
| `jockey` / `trainer` / … | 预留，未实现时可忽略或 400 |

响应：

```json
{
  "total": 42,
  "items": [ /* EntryRow */ ]
}
```

`EntryRow` 字段与 [data-schema.md](./data-schema.md) 一致。

> 排序也可纯前端完成（MVP 数据量小）。建议：**MVP 前端排序**，API 先支持筛选；数据进 PG 后再把排序下沉到后端。

---

## 7. 实现阶段

| 阶段 | 内容 | 产出 |
|------|------|------|
| P0 | 确认方案（本文 + schema + brief） | 你勾选确认清单 |
| P1 | 后端：模型、JSON repo、meta/entries API、种子数据 | 可 curl 验证 |
| P2 | 前端：Design knobs + FilterBar + Table + Footer | 桌面可用页 |
| P3 | 联调：默认最近日、补全、排序、行高亮、空态 | MVP 可演示 |
| P4 | 注释、README、reset 脚本、扩展点注释 | 可交接 |

策略中心不在 MVP；仅加空路由/占位页，避免日后大拆。

---

## 8. 代码与注释约定

- 中文或中英双语注释均可，**关键扩展点必须注释**（筛选注册表、Repository 切换、列配置）。
- 类型优先：Pydantic + TypeScript 镜像字段名（camelCase 对外，或统一 snake_case——建议 API **camelCase** 方便前端，入库再映射）。
- 不引入未使用的重型 UI 库；表格交互保持可替换。

---

## 9. 本地运行（计划）

```bash
# 后端
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend && npm install && npm run dev
```

环境变量示例：`VITE_API_BASE=http://localhost:8000/api/v1`

---

## 10. 确认清单（开工前请回复）

请确认或修正以下项：

1. **前端框架**：React + Vite + TS（默认） / Vue 3 + Vite？
2. **MVP 存储**：仅 JSON 种子（推荐） / JSON + SQLite？
3. **API 字段命名**：camelCase / snake_case？
4. **排序位置**：MVP 前端排序（推荐） / 一开始就后端排序？
5. **设计 Brief**：[design-brief.md](./design-brief.md) 视觉方向是否认可？
6. **数据 Schema**：[data-schema.md](./data-schema.md) 字段与 JSON 结构是否认可？
7. **连赢赔率**：MVP 用单一 `quinellaOdds` 可空字段，还是拆成「开跑前 / 临场」两个字段（可先都空）？
8. **场地枚举**：是否固定「沙田」「跑马地」两值（与港马一致）？

确认后按 P1 → P4 实现。
