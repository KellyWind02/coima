# 赛马数据平台

基于 React + Vite + TypeScript 的前端设计原型。当前使用本地 JSON 种子数据，支持按日期、马名、场地筛选，表格排序及行高亮；后续数据层可替换为 FastAPI + PostgreSQL。

## 本地启停

服务固定监听 `127.0.0.1:43127`，仅供本机访问。

```bash
./scripts/app.sh start
./scripts/app.sh status
./scripts/app.sh restart
./scripts/app.sh stop
./scripts/app.sh logs
```

`start` 会在需要时安装依赖、执行生产构建，然后启动 Vite Preview。访问：

<http://127.0.0.1:43127>

## 开发模式

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

实现与数据设计说明见 [`docs/`](./docs/README.md)。
