@echo off
cd /d "%~dp0"
py -3 -c "import sys; sys.exit(sys.version_info.major != 3)" >nul 2>&1
if %errorlevel% equ 0 (
  py -3 server.py
  goto selesai
)
python -c "import sys; sys.exit(sys.version_info.major != 3)" >nul 2>&1
if %errorlevel% equ 0 (
  python server.py
  goto selesai
)
where node >nul 2>&1
if %errorlevel% equ 0 (
  node server.mjs
  goto selesai
)
echo Perlu Python 3 atau Node.js 18+. Pasang salah satu lalu jalankan kembali.
:selesai
pause
