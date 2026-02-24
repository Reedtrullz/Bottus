type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.formatEntry('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatEntry('warn', message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.formatEntry('error', message, context));
  }

  getRecent(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }
}

export const logger = new Logger();
