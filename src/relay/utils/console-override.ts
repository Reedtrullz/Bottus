import { logger } from './logger.js';
// Redirect global console.error calls to the logger, avoiding recursion by using logger.info in logger.ts
console.error = (...args: any[]) => logger.error(...args);
