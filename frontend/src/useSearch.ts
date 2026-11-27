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

// Custom hook to fetch and return search results with debouncing and cancellation
export function useSearch(query: string, delay = 300) {
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    // Debounce the fetch
    const handler = setTimeout(() => {
      const controller = new AbortController();
      setLoading(true);

      fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(res => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .then((data: SearchHit[]) => {
          setResults(data);
          setError(null);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            setError(err.message);
          }
        })
        .finally(() => setLoading(false));

      // Cleanup to abort fetch if query changes
      return () => controller.abort();
    }, delay);

    // Cleanup debounce timer on query change
    return () => clearTimeout(handler);
  }, [query, delay]);

  return { results, error, loading };
}
