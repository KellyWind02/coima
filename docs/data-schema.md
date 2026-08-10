# 数据模型与存储方案

> 配合 [implementation-plan.md](./implementation-plan.md)  
> 原则：**种子可整批清空**；**字段对齐未来 PostgreSQL**；前端只消费 API。

---

## 1. JSON vs PostgreSQL（结论）

| 阶段 | 存储 | 清理方式 |
|------|------|----------|
| 当前前端原型 | `frontend/src/data/races.seed.json`（由前端直接读取） | 删除或覆盖该文件 |
| MVP API 联调（后续） | `backend/data/seed/races.seed.json` | 删除或覆盖该文件 + 重启/reload |
| 正式 | PostgreSQL | `TRUNCATE` / 迁移脚本；JSON 不再作为运行时源 |

**当前仅实现前端原型**：不创建后端、不连接数据库，浏览器直接加载 JSON 种子。数据量小（20–30 场）、会整体作废，JSON 可直接替换且无迁移残留。后续接 FastAPI 与 PostgreSQL 时，保留前端类型与 API 契约，只替换数据读取层。

---

## 2. 领域实体（未来表）

```
Race（赛事）1 ─── * Entry（参赛马，一行表格）
Horse（马）可选归一化；MVP 可在 Entry 内嵌马名
```

原型为减少复杂度，**种子文件以「扁平 Entry 列表」为主**，赛事字段冗余在每行；后续 ETL 可拆表。

---

## 3. Entry 行字段定义

前端类型与未来对外 API 固定使用 **camelCase**。

| 字段 | 类型 | 说明 | 可空 |
|------|------|------|------|
| `id` | string | 稳定主键，如 `2025-03-15-ST-03-07` | 否 |
| `raceDate` | string | `YYYY-MM-DD` | 否 |
| `venue` | `"沙田"` \| `"跑马地"` | 场地 | 否 |
| `venueCode` | `"ST"` \| `"HV"` | 可选，便于 id 与迁移 | 建议有 |
| `raceNo` | number | 场次 | 否 |
| `horseNo` | number | 马号 | 否 |
| `horseName` | string | 马名 | 否 |
| `jockey` | string | 骑师 | 否 |
| `trainer` | string | 练马师 | 否 |
| `weight` | number | 负磅（磅） | 否 |
| `barrier` | number | 档位 | 否 |
| `odds` | `OddsByBetType` | 赔率父级；按玩法与时点存放 | 是 |
| `recentForm` | string \| null | 近 5 场，如 `"2-5-1-3-4"` | 是 |
| `finishPosition` | number \| null | 名次；MVP 表格列，可空显示「—」 | 是 |

### `odds` 的层级模型

赔率不应以 `winOdds`、`placeOdds` 等平铺字段持续扩展。采用「**赔率 → 玩法 → 时点**」的对象结构：

```ts
type OddsMoment = {
  pre?: number | null;   // 开跑前
  final?: number | null; // 临场 / 最终
};

type OddsByBetType = {
  win?: OddsMoment;      // 独赢
  place?: OddsMoment;    // 位置
  quinella?: OddsMoment; // 连赢
  // 以后可显式增加：quinellaPlace、trio、firstFour ...
};
```

这种结构同时解决「其他赔率也可能有开跑前 / 临场值」的需求；前端表头可呈现为两级：父级「赔率」，子级如「独赢·开跑前」「独赢·临场」「位置·开跑前」等。原型首版默认展示每种玩法的 `final`，可通过列配置开启 `pre`，避免首屏过宽。

> 注意：真实的「连赢」是两匹马的组合市场，并非单匹马的天然属性。原型可先在当前行展示模拟值；接 PG 时，应将其迁到独立的 `marketOdds` 实体，并加入组合马号/马匹 ID。

业务字段优先显式增加，不用无约束的 `extras` 承载长期数据。

---

## 4. 种子 JSON 结构（建议）

