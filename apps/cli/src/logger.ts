export interface Logger {
  verboseEnabled: boolean;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  verbose(message: string): void;
}

export const createLogger = (verboseEnabled: boolean): Logger => {
  const format = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  };

  return {
    verboseEnabled,
    info: (message: string) => {
      process.stdout.write(`${format("INFO", message)}\n`);
    },
    warn: (message: string) => {
      process.stderr.write(`${format("WARN", message)}\n`);
    },
    error: (message: string) => {
      process.stderr.write(`${format("ERROR", message)}\n`);
    },
    verbose: (message: string) => {
      if (!verboseEnabled) {
        return;
      }
      process.stderr.write(`${format("DEBUG", message)}\n`);
    },
  };
};
