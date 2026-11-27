#!/bin/sh
# Creates the attachments ingest pipeline and the backend's OpenSearch API key, writes the key to .env without printing it, then revokes the previous one.
set -eu
umask 077
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
os=https://localhost:9200
api=$os/_plugins/_security/api/apitokens
auth="admin:$OPENSEARCH_INITIAL_ADMIN_PASSWORD"
old_id="${OPENSEARCH_API_KEY_ID:-}"

# The backend indexes through this pipeline: it extracts the text of the base64 file in `data`, then drops the base64
curl -sSfk -u "$auth" -X PUT "$os/_ingest/pipeline/attachments" -H 'Content-Type: application/json' -d '{
  "description": "Extract the text of an uploaded file, then drop the base64",
  "processors": [
    {"attachment": {"field": "data", "target_field": "attachment", "indexed_chars": 100000, "ignore_missing": true}},
    {"remove": {"field": "data", "ignore_missing": true}}
  ]
}' >/dev/null || { echo "OpenSearch refused the pipeline: is it up (docker compose up -d), with the password from .env?" >&2; exit 1; }
echo "ingest pipeline attachments ready"

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
