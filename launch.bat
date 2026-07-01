@echo off
REM ============================================================
REM  Kaelaxis Character Sheet - one-click launcher
REM  Starts a tiny local web server and opens the sheet in your
REM  default browser. Close this window to stop the server.
REM ============================================================
setlocal
cd /d "%~dp0"

set PORT=8770

echo.
echo   Kaelaxis - Wild Magic Sorcerer
echo   Starting local server on http://localhost:%PORT%
echo   (Close this window when you're done.)
echo.

REM Prefer the Python launcher (py), then python.
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/index.html"
  py -m http.server %PORT%
  goto :eof
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/index.html"
  python -m http.server %PORT%
  goto :eof
)

REM Fall back to Node if Python isn't available.
where npx >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/index.html"
  npx --yes http-server -p %PORT% -c-1 .
  goto :eof
)

echo Could not find Python or Node. Install Python from https://python.org
echo or open index.html through any local web server.
pause
