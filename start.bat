@echo off
chcp 65001 >nul
title Openmgz
cd /d "%~dp0"
cls
echo ══════════════════════════════════════
echo    Openmgz - تشغيل سريع
echo ══════════════════════════════════════
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode

for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 goto oldnode

if exist .env goto havetoken
copy .env.example .env >nul

:havetoken
set TOKEN=
for /f "tokens=2 delims==" %%a in ('findstr /b "GITHUB_TOKEN=" .env') do set TOKEN=%%a
if not "%TOKEN%"=="" goto run

echo تحتاج توكن GitHub - مرة واحدة فقط.
echo.
echo 1^) سأفتح صفحة إنشاء التوكن الآن.
echo 2^) Repository access - Only select repositories - Openmgz
echo 3^) من Permissions فعّل:
echo      Contents  -- Read and write
echo      Actions   -- Read and write
echo      Workflows -- Read and write
echo 4^) Generate token ثم انسخه والصقه هنا.
echo.
start "" https://github.com/settings/personal-access-tokens/new
set /p TOKEN=الصق التوكن ثم Enter: 
node scripts\set-token.mjs "%TOKEN%"
if errorlevel 1 goto fail

:run
node -e "fetch('http://localhost:4400/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
if not errorlevel 1 (
  echo ✓ الخادم يعمل بالفعل - أفتح المتصفح.
  start "" http://localhost:4400
  pause
  exit /b 0
)

echo.
echo ✓ تشغيل الخادم... اترك هذه النافذة مفتوحة.
echo   من هذا الجهاز:  http://localhost:4400
echo   من الآيفون:     http://IP-جهازك:4400
echo.
start "" http://localhost:4400
node server.mjs
pause
exit /b 0

:nonode
echo Node.js غير مثبت.
echo سأفتح صفحة التنزيل - نزّل النسخة LTS وثبّتها ثم شغّل هذا الملف مرة أخرى.
start "" https://nodejs.org/en/download
pause
exit /b 1

:oldnode
echo نسخة Node قديمة. تحتاج 20 أو أحدث.
start "" https://nodejs.org/en/download
pause
exit /b 1

:fail
echo تعذّر حفظ التوكن.
pause
exit /b 1
