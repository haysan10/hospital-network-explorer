#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 server.py
elif command -v node >/dev/null 2>&1; then
  node server.mjs
else
  echo "Perlu Python 3 atau Node.js 18+. Pasang salah satu, lalu jalankan kembali."
fi
read -r -p "Tekan Enter untuk menutup... "
