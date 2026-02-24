export const logger = {
  error: (...args: any[]) => console.log('[ERROR]', ...args),
  info: (...args: any[]) => console.log(...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
};
