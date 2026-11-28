#!/bin/sh
# Uploads scripts/fixtures/sample.pdf through the backend, as the page does, then finds it by a word of its text.
set -eu
cd "$(dirname "$0")"
set -a; . ../.env; set +a
api=${API_URL:-http://localhost:3000}
id="smoke-$(date +%s)-$$"
text_id= twin_id=

# Deletes this run's documents at exit, so repeated runs do not pile up matches
cleanup() {
  for d in "$id" "$text_id" "$twin_id"; do
    [ -n "$d" ] || continue
    curl -sk -o /dev/null -X DELETE -H "Authorization: ApiKey $OPENSEARCH_API_KEY" "https://localhost:9200/documents/_doc/$d?refresh"
  done
}
trap cleanup EXIT

curl -sSf "$api/search/index" -F "id=$id" -F title=sample.pdf -F file=@fixtures/sample.pdf >/dev/null
# Two notes sent without an id: OpenSearch makes one for each, and the API answers with it
note() {
  curl -sSf -X POST "$api/search/index" -H 'Content-Type: application/json' \
    -d '{"title":"plain note","body":"an aardvark without a file"}' | sed -n 's/.*"indexed":"\([^"]*\)".*/\1/p'
}
text_id=$(note)
twin_id=$(note)
[ -n "$text_id" ] && [ -n "$twin_id" ] && [ "$twin_id" != "$text_id" ] || { echo "smoke test failed: two documents sent without an id did not get two ids" >&2; exit 1; }
hits=$(curl -sSf "$api/search?q=aardvark")

case $hits in *"\"_id\":\"$id\""*) ;; *) echo "smoke test failed: the PDF $id was not found by its text" >&2; exit 1 ;; esac
case $hits in *"\"_id\":\"$text_id\""*) ;; *) echo "smoke test failed: the document without a file was not found" >&2; exit 1 ;; esac
case $hits in *"\"_id\":\"$twin_id\""*) ;; *) echo "smoke test failed: the second document without an id was not found" >&2; exit 1 ;; esac
case $hits in *'"data":'*) echo "smoke test failed: search hits still carry the base64 file" >&2; exit 1 ;; esac
echo "smoke test passed: $id found by the text of its PDF"
