#!/bin/sh
# Uploads scripts/fixtures/sample.pdf through the backend, as the page does, then finds it by a word of its text.
set -eu
cd "$(dirname "$0")"
set -a; . ../.env; set +a
api=${API_URL:-http://localhost:3000}
id="smoke-$(date +%s)-$$"

# Deletes this run's two documents at exit, so repeated runs do not pile up matches
cleanup() {
  for d in "$id" "$id-text"; do
    curl -sk -o /dev/null -X DELETE -H "Authorization: ApiKey $OPENSEARCH_API_KEY" "https://localhost:9200/documents/_doc/$d?refresh"
  done
}
trap cleanup EXIT

curl -sSf "$api/search/index" -F "id=$id" -F title=sample.pdf -F file=@fixtures/sample.pdf >/dev/null
curl -sSf -X POST "$api/search/index" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$id-text\",\"title\":\"plain note\",\"body\":\"an aardvark without a file\"}" >/dev/null
hits=$(curl -sSf "$api/search?q=aardvark")

case $hits in *"\"_id\":\"$id\""*) ;; *) echo "smoke test failed: the PDF $id was not found by its text" >&2; exit 1 ;; esac
case $hits in *"\"_id\":\"$id-text\""*) ;; *) echo "smoke test failed: the document without a file was not found" >&2; exit 1 ;; esac
case $hits in *'"data":'*) echo "smoke test failed: search hits still carry the base64 file" >&2; exit 1 ;; esac
echo "smoke test passed: $id found by the text of its PDF"
