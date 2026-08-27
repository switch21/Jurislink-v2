#!/bin/bash
cd "$(dirname "$0")"
# Bun loads .env from CWD, but parent .env may override.
# Explicitly export the correct DATABASE_URL from this dir's .env.
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi
exec bun index.ts
