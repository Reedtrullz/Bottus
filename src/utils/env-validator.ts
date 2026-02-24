// Environment variable validator

export interface EnvConfig {
  DISCORD_TOKEN: string;
  OLLAMA_URL: string;
  COMFYUI_URL?: string;
  COMFYUI_MODEL?: string;
}

const REQUIRED_VARS: (keyof EnvConfig)[] = ['DISCORD_TOKEN', 'OLLAMA_URL'];
const OPTIONAL_VARS: (keyof EnvConfig)[] = ['COMFYUI_URL', 'COMFYUI_MODEL'];

export async function validateEnv(): Promise<EnvConfig> {
  const missing: string[] = [];
  
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please set these in your .env file.`
    );
  }
  
  const config: EnvConfig = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
    OLLAMA_URL: process.env.OLLAMA_URL!,
  };
  
  // Warn about optional vars
  const missingOptional: string[] = [];
  for (const varName of OPTIONAL_VARS) {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    } else {
      (config as any)[varName] = process.env[varName];
    }
  }
  
  if (missingOptional.length > 0) {
    console.warn(`[EnvValidator] Optional vars not set (will use defaults): ${missingOptional.join(', ')}`);
  }
  
  return config;
}

export default validateEnv;
