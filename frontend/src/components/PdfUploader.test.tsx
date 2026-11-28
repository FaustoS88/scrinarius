import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PdfUploader } from './PdfUploader';

// Every request gets this answer
function answer(status: number, body: unknown, statusText = '') {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, statusText }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function upload(file: File) {
  const { container } = render(<PdfUploader />);
  fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pdf = new File(['%PDF-1.4 aardvark'], 'report.pdf', { type: 'application/pdf' });

it('posts the chosen PDF as multipart with its name and shows the id it was indexed with', async () => {
  const fetch = answer(201, { indexed: '42' });
  upload(pdf);

  expect(await screen.findByText('Indexed with ID 42')).toBeTruthy();
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://localhost:3000/search/index');
  expect(init.method).toBe('POST');
  // A Content-Type set by hand would lack the boundary the browser adds
  expect(init.headers).toBeUndefined();
  const form = init.body as FormData;
  expect(form.get('title')).toBe('report.pdf');
  expect(await (form.get('file') as File).text()).toBe('%PDF-1.4 aardvark');
});

it('shows why an upload failed', async () => {
  answer(413, { statusCode: 413, message: 'request entity too large' }, 'Payload Too Large');
  upload(pdf);

  expect(await screen.findByText('Error: Upload failed: Payload Too Large')).toBeTruthy();
});

it('keeps the button off until a file is chosen', () => {
  render(<PdfUploader />);

  expect((screen.getByRole('button', { name: 'Upload' }) as HTMLButtonElement).disabled).toBe(true);
});
