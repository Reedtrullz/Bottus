const RELAY_CONTEXT = '[Relay]';

// Store original console methods BEFORE they get overridden by index.ts
const originalConsole = {
  error: console.error.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

const formatMessage = (context: string, ...args: unknown[]): string => {
  const timestamp = new Date().toISOString();
  const message = args
    .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  return `${timestamp} ${context} ${message}`;
};

export const logger = {
  error: (...args: unknown[]) => originalConsole.error(formatMessage(RELAY_CONTEXT, '[ERROR]', ...args)),
  info: (...args: unknown[]) => originalConsole.log(formatMessage(RELAY_CONTEXT, ...args)),
  warn: (...args: unknown[]) => originalConsole.warn(formatMessage(RELAY_CONTEXT, '[WARN]', ...args)),
};
