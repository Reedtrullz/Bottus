import 'dotenv/config';
import { NanoGateway, OllamaGateway } from './index.js';
import { SkillAdapter } from './adapters.js';

// Import existing skills
import { MemorySkill } from '../relay/skills/memory-skill.js';
import { CalendarSkillV2 } from '../relay/skills/calendar-skill-v2.js';
import { CalendarServiceV2 } from '../services/calendar-v2.js';

// Import handlers
import { HelpHandler } from '../relay/handlers/help.js';

async function main() {
  console.log('[Gateway] Starting NanoClaw Gateway...');
  
  // Create gateway
  const gateway = new NanoGateway();
  
  // Set up Ollama
  const ollama = new OllamaGateway();
  gateway.setOllama(ollama);
  
  // Register skills with adapters
  const skills = [
    new HelpHandler(),
    new MemorySkill(),
    new CalendarSkillV2(new CalendarServiceV2('./data/calendar-v2.db'))
  ];
  
  for (const skill of skills) {
    const adapter = new SkillAdapter(skill);
    gateway.registerSkill(adapter);
    console.log(`[Gateway] Registered skill: ${ (skill as any).name }`);
  }
  
  // Get token from environment
  const token = process.env.DISCORD_USER_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('[Gateway] ERROR: DISCORD_TOKEN not set');
    process.exit(1);
  }
  
  // Start gateway
  await gateway.start(token);
  console.log('[Gateway] Ready! Connected to Discord.');
}

main().catch(err => {
  console.error('[Gateway] Fatal error:', err);
  process.exit(1);
});
