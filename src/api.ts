// Single source of truth for the FastAPI backend origin.
//
// App.tsx/routeApi.ts used to point at http://127.0.0.1:8000 while the modals
// used http://localhost:8000. Those are two different origins as far as the
// browser is concerned, so CORS allow-lists and any cookie/session state had
// to be configured twice — and one of them was always the odd one out.
export const API_BASE = 'http://127.0.0.1:8000';
