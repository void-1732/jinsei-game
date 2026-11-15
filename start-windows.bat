@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ゲームの起動先: http://127.0.0.1:8000
echo この画面を閉じるとゲーム用のサーバーも停止します。
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 -m http.server 8000 --bind 127.0.0.1
) else (
  python -m http.server 8000 --bind 127.0.0.1
)
pause
