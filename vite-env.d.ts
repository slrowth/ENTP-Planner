/// <reference types="vite/client" />

// Vite 환경변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
