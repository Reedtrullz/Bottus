import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv, EnvConfig } from '../../src/utils/env-validator.js';

describe('validateEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return config when required vars are present', async () => {
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.OLLAMA_URL = 'http://localhost:11434';
    
    const result = await validateEnv();
    
    expect(result).toEqual({
      DISCORD_TOKEN: 'test-token',
      OLLAMA_URL: 'http://localhost:11434'
    });
  });

  it('should include optional vars when present', async () => {
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.OLLAMA_URL = 'http://localhost:11434';
    process.env.COMFYUI_URL = 'http://localhost:8188';
    process.env.COMFYUI_MODEL = 'sd15';
    
    const result = await validateEnv();
    
    expect(result).toEqual({
      DISCORD_TOKEN: 'test-token',
      OLLAMA_URL: 'http://localhost:11434',
      COMFYUI_URL: 'http://localhost:8188',
      COMFYUI_MODEL: 'sd15'
    });
  });

  it('should throw when DISCORD_TOKEN is missing', async () => {
    delete process.env.DISCORD_TOKEN;
    process.env.OLLAMA_URL = 'http://localhost:11434';
    
    expect(validateEnv()).rejects.toThrow('Missing required environment variables');
  });

  it('should throw when OLLAMA_URL is missing', async () => {
    process.env.DISCORD_TOKEN = 'test-token';
    delete process.env.OLLAMA_URL;
    
    expect(validateEnv()).rejects.toThrow('Missing required environment variables');
  });

  it('should throw when both required vars are missing', async () => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.OLLAMA_URL;
    
    expect(validateEnv()).rejects.toThrow('Missing required environment variables');
  });

  it('should warn about missing optional vars', async () => {
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.OLLAMA_URL = 'http://localhost:11434';
    delete process.env.COMFYUI_URL;
    delete process.env.COMFYUI_MODEL;
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    await validateEnv();
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Optional vars not set')
    );
    
    warnSpy.mockRestore();
  });
});
