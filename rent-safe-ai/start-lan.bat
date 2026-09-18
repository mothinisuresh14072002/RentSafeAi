@echo off
setlocal
cd /d "%~dp0"

echo Starting RentSafeAI LAN deployment...
docker compose -f infra\docker\docker-compose.lan.yml up -d --build
if errorlevel 1 (
  echo Deployment failed. Check Docker Desktop and the output above.
  exit /b 1
)

echo.
echo RentSafeAI is starting.
echo Local: http://localhost
echo LAN:   http://YOUR-PC-IP
echo.
docker compose -f infra\docker\docker-compose.lan.yml ps
