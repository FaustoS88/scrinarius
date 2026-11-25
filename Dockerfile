# Dockerfile
FROM opensearchproject/opensearch:3.10.1
RUN /usr/share/opensearch/bin/opensearch-plugin install --batch ingest-attachment
# API keys (OpenSearch 3.7+) are off by default: turn them on before the security index is first created
RUN sed -i 's/^  dynamic:$/&\n    api_tokens:\n      enabled: true/' /usr/share/opensearch/config/opensearch-security/config.yml \
 && grep -q '^    api_tokens:$' /usr/share/opensearch/config/opensearch-security/config.yml
