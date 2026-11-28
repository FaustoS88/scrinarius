import { useState, type ChangeEvent } from 'react';

export function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const upload = async () => {
    if (!file) {
      setMessage('No file selected');
      return;
    }
    setUploading(true);
    try {
      // Sent as multipart, as it is; the browser sets the Content-Type with its boundary
      const form = new FormData();
      form.append('title', file.name);
      form.append('file', file);
      const resp = await fetch('http://localhost:3000/search/index', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        throw new Error(`Upload failed: ${resp.statusText || `HTTP ${resp.status}`}`);
      }
      const body = await resp.json();
      setMessage(`Indexed with ID ${body.indexed}`);
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload">
      <h2>Upload a PDF</h2>
      <input type="file" accept="application/pdf" onChange={onFileChange} />
      <button onClick={upload} disabled={!file || uploading}>
        {uploading ? 'Uploading…' : 'Upload'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}