/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_GOOGLE_AI_KEY: string;
  readonly VITE_VERTEX_AI_KEY: string;
  readonly VITE_DEBUG_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
