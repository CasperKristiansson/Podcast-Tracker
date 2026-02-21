declare module "ink" {
  import type { ReactElement } from "react";
  import type React from "react";

  export interface Key {
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    return?: boolean;
    escape?: boolean;
    tab?: boolean;
    backspace?: boolean;
    delete?: boolean;
    ctrl?: boolean;
    meta?: boolean;
  }

  export const Box: React.ComponentType<Record<string, unknown>>;
  export const Text: React.ComponentType<Record<string, unknown>>;

  export const render: (tree: ReactElement) => {
    waitUntilExit(): Promise<void>;
    unmount(): void;
  };

  export const useInput: (
    handler: (input: string, key: Key) => void,
    options?: { isActive?: boolean }
  ) => void;

  export const useApp: () => {
    exit(error?: Error): void;
  };
}
