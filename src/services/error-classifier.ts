export type ErrorCategory = 
  | 'network'
  | 'auth'
  | 'parsing'
  | 'skill'
  | 'external'
  | 'rate_limit'
  | 'timeout'
  | 'validation'
  | 'unknown';

export interface RecoveryStrategy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  useJitter: boolean;
  shouldRetry: boolean;
}

const DEFAULT_STRATEGIES: Record<ErrorCategory, RecoveryStrategy> = {
  network: {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    useJitter: true,
    shouldRetry: true,
  },
  auth: {
    maxRetries: 2,
    baseDelayMs: 500,
    backoffMultiplier: 1.5,
    useJitter: false,
    shouldRetry: true,
  },
  rate_limit: {
    maxRetries: 5,
    baseDelayMs: 1000,
    backoffMultiplier: 1,
    useJitter: false,
    shouldRetry: true,
  },
  timeout: {
    maxRetries: 2,
    baseDelayMs: 2000,
    backoffMultiplier: 2,
    useJitter: true,
    shouldRetry: true,
  },
  parsing: {
    maxRetries: 0,
    baseDelayMs: 0,
    backoffMultiplier: 1,
    useJitter: false,
    shouldRetry: false,
  },
  skill: {
    maxRetries: 2,
    baseDelayMs: 0,
    backoffMultiplier: 1,
    useJitter: false,
    shouldRetry: true,
  },
  external: {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    useJitter: true,
    shouldRetry: true,
  },
  validation: {
    maxRetries: 0,
    baseDelayMs: 0,
    backoffMultiplier: 1,
    useJitter: false,
    shouldRetry: false,
  },
  unknown: {
    maxRetries: 1,
    baseDelayMs: 1000,
    backoffMultiplier: 2,
    useJitter: true,
    shouldRetry: true,
  },
};

const ERROR_PATTERNS: Record<ErrorCategory, RegExp[]> = {
  network: [
    /ECONNREFUSED/,
    /ENOTFOUND/,
    /ETIMEDOUT/,
    /ECONNRESET/,
    /network\s+error/i,
    /connection\s+(refused|reset|timeout|timed?\s*out)/i,
    /fetch\s+failed/i,
    /socket\s+hang\s+up/i,
  ],
  auth: [
    /401\s+Unauthorized/,
    /403\s+Forbidden/,
    /authentication\s+(failed|error)/i,
    /invalid\s+(token|credentials)/i,
    /token\s+expired/i,
    /unauthorized/i,
    /permission\s+denied/i,
  ],
  rate_limit: [
    /429\s+Too\s+Many\s+Requests/,
    /rate\s+limit/i,
    /too\s+many\s+requests/i,
    /retry-?after/i,
    /rate\s+limited/i,
  ],
  timeout: [
    /timeout/i,
    /timed?\s*out/i,
    /took\s+too\s+long/i,
    /request\s+timeout/i,
    /abort/i,
  ],
  parsing: [
    /JSON\.parse/i,
    /unexpected\s+token/i,
    /invalid\s+json/i,
    /syntax\s+error/i,
    /cannot\s+parse/i,
    /parse\s+(error|failed)/i,
  ],
  skill: [
    /skill\s+not\s+found/i,
    /skill\s+error/i,
    /handler\s+failed/i,
    /skill\s+execution/i,
  ],
  external: [
    /ollama/i,
    /comfyui/i,
    /discord\s+api/i,
    /external\s+service/i,
    /api\s+error/i,
  ],
  validation: [
    /invalid\s+(input|argument|param)/i,
    /validation\s+failed/i,
    /required\s+field/i,
    /must\s+be\s+(string|number|boolean)/i,
    /invalid\s+format/i,
  ],
  unknown: [],
};

export class ErrorClassifier {
  classify(error: Error, context?: string): ErrorCategory {
    const errorMessage = error.message;
    const errorStack = error.stack || '';
    const combinedText = `${errorMessage} ${errorStack} ${context || ''}`.toLowerCase();

    for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (category === 'unknown') continue;
      
      for (const pattern of patterns) {
        if (pattern.test(combinedText)) {
          return category as ErrorCategory;
        }
      }
    }

    if (errorMessage.includes('fetch failed') || errorMessage.includes('connect ECONNREFUSED')) {
      return 'network';
    }

    if (errorMessage.includes('timeout') || error.name === 'AbortError') {
      return 'timeout';
    }

    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return 'parsing';
    }

    return 'unknown';
  }

  getStrategy(category: ErrorCategory): RecoveryStrategy {
    return { ...DEFAULT_STRATEGIES[category] };
  }

  getRetryAfterMs(error: Error): number | null {
    const match = error.message.match(/retry-?after\s*[:\s]*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10) * 1000;
    }

    const retryAfterMatch = error.message.match(/(\d+)\s*seconds?/i);
    if (retryAfterMatch) {
      return parseInt(retryAfterMatch[1], 10) * 1000;
    }

    return null;
  }
}

export function withJitter(delayMs: number): number {
  const jitter = delayMs * 0.3;
  return delayMs + Math.random() * jitter;
}
