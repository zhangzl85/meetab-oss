@echo off
REM 一键启动本地服务器（等价于 python -m http.server 8080）
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=8080
echo meetab-oss 已启动：请用浏览器打开  http://localhost:%PORT%
echo （Ctrl+C 停止服务）
where python >nul 2>nul && (python -m http.server %PORT% & pause & goto :eof)
where python3 >nul 2>nul && (python3 -m http.server %PORT% & pause & goto :eof)
where npx >nul 2>nul && (npx --yes serve -l %PORT% . & pause & goto :eof)
echo 未找到 python / python3 / npx，请先安装其一再运行。
pause
