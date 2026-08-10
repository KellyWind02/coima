# 赛马数据平台前端

React + Vite + TypeScript 设计原型。

## 数据替换边界

- 模拟数据：`src/data/races.seed.json`
- 类型定义：`src/types/race.ts`
- 数据访问接口：`src/data/dataSource.ts`

页面通过 `RaceDataSource` 获取数据。接入 FastAPI 时新增 API 实现，不要让页面组件直接调用 JSON 或 `fetch`。

## 布局调整

页面尺寸、间距、密度统一位于：

```text
src/pages/data/data.knobs.css
```

优先修改 knobs，避免在组件和样式中分散调整空间参数。
