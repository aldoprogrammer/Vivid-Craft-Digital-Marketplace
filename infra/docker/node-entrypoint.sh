#!/bin/bash
set -e

install_npm_deps() {
  local needs_install=false

  if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    needs_install=true
  elif [ -f "package.json" ] && grep -q '"prisma"' package.json && [ ! -x "node_modules/.bin/prisma" ]; then
    needs_install=true
  elif [ -f "package.json" ] && [ "package.json" -nt "node_modules" ]; then
    needs_install=true
  fi

  if [ "$needs_install" = false ]; then
    echo "==> node_modules present, skipping npm install"
    return 0
  fi

  echo "==> Installing npm dependencies..."
  for attempt in 1 2 3 4 5; do
    if npm install --include=dev --no-audit --no-fund; then
      echo "==> npm install succeeded"
      return 0
    fi
    echo "==> npm install failed (attempt ${attempt}/5), retrying in 15s..."
    sleep 15
  done

  echo "==> npm install failed after 5 attempts"
  exit 1
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  install_npm_deps
  exec "$@"
fi
