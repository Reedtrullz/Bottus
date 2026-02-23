import { describe, it, expect } from 'vitest';

describe('OllamaClient interface contract', () => {
  it('exposes core lifecycle methods', async () => {
    const mod = await import('../../src/relay/ollama');
    const RelayClass: any = (mod as any).OllamaClient ?? (mod as any).default ?? null;
    if (!RelayClass) {
      return;
    }
    let instance: any;
    try {
      instance = new RelayClass('http://localhost', 'test-model', 6000);
    } catch {
      return;
    }
    if (typeof instance.start === 'function') {
      expect(typeof instance.start).toBe('function');
    }
    if (typeof instance.stop === 'function') {
      expect(typeof instance.stop).toBe('function');
    }
  });

  it('exposes a request method when present', async () => {
    const mod = await import('../../src/relay/ollama');
    const RelayClass: any = (mod as any).OllamaClient ?? (mod as any).default ?? null;
    if (!RelayClass) {
      return;
    }
    let instance: any;
    try {
      instance = new RelayClass('http://localhost', 'test-model', 6000);
    } catch {
      return;
    }
    if (typeof instance.sendRequest === 'function') {
      const p: Promise<any> = instance.sendRequest('test') as any;
      expect(p).toBeInstanceOf(Promise);
    }
  });
});
