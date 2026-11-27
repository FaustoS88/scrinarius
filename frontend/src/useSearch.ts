import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(res => {
          if (!res.ok) throw new Error(res.statusText);
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
          if (!controller.signal.aborted) setLoading(false);
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, delay]);

  return { results, error, loading };
}
