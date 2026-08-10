# Design Brief — 赛马数据平台（数据研究页）

> 依据 `.cursor/skills/frontend-page-design`：先 Brief，确认后再写 UI。  
> 页面类型：**密集操作型列表**（非营销落地页）——表格优先，氛围克制。

---

## Job

- **Primary job-to-be-done**：按日期 / 马名 / 场地筛出历史参赛与赔率，辅助研究。
- **Primary CTA / success action**：点击「筛选」，表格更新为匹配结果。
- **Out of scope（本 pass）**：后端 / 数据库、策略中心、图表、投注、暗色主题切换、移动端极致体验。

---

## Users & habits

- **Who**：熟悉港马术语的研究用户（非大众营销访客）。
- **Frequency / device / context**：高频扫表；桌面 1920×1080 为主，浏览器。
- **Scan vs deep-read**：以扫行为主，偶发盯某一字段对比。
- **Conventions**：顶部筛选 + 下方宽表；列头排序；选中行高亮；页脚免责声明。

---

## Data characteristics

- **Entities**：扁平参赛行（日期 × 场地 × 场次 × 马）。
- **Density**：**dense**（多列、多行）。
- **Critical fields（无点击可见）**：日期、场地、场次、马号、马名、名次，以及赔率组中的独赢 / 位置临场值。
- **States**：loading（表头骨架行）、empty（无匹配 + 提示放宽条件）、error（重试）、partial（赔率 null 显示「—」）。
- **Trust**：页脚「历史数据整理 | 仅供研究参考」；不伪造实时感。

---

## Hierarchy（first 3 seconds）

1. 品牌/产品名 **赛马数据平台**（页头一级，非弱化 nav 字）。
2. 筛选区（日期默认可空，显示全部；一眼可改）。
3. 数据表首屏行（立即进入阅读，无营销英雄区堆砌）。

---

## Section map（ordered, one job each）

| # | Section | Job | Main component | Notes |
|---|---------|-----|----------------|-------|
| 1 | Header | 建立产品身份 | 标题 + 极简说明一句 | 无导航堆砌；策略入口可后续弱链 |
| 2 | Filter bar | 设定查询条件 | 日期 / 马名 / 场地 + 筛选按钮 | 与表区分隔清晰；可 sticky |
| 3 | Results table | 阅读与排序对比 | 可排序表 + 行选中 + 两级赔率表头 | 主视觉＝数据本身 |
| 4 | Footer | 来源与免责 | 单行文案 | 固定底或文档流末尾 |

不使用卡片包裹筛选或表格（除非交互容器必要）；不用 stat 条、图标行、促销 pill。

---

## Layout composition

- **First viewport**：Header + Filter + 表头与若干行（一体「研究台」构图，非 dashboard 小部件墙）。
- **Grid**：单列主栏，`max-width` 接近满宽桌面（约 1600–1800px 内容区），左右 gutter。
- **Breakpoint**：`lg` 完整多列表；`md` 以下表横向滚动，筛选控件折行，不缩小成营销拼贴。
- **赔率列层级**：以「赔率」为父级，按「独赢 / 位置 / 连赢」分组；每种玩法有「开跑前 / 临场」子列。原型默认展示独赢与位置的临场列，其余子列通过列配置启用，避免表格首屏过宽。

---

## Visual direction

- **Atmosphere**：浅色阅读底 + **极淡**纵向噪声或冷灰渐变（克制）；主锚点是表格内容，不是装饰图。
- **Type pairing**：
  - Display / 标题：如 **Source Serif 4** 或 **IBM Plex Serif**（产品名）
  - Body / 表：如 **IBM Plex Sans** 或 **Noto Sans SC**（数字与中文清晰）
  - 避免 Inter / Roboto / Arial / 系统默认作为展示字体
- **Color intent（CSS vars）**：
  - `--bg` 浅冷灰白
  - `--surface` 筛选条与表头略区分
  - `--text` / `--text-muted`
  - `--border` 细线分隔
  - `--accent` 低饱和青绿或墨绿（筛选主按钮、选中行左边线）——**避免**紫靛渐变、奶油+陶土、报纸细线密排、大面积 glow
- **Motion（2–3）**：
  1. 筛选提交后表格 opacity / 轻微 translate 过渡
  2. 行选中背景过渡
  3. 排序指示三角旋转/显隐
- **Explicit avoid**：紫系主题、卡片栅格、hero 大图、首屏统计条、圆角大 pill 标签墙、暗色默认。

---

## Knob inventory

文件计划：`frontend/src/pages/data/data.knobs.css`，挂在 `[data-page="race-data"]`。

| Knob | 控制 | 建议范围 |
|------|------|----------|
| `--page-max-width` | 主栏最大宽 | 1400–1840px |
| `--page-gutter` | 左右边距 | 16–32px |
| `--section-gap` | Header→Filter→Table 间距 | 16–32px |
| `--header-pad-block` | 页头上下内边距 | 20–40px |
| `--title-size` | 产品名字号 | 1.75–2.25rem |
| `--filter-bar-pad` | 筛选区内边距 | 12–20px |
| `--filter-gap` | 筛控件间距 | 8–16px |
| `--control-height` | 输入/按钮高度 | 36–44px |
| `--filter-sticky-top` | sticky 偏移 | 0–16px |
| `--table-row-height` | 行高密度 | 36–48px |
| `--table-cell-pad-x` | 单元格水平 padding | 8–14px |
| `--table-font-size` | 表文字 | 0.8125–0.9375rem |
| `--selected-row-bg` | 选中行背景 | token 色 |
| `--motion-fast` / `--motion-med` | 过渡时长 | 120–280ms |

密度模式可选：`[data-density="compact"]` 下调 row-height / font-size。

---

## 已确认与待后续迭代

- 已确认：浅色冷灰 + 低饱和绿强调、密集表格优先，以及 `赔率 → 玩法 → 时点` 的表头层级。
- 当前原型只读取前端 JSON，筛选和排序均在浏览器执行。
- 原型默认使用「历史赛事与赔率检索」作为短副标题，筛选条在桌面端 sticky。
- 策略中心暂不显示入口；等待实际功能进入范围后再增加。
