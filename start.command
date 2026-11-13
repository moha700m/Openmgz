#!/bin/bash
# Openmgz — double-click launcher for macOS / Linux.
set -u
cd "$(dirname "$0")" || exit 1
clear

pause() { echo; read -r -p "اضغط Enter للإغلاق…" _; }

echo "══════════════════════════════════════"
echo "   Openmgz — تشغيل سريع"
echo "══════════════════════════════════════"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js غير مثبت على هذا الجهاز."
  echo "  سأفتح صفحة التنزيل: نزّل النسخة LTS وثبّتها (Next… Next… Install)."
  open "https://nodejs.org/en/download" 2>/dev/null || xdg-open "https://nodejs.org/en/download" 2>/dev/null || true
  pause
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "✗ نسخة Node لديك قديمة ($(node -v)). تحتاج 20 أو أحدث."
  open "https://nodejs.org/en/download" 2>/dev/null || true
  pause
  exit 1
fi

[ -f .env ] || cp .env.example .env

TOKEN=$(node -e "try{const m=require('fs').readFileSync('.env','utf8').match(/^GITHUB_TOKEN=(.*)$/m);console.log(m?m[1].trim():'')}catch(e){console.log('')}")

if [ -z "$TOKEN" ]; then
  echo "تحتاج توكن GitHub — مرة واحدة فقط."
  echo
  echo "1) سأفتح لك صفحة إنشاء التوكن الآن."
  echo "2) اختر: Repository access → Only select repositories → Openmgz"
  echo "3) من Permissions فعّل:"
  echo "     • Contents        → Read and write"
  echo "     • Actions         → Read and write"
  echo "     • Workflows       → Read and write"
  echo "4) اضغط Generate token وانسخه، ثم الصقه هنا."
  echo
  open "https://github.com/settings/personal-access-tokens/new" 2>/dev/null || true
  read -r -p "الصق التوكن ثم Enter: " TOKEN
  if [ -z "$TOKEN" ]; then
    echo "لم يُدخل أي توكن."
    pause
    exit 1
  fi
  if ! node scripts/set-token.mjs "$TOKEN"; then
    pause
    exit 1
  fi
  echo "✓ حُفظ التوكن في .env (لن يُرفع إلى git)."
fi

if node -e "fetch('http://localhost:4400/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  echo "✓ الخادم يعمل بالفعل — أفتح المتصفح."
  open "http://localhost:4400" 2>/dev/null || xdg-open "http://localhost:4400" 2>/dev/null || true
  exit 0
fi

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo
echo "✓ تشغيل الخادم… اترك هذه النافذة مفتوحة."
echo "  من هذا الجهاز:  http://localhost:4400"
[ -n "${LAN_IP:-}" ] && echo "  من الآيفون:     http://$LAN_IP:4400"
echo
( sleep 2; open "http://localhost:4400" 2>/dev/null || xdg-open "http://localhost:4400" 2>/dev/null || true ) &
node server.mjs
pause
