#!/bin/bash
set -e
source /docker-entrypoint/node-entrypoint.sh
install_npm_deps
exec npm exec -- ts-node-dev --respawn --transpile-only src/main.ts
