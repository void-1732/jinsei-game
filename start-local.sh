#!/bin/sh
cd "$(dirname "$0")" || exit 1
printf 'ゲームの起動先: http://127.0.0.1:8000\n'
exec python3 -m http.server 8000 --bind 127.0.0.1
