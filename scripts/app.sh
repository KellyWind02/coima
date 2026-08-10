#!/usr/bin/env bash

# 赛马数据平台本地进程管理脚本。
# 固定只监听本机 127.0.0.1:43127，避免暴露到局域网。

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/coima.pid"
LOG_FILE="$RUNTIME_DIR/coima.log"
HOST="127.0.0.1"
PORT="43127"
URL="http://$HOST:$PORT"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(<"$PID_FILE")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

ensure_runtime() {
  mkdir -p "$RUNTIME_DIR"
}

start_app() {
  ensure_runtime

  if is_running; then
    echo "赛马数据平台已在运行：$URL (PID $(<"$PID_FILE"))"
    return 0
  fi

  rm -f "$PID_FILE"

  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "无法启动：固定端口 $PORT 已被其他进程占用。" >&2
    return 1
  fi

  command -v node >/dev/null 2>&1 || {
    echo "无法启动：未找到 Node.js。" >&2
    return 1
  }
  command -v npm >/dev/null 2>&1 || {
    echo "无法启动：未找到 npm。" >&2
    return 1
  }

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "首次运行，正在安装依赖..."
    npm --prefix "$FRONTEND_DIR" install
  fi

  echo "正在构建前端..."
  npm --prefix "$FRONTEND_DIR" run build

  echo "正在启动 $URL ..."
  nohup node "$FRONTEND_DIR/node_modules/vite/bin/vite.js" preview "$FRONTEND_DIR" \
    --host "$HOST" \
    --port "$PORT" \
    --strictPort \
    >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_FILE"

  for _ in {1..30}; do
    if curl --silent --fail "$URL" >/dev/null 2>&1; then
      echo "启动成功：$URL (PID $pid)"
      echo "日志文件：$LOG_FILE"
      return 0
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
      echo "启动失败，日志如下：" >&2
      sed -n '1,120p' "$LOG_FILE" >&2
      rm -f "$PID_FILE"
      return 1
    fi
    sleep 0.2
  done

  echo "启动超时，请查看：$LOG_FILE" >&2
  kill "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  return 1
}

stop_app() {
  if ! is_running; then
    rm -f "$PID_FILE"
    echo "赛马数据平台未运行。"
    return 0
  fi

  local pid
  pid="$(<"$PID_FILE")"
  echo "正在停止 PID $pid ..."
  kill "$pid"

  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "已停止。"
      return 0
    fi
    sleep 0.25
  done

  echo "进程未及时退出，正在强制停止..."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "已停止。"
}

status_app() {
  if is_running; then
    echo "运行中：$URL (PID $(<"$PID_FILE"))"
  else
    rm -f "$PID_FILE"
    echo "未运行。"
    return 1
  fi
}

show_logs() {
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "暂无日志。"
    return 0
  fi
  tail -n 120 "$LOG_FILE"
}

case "${1:-}" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  restart)
    stop_app
    start_app
    ;;
  status)
    status_app
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "用法：$0 {start|stop|restart|status|logs}"
    exit 2
    ;;
esac
