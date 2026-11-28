#!/bin/sh
# Uploads the largest PDF the API takes, exactly 50 MiB, and finds it by a word of its text. Its base64 is about 70 million characters, past
# OpenSearch's default of 50 million in one string, so this fails if the compose file stops raising opensearch.xcontent.string.length.max.
set -eu
cd "$(dirname "$0")"
set -a; . ../.env; set +a
api=${API_URL:-http://localhost:3000}
id="large-$(date +%s)-$$"
pdf=$(mktemp)

cleanup() {
  rm -f "$pdf"
  curl -sk -o /dev/null -X DELETE -H "Authorization: ApiKey $OPENSEARCH_API_KEY" "https://localhost:9200/documents/_doc/$id?refresh"
}
trap cleanup EXIT

node large-pdf.mjs "$pdf" 52428800 quokka
curl -sS --fail-with-body "$api/search/index" -F "id=$id" -F title=large.pdf -F "file=@$pdf;type=application/pdf;filename=large.pdf"
echo
hits=$(curl -sSf "$api/search?q=quokka")

case $hits in *"\"_id\":\"$id\""*) ;; *) echo "large upload test failed: the large PDF $id was not found by its text" >&2; exit 1 ;; esac
echo "large upload test passed: $id, exactly 50 MiB, found by the text of its PDF"
