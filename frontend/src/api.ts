// The API the page calls, fixed when the page is built; an empty VITE_API_URL falls back to the default, and a trailing slash is dropped
export const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');
