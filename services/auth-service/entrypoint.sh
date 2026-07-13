#!/bin/bash
set -e
source /docker-entrypoint/node-entrypoint.sh
install_npm_deps

echo "==> VividCraft Auth Service: Syncing Prisma schema..."
npm exec -- prisma db push --accept-data-loss
npm exec -- prisma generate

echo "==> Starting NestJS in watch mode..."
exec npm exec -- ts-node-dev --respawn --transpile-only src/main.ts
