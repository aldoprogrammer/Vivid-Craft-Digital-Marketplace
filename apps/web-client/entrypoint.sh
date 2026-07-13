#!/bin/bash
set -e
source /docker-entrypoint/node-entrypoint.sh
install_npm_deps
exec npm run dev
