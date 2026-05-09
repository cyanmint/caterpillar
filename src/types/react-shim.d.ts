declare module 'react' {
  export interface ChangeEvent<T = Element> {
    target: T;
    currentTarget: T;
  }

  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<T>(initialValue: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];

  const React: {
    StrictMode: (props: { children?: unknown }) => unknown;
  };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(container: HTMLElement): { render(children: unknown): void };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
