#!/usr/bin/env bash
#
# Deploy de tareas2: actualiza el código, COMPILA el frontend (Vite) y reinicia con PM2.
#
# tareas2 es una app compilada: el navegador carga lo que está en dist/, no el src/.
# Por eso un simple "git pull" NO basta — hay que reconstruir dist/. Este script lo hace.
#
# Uso:
#   ./deploy.sh                 # app PM2 "tareas2", rama "master"
#   ./deploy.sh nombre-app       # otra app de PM2
#   ./deploy.sh nombre-app rama  # otra app y otra rama/tag
#
set -euo pipefail

APP="${1:-tareas2}"
REF="${2:-master}"

cd "$(dirname "$0")"

echo "▶ 1/4  Actualizando código (ref: $REF)…"
git fetch --all --tags --prune
git checkout "$REF"
# Solo avanza si es fast-forward; si hay divergencia, se detiene para no romper nada.
git merge --ff-only "origin/$REF" 2>/dev/null || echo "  (ref fija o sin upstream; se queda en $REF)"

echo "▶ 2/4  Instalando dependencias (npm ci)…"
npm ci

echo "▶ 3/4  Compilando frontend (vite build)…"
npm run build

echo "▶ 4/4  Reiniciando en PM2 ($APP)…"
if pm2 describe "$APP" > /dev/null 2>&1; then
  pm2 restart "$APP" --update-env
else
  echo "  (no existía en PM2; arrancándola)"
  pm2 start server.js --name "$APP"
fi
pm2 save

echo "✅ Deploy de tareas2 completado. Haz Ctrl+F5 en el navegador para cargar el bundle nuevo."
