# 赛马数据平台 — MVP 实现方案

> 状态：已确认，开始前端原型
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
| 当前原型 | **React + Vite + TypeScript** | 仅实现前端页面与交互 |
| 当前存储 | 前端内置 **JSON 种子文件** | 易清空、易替换、无 DB 运维成本 |
| 后端（后续） | Python **FastAPI** | 轻量、类型友好、易接 PG |
| 正式存储（后续） | **PostgreSQL** | 多场次、筛选索引、策略计算 |
| 表格 | 自研轻量表格 或 TanStack Table | 排序、列扩展、行选中 |
| 样式 | CSS Modules / 普通 CSS + **page knobs** | 见 [design-brief.md](./design-brief.md) |

### 为何 MVP 推荐 JSON 而不是先上 PG？

需求明确：当前只做前端原型，模拟数据会统一清空，之后才进 PG。因此：

1. **JSON 更合适作为 MVP 数据载体**：单文件、可整文件删除、diff 清晰、无迁移残留。
2. **类型契约按「未来 API / PG 表结构」设计**：原型先直接读取 JSON；接 API 后只替换数据访问层。
3. **清理策略**：替换或删除 `frontend/src/data/races.seed.json` 后刷新页面即可。
4. 不在本阶段引入 SQLite、FastAPI 或 PostgreSQL。

详细模型见 [data-schema.md](./data-schema.md)。

已确认前端使用 **React + Vite + TypeScript**。

---

## 3. 系统架构

```
┌───────────────────────────────────────┐
│ React + Vite                           │
│  数据研究页 → data/races.seed.json     │  当前：浏览器本地读取与前端排序
│  /strategies*                          │
└─────────────────┬─────────────────────┘
                  │ 后续替换数据访问层
┌─────────────────▼─────────────────────┐
│ FastAPI → PostgreSQL                   │
│ 筛选、排序、策略计算                   │
└───────────────────────────────────────┘
```

**扩展预留**：

- 前端：路由模块化（`pages/data`、`pages/strategies`），共享 `api/`、`types/`、筛选组件注册表。
- 前端：`dataSource` 接口（`localJsonDataSource` → `apiDataSource`），页面不直接耦合 JSON 文件。
- 筛选：前端 filter registry，当前只启用 date / horseName / venue；后续 API 追加同名查询参数。

---

## 4. 建议目录结构

```
coima/
├── docs/                          # 本文档
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                # 路由壳：预留 /strategies
│   │   ├── data/
│   │   │   ├── races.seed.json    # 原型数据（可整文件替换）
│   │   │   └── dataSource.ts      # JSON → API 的替换边界
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

构建产物：`frontend` 用 Vite 产出 `dist/`。当前可纯静态部署；后续可由 FastAPI 挂载静态资源。

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
| 名次 | `finishPosition` | ✅（可空，显示「—」） |
| 近 5 场成绩 | `recentForm` | ✅（有则显示） |
| 赔率 | `odds` | ✅；父级下按玩法与「开跑前 / 临场」展示，详见 schema |
| 马名 | `horseName` | ✅ |
| 骑师 | `jockey` | ✅ |
| 练马师 | `trainer` | ✅ |
| 负磅 | `weight` | ✅ |
| 档位 | `barrier` | ✅ |

交互：

- 「按场次聚合」开关：开启时按「日期 + 场地 + 场次」分组；关闭时平铺列表
- 聚合模式下组间固定为日期降序 → 场地 → 场次升序；组内默认名次升序（第 1 名在前）
- 点击列头：聚合时只改组内排序，平铺时对全部结果排序
- 行选中高亮
- 横向滚动保证桌面端多列可读

### 5.2 筛选

| 筛选项 | MVP | 扩展方式 |
|--------|-----|----------|
| 日期（可空，默认显示全部） | ✅ | Filter registry |
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

> 本节为后续 FastAPI API 契约；当前原型不请求后端，筛选与排序都在前端完成。

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
| `raceDate` | `YYYY-MM-DD` |
| `horseName` | 模糊匹配 |
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

> 当前原型由前端排序。接入 PostgreSQL 后，排序必须下沉到后端，以便按数据库索引和分页处理。

---

## 7. 实现阶段

| 阶段 | 内容 | 产出 |
|------|------|------|
| P0 | 已确认：本文 + schema + brief | 已完成 |
| P1 | 前端工程、JSON 种子、数据读取边界 | 可本地运行 |
| P2 | Design knobs + FilterBar + Table + Footer | 桌面可用页 |
| P3 | 日期可空默认全部、补全、前端排序、行高亮、空态 | 原型可演示 |
| P4 | 注释、README、扩展点注释 | 可交接 |

策略中心不在 MVP；仅加空路由/占位页，避免日后大拆。

---

## 8. 代码与注释约定

- 中文或中英双语注释均可，**关键扩展点必须注释**（筛选注册表、Repository 切换、列配置）。
- 类型优先：当前用 TypeScript 定义数据类型；未来 Pydantic 与 TypeScript 使用同一套 camelCase API 字段，入库再映射 snake_case。
- 不引入未使用的重型 UI 库；表格交互保持可替换。

---

## 9. 本地运行（计划）

```bash
# 固定在本机 127.0.0.1:43127
./scripts/app.sh start
./scripts/app.sh status
./scripts/app.sh restart
./scripts/app.sh stop
```

`start` 会安装缺失依赖、构建并启动预览服务。后续接 API 时再加入环境变量：`VITE_API_BASE=http://localhost:8000/api/v1`。

---

## 10. 已确认决策

- React + Vite + TypeScript。
- 当前仅前端原型，使用 JSON 种子；后续数据进入 PostgreSQL。
- 对外字段使用 camelCase。
- 当前前端排序；接 PostgreSQL 后改为后端排序。
- [design-brief.md](./design-brief.md) 与 [data-schema.md](./data-schema.md) 已认可。
- 场地固定为「沙田」「跑马地」。
- 赔率采用 `odds` 父级及「玩法 → 开跑前 / 临场」子级。
