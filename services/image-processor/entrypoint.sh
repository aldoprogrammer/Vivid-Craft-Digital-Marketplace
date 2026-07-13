#!/bin/bash
set -e

install_pip_deps() {
  if python -c "import flask" 2>/dev/null; then
    echo "==> Python dependencies present, skipping pip install"
    return 0
  fi

  echo "==> Installing Python dependencies..."
  for attempt in 1 2 3 4 5; do
    if pip install --no-cache-dir -r requirements.txt; then
      echo "==> pip install succeeded"
      return 0
    fi
    echo "==> pip install failed (attempt ${attempt}/5), retrying in 15s..."
    sleep 15
  done

  echo "==> pip install failed after 5 attempts"
  exit 1
}

install_pip_deps
mkdir -p /app/output
exec flask --app app run --host=0.0.0.0 --port=5000 --debug
