#!/usr/bin/env bash
# 一键启动本地服务器
# 优先用附带的小型服务器 server.py（支持「自动获取网站名称」所需的 /_meta 代理）；
# 没有 server.py 时退回到 python 自带 http.server（图标仍可自动获取，名称需手填）。
# 用法：双击本文件，或终端执行 ./serve.sh [端口]
cd "$(dirname "$0")" || exit 1
PORT="${1:-8080}"
echo "meetab-oss 已启动：请用浏览器打开  http://localhost:${PORT}"
echo "（Ctrl+C 停止服务）"
if [ -f server.py ] && command -v python3 >/dev/null 2>&1; then
  PORT="$PORT" exec python3 server.py
elif command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "$PORT" .
else
  echo "未找到 python3 / python / npx，请先安装其一再运行。"
  exit 1
fi
