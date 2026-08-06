# 数据模型与存储方案

> 配合 [implementation-plan.md](./implementation-plan.md)  
> 原则：**种子可整批清空**；**字段对齐未来 PostgreSQL**；前端只消费 API。

---

## 1. JSON vs PostgreSQL（结论）

| 阶段 | 存储 | 清理方式 |
|------|------|----------|
| MVP / 联调 | `backend/data/seed/races.seed.json` | 删除或覆盖该文件 + 重启/reload |
| 过渡（可选） | SQLite，由 JSON 灌入 | `rm *.db` + 重新 seed |
| 正式 | PostgreSQL | `TRUNCATE` / 迁移脚本；JSON 不再作为运行时源 |

**推荐 MVP 用 JSON**：数据量小（20–30 场）、会整体作废、希望「方便后续清理」。JSON 比过早引入 PG 更合适；API 与领域模型按表结构写好，迁库时只换 Repository。

---

## 2. 领域实体（未来表）

```
Race（赛事）1 ─── * Entry（参赛马，一行表格）
Horse（马）可选归一化；MVP 可在 Entry 内嵌马名
```

MVP 为减少复杂度，**种子文件以「扁平 Entry 列表」为主**，赛事字段冗余在每行；后续 ETL 可拆表。

---

## 3. Entry 行字段定义

对外 API / 前端 TypeScript 建议使用 **camelCase**（待确认）。

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
| `winOdds` | number \| null | 独赢 | 是 |
| `placeOdds` | number \| null | 位置 | 是 |
| `quinellaOdds` | number \| null | 连赢（MVP 单值） | 是 |
| `oddsAsOf` | `"pre"` \| `"final"` \| null | 赔率时点，可选 | 是 |
| `recentForm` | string \| null | 近 5 场，如 `"2-5-1-3-4"` | 是 |
| `finishPosition` | number \| null | 名次（研究用，可选） | 是 |

扩展字段不要散落：后续在对象上增加属性，或使用 `extras: Record<string, unknown>`（慎用；优先显式字段）。

---

## 4. 种子 JSON 结构（建议）

文件：`backend/data/seed/races.seed.json`

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
      "winOdds": 5.2,
      "placeOdds": 1.9,
      "quinellaOdds": null,
      "oddsAsOf": "final",
      "recentForm": "1-3-2-5-4",
      "finishPosition": 2
    }
  ]
}
```

校验：`scripts/validate_seed.py` 检查 version、必填字段、venue 枚举、至少 3 日 / 2 场地 / 10 马名。

---

## 5. 清理与重置

```bash
# 建议提供
./backend/scripts/reset_data.sh
# 行为：备份当前 seed（可选）→ 拷贝 fixtures/races.seed.default.json → 提示重启 API
```

约定：

- **禁止**把不可再生的真实爬取数据只放在会被 reset 覆盖的路径而不备份。
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
| `race_date` | 精确匹配当天 |
| `horse_name` | 子串模糊（大小写不敏感；中文直接包含） |
| `venue` | 精确匹配中文名，或缺省 = 全部 |
| 组合 | AND |

默认日期：`max(raceDate)` among seed entries。

---

## 8. 待你确认

1. 扁平 `entries[]` 是否接受（相对 races + nested runners）？  
2. `quinellaOdds` 单字段 vs `quinellaOddsPre` / `quinellaOddsFinal`？  
3. 是否需要 `finishPosition`（名次）进入 MVP 表格列？  
4. 马名是否需要英文名 / 马匹代码字段（可后续再加）？
