#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then exec python3 server.py
elif command -v node >/dev/null 2>&1; then exec node server.mjs
else printf '%s\n' 'Perlu Python 3 atau Node.js 18+. Pasang salah satu terlebih dahulu.'; exit 1
fi
