declare module '*.css';

declare module 'lucide-react' {
  export const Download: (props: Record<string, unknown>) => unknown;
  export const UploadCloud: (props: Record<string, unknown>) => unknown;
  export const HeartPulse: (props: Record<string, unknown>) => unknown;
  export const Trophy: (props: Record<string, unknown>) => unknown;
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module 'vite' {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}

declare const process: {
  env: Record<string, string | undefined>;
};

interface ImportMeta {
  env: { BASE_URL: string; VITE_API_BASE_URL?: string };
}
