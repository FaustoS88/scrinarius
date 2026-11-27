#!/bin/sh
# Creates the backend's OpenSearch API key, writes it to .env without printing it, then revokes the previous one.
set -eu
umask 077
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
api=https://localhost:9200/_plugins/_security/api/apitokens
auth="admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD"
old_id="${OPENSEARCH_API_KEY_ID:-}"

resp=$(curl -sSfk -u "$auth" -X POST "$api" -H 'Content-Type: application/json' -d '{
  "name": "ts-fullstack-lab-backend-'"$(date +%Y%m%d%H%M%S)"'",
  "cluster_permissions": ["cluster:monitor/main", "indices:data/write/bulk"],
  "index_permissions": [{"index_pattern": ["documents"], "allowed_actions": ["crud", "manage"]}],
  "duration_seconds": 2592000
}') || { echo "OpenSearch refused the request: run it from the rebuilt image in a fresh container (docker compose down && docker compose up -d)" >&2; exit 1; }
id=$(printf '%s' "$resp" | sed -n 's/.*"id" *: *"\([^"]*\)".*/\1/p')
token=$(printf '%s' "$resp" | sed -n 's/.*"token" *: *"\([^"]*\)".*/\1/p')
[ -n "$id" ] && [ -n "$token" ] || { echo "unexpected response from OpenSearch, no key written" >&2; exit 1; }

grep -v '^OPENSEARCH_API_KEY' .env > .env.new || true
printf "OPENSEARCH_API_KEY='%s'\nOPENSEARCH_API_KEY_ID='%s'\n" "$token" "$id" >> .env.new
mv .env.new .env
echo "API key $id written to .env; it expires in 30 days"

if [ -n "$old_id" ]; then
  curl -sSfk -u "$auth" -X DELETE "$api/$old_id" >/dev/null || echo "previous key $old_id not revoked (already gone?)" >&2
fi
