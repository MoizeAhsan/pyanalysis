/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the backend when it is not the page's own origin. Usually unset. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
