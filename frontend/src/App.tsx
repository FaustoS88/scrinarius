import { useState } from 'react';
import './App.css';
import { useSearch, type SearchHit } from './useSearch';
import { PdfUploader } from './components/PdfUploader';

// Renders OpenSearch's <em> highlight tags as <mark> and everything else as plain text, never as HTML
function Snippet({ text }: { text: string }) {
  const parts = text.split(/<\/?em>/);
  return <>{parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}

function snippetOf(hit: SearchHit): string | undefined {
  const h = hit.highlight;
  const fragment = h?.['attachment.content']?.[0] ?? h?.body?.[0];
  if (fragment) return fragment;
  const text = hit._source.attachment?.content ?? hit._source.body;
  return text?.trim().slice(0, 160);
}

function fileType(hit: SearchHit): string {
  const type = hit._source.attachment?.content_type?.split(';')[0];
  if (!type) return 'note';
  return type === 'application/pdf' ? 'PDF' : type;
}

function App() {
  // A ?q= in the URL opens the page on that search
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const { results, error, loading } = useSearch(query);

  return (
    <main className="page">
      <header>
        <h1>scrinarius</h1>
        <p className="tagline">Upload PDFs and search their text.</p>
      </header>

      <PdfUploader />

      <input
        className="search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search the text of your PDFs"
        aria-label="Search"
      />

      <p className="status" role="status">
        {loading ? 'Searching…' : query && !error && results.length === 0 ? 'No matches.' : ''}
      </p>
      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}

      <ul className="results">
        {results.map(hit => {
          const snippet = snippetOf(hit);
          return (
            <li key={hit._id} className="result">
              <div className="result-head">
                <span className="title">{hit._source.title ?? 'Untitled'}</span>
                <span className="type">{fileType(hit)}</span>
              </div>
              {snippet && (
                <p className="snippet">
                  <Snippet text={snippet} />
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export default App;
