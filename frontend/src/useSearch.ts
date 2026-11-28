import { useState, useEffect } from 'react';
import { API_URL } from './api';

// One OpenSearch hit as the backend returns it
export interface SearchHit {
  _id: string;
  _source: {
    title?: string;
    body?: string;
    attachment?: { content?: string; content_type?: string };
  };
  highlight?: Record<string, string[]>;
}

// Searches `delay` ms after the query stops changing; a newer query aborts the older request
export function useSearch(query: string, delay = 300) {
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  // The query that results and error answer
  const [searched, setSearched] = useState('');

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      setSearched('');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(res => {
          // HTTP/2 and some proxies send no status text
          if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`);
          return res.json() as Promise<SearchHit[]>;
        })
        .then(data => {
          setResults(data);
          setError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearched(query);
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, delay]);

  // Worked out while rendering, not set in the effect, so the render that brings a new query already says loading
  const loading = query !== '' && query !== searched;
  return { results, error, loading };
}
