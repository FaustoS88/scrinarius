import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import type { SearchHit } from './useSearch';

// The search waits 300 ms after typing, so findBy gets more than its default 1 s
configure({ asyncUtilTimeout: 2000 });

// Every request gets this answer
function answer(status: number, body: unknown, statusText = '') {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, statusText }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function search(query: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: query } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

const pdf: SearchHit = {
  _id: '1',
  _source: { title: 'report.pdf', attachment: { content: 'the aardvark sleeps', content_type: 'application/pdf; charset=UTF-8' } },
  highlight: { 'attachment.content': ['the <em>aardvark</em> sleeps'] },
};
const note: SearchHit = {
  _id: '2',
  _source: { title: 'Field notes', body: 'an aardvark at dusk' },
  highlight: { body: ['an <em>aardvark</em> at dusk'] },
};

it('shows each hit with its title, its type and the matched words marked', async () => {
  const fetch = answer(200, [pdf, note]);
  const { container } = render(<App />);
  search('aardvark');

  expect(await screen.findByText('report.pdf')).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/search?q=aardvark', expect.anything());
  const [first, second] = screen.getAllByRole('listitem');
  expect(first.querySelector('.type')?.textContent).toBe('PDF');
  expect(second.querySelector('.title')?.textContent).toBe('Field notes');
  expect(second.querySelector('.type')?.textContent).toBe('note');
  expect([...container.querySelectorAll('mark')].map(m => m.textContent)).toEqual(['aardvark', 'aardvark']);
  expect(first.querySelector('.snippet')?.textContent).toBe('the aardvark sleeps');
});

it('shows HTML inside a fragment as text, never as markup', async () => {
  const fragment = '<em>aardvark</em> <img src=x onerror=alert(1)>';
  answer(200, [{ ...pdf, highlight: { 'attachment.content': [fragment] } }]);
  const { container } = render(<App />);
  search('aardvark');

  expect(await screen.findByText('report.pdf')).toBeTruthy();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.snippet')?.textContent).toBe('aardvark <img src=x onerror=alert(1)>');
});

it('shows the start of the text, and Untitled, for a hit with no highlight and no title', async () => {
  answer(200, [{ _id: '3', _source: { body: `   ${'word '.repeat(50)}` } }]);
  const { container } = render(<App />);
  search('word');

  expect(await screen.findByText('Untitled')).toBeTruthy();
  expect(container.querySelector('.snippet')?.textContent).toBe('word '.repeat(50).trim().slice(0, 160));
});

it('says so when nothing matches', async () => {
  answer(200, []);
  render(<App />);
  search('zebra');

  expect(await screen.findByText('No matches.')).toBeTruthy();
});

it('shows why a search failed, instead of no matches', async () => {
  answer(500, { statusCode: 500, message: 'Internal server error' }, 'Internal Server Error');
  render(<App />);
  search('aardvark');

  expect((await screen.findByRole('alert')).textContent).toBe('Internal Server Error');
  expect(screen.queryByText('No matches.')).toBeNull();
});

it('opens on the search in the ?q= of the address', async () => {
  window.history.replaceState(null, '', '/?q=aardvark');
  const fetch = answer(200, [pdf]);
  render(<App />);

  expect((screen.getByRole('searchbox', { name: 'Search' }) as HTMLInputElement).value).toBe('aardvark');
  expect(await screen.findByText('report.pdf')).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});
