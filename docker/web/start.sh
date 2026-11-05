#!/bin/sh
# Starts the Next.js dev server in the `web` container (see compose.yaml).
set -eu

# Install dependencies only when package-lock.json has changed since the last install.
hash=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.package-lock.sha256 2>/dev/null || true)" != "$hash" ]; then
  echo "Installing dependencies from package-lock.json..."
  npm ci --no-audit --no-fund
  echo "$hash" > node_modules/.package-lock.sha256
fi

exec npm run dev -- --hostname 0.0.0.0