原型文件：`frontend/src/data/races.seed.json`（后续 API 联调时可移动至 `backend/data/seed/races.seed.json`）

```json
{
  "version": 1,
  "generatedAt": "2026-08-05",
  "note": "MVP mock — safe to delete and replace. Will be wiped before PG cutover.",
  "venues": [
    { "code": "ST", "name": "沙田" },
    { "code": "HV", "name": "跑马地" }
  ],
  "entries": [
    {
      "id": "2025-03-15-ST-01-01",
      "raceDate": "2025-03-15",
      "venue": "沙田",
      "venueCode": "ST",
      "raceNo": 1,
      "horseNo": 1,
      "horseName": "示例骏马",
      "jockey": "潘顿",
      "trainer": "蔡约翰",
      "weight": 126,
      "barrier": 3,
      "odds": {
        "win": { "pre": 5.6, "final": 5.2 },
        "place": { "pre": 2.0, "final": 1.9 },
        "quinella": { "pre": null, "final": null }
      },
      "recentForm": "1-3-2-5-4",
      "finishPosition": 2
    }
  ]
}
```

原型校验可由 TypeScript 类型与轻量测试完成：检查 version、必填字段、venue 枚举、至少 3 日 / 2 场地 / 10 马名；后续再加入 `scripts/validate_seed.py`。

---

## 5. 清理与重置

```bash
# 原型：替换或删除前端种子文件后，刷新浏览器即可
cp frontend/src/data/races.seed.default.json frontend/src/data/races.seed.json
```

约定：

- **禁止**把不可再生的真实爬取数据只放在会被 reset 覆盖的种子路径而不备份。
- 切 PG 前：导出最终 JSON → ETL → `TRUNCATE` 应用表 → 改 `Repository` 实现与连接串。
- 仓库可加 `.gitignore`：`backend/data/local/`（本地实验库），种子默认文件可提交。

---

## 6. 未来 PostgreSQL 草表（参考）

```sql
CREATE TABLE races (
  id            TEXT PRIMARY KEY,
  race_date     DATE NOT NULL,
  venue_code    TEXT NOT NULL,
  venue_name    TEXT NOT NULL,
  race_no       INT NOT NULL,
  UNIQUE (race_date, venue_code, race_no)
);

CREATE TABLE entries (
  id               TEXT PRIMARY KEY,
  race_id          TEXT NOT NULL REFERENCES races(id),
  horse_no         INT NOT NULL,
  horse_name       TEXT NOT NULL,
  jockey           TEXT NOT NULL,
  trainer          TEXT NOT NULL,
  weight           NUMERIC NOT NULL,
  barrier          INT NOT NULL,
  win_odds         NUMERIC,
  place_odds       NUMERIC,
  quinella_odds    NUMERIC,
  odds_as_of       TEXT,
  recent_form      TEXT,
  finish_position  INT
);

CREATE INDEX idx_entries_horse_name ON entries (horse_name);
CREATE INDEX idx_races_date_venue ON races (race_date, venue_code);
```

JSON 扁平行可通过 `race_id = f"{date}-{venueCode}-{raceNo:02d}"` 聚合写入。

---

## 7. 筛选与查询语义

| 条件 | 语义 |
|------|------|
| `raceDate` | 精确匹配当天 |
| `horseName` | 子串模糊（大小写不敏感；中文直接包含） |
| `venue` | 精确匹配中文名，或缺省 = 全部 |
| 组合 | AND |

默认日期：`max(raceDate)` among seed entries。

---

## 8. 已确认与后续决策

- 前端原型使用扁平 `entries[]`、JSON 种子、camelCase；不接数据库。
- 场地枚举固定为「沙田」「跑马地」。
- 赔率使用父级 `odds` + 玩法/时点子级，不使用单一 `quinellaOdds`。
- `finishPosition` 进入 MVP 表格列；英文名与马匹代码可后续再加。
