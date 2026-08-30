/// <reference types="vite/client" />

// Vite's client types declare the asset-import modules (`*.png`, `*.svg`, ...)
// that MapView.tsx relies on for the Leaflet marker icons. Without this
// reference `npm run lint` (tsc --noEmit) fails on those imports even though
// the dev server and build resolve them fine.
