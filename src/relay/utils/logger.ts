const RELAY_CONTEXT = '[Relay]';

const formatMessage = (context: string, ...args: unknown[]): string => {
  const timestamp = new Date().toISOString();
  const message = args
    .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  return `${timestamp} ${context} ${message}`;
};

export const logger = {
  error: (...args: unknown[]) => console.error(formatMessage(RELAY_CONTEXT, '[ERROR]', ...args)),
  info: (...args: unknown[]) => console.log(formatMessage(RELAY_CONTEXT, ...args)),
  warn: (...args: unknown[]) => console.warn(formatMessage(RELAY_CONTEXT, '[WARN]', ...args)),
};
