import { Client } from 'eris';
import { config } from 'dotenv';
import { initializeDatabase, suggestionsDb } from './db/index.js';
import { ConsentManager } from './services/consent.js';
import { MessageIngestion } from './services/ingestion.js';
import { ExtractionService } from './services/extraction.js';
import { CalendarServiceV2 } from './services/calendar-v2.js';
import { ReminderService } from './services/reminders.js';
import { DataRetentionService } from './services/retention.js';
import { ToneLearningService } from './services/tone.js';
import { AIService } from './services/ai.js';
import { governanceService } from './services/governance.js';
import { registerCommands } from './commands/index.js';
import { SisyphusLearner } from './scripts/sisyphus-learner.js';
import { startNightlyCron } from './scripts/nightly-cron.js';

config();

const token = (process.env.DISCORD_USER_TOKEN || process.env.DISCORD_BOT_TOKEN || '').trim();

const consentManager = new ConsentManager();
const extractionService = new ExtractionService();
const calendarService = new CalendarServiceV2('./data/calendar.db');
const reminderService = new ReminderService();
const retentionService = new DataRetentionService();
const toneLearningService = new ToneLearningService();
const aiService = new AIService();
const messageIngestion = new MessageIngestion(consentManager, extractionService, toneLearningService);

// Sisyphus self-improvement system
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';
const sisyphusLearner = new SisyphusLearner('./data/interactions.db', OLLAMA_URL, OLLAMA_MODEL, 50);

const processedMessages = new Set<string>();

function isTechStackQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const patterns = [
    'tech stack',
    'teknologi',
    'teknologistack',
    'hva kjører du på',
    'what technology',
    'which libraries',
    'which tech',
    'hvilke biblioteker'
  ];
  return patterns.some(p => m.includes(p));
}

function isFeaturesQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const patterns = [
    'hva kan du',
    'hva kan jeg',
    'what can you do',
    'hvilke kommandoer',
    'which commands',
    'features',
    'funksjoner'
  ];
  return patterns.some(p => m.includes(p));
}

const client = new Client(token, {
  intents: 32767, // All intents
});

// Discord wrapper for calendar service (provides sendMessage interface)
const discordWrapper = {
  sendMessage: async (channelId: string, message: string): Promise<any> => {
    const channel = client.getChannel(channelId);
    if (channel) {
      return (channel as any).createMessage(message);
    }
    console.error(`[Calendar] Channel not found: ${channelId}`);
    return null;
  }
};

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.username}#${client.user.discriminator}`);
  console.log(`   My User ID: ${client.user.id}`);
  
  await initializeDatabase();
  console.log('📦 Database initialized');
  
  await calendarService.initialize();
  calendarService.setDiscord(discordWrapper);
  console.log('📅 Calendar service initialized');
  
  // Initialize and start Sisyphus self-improvement nightly cron
  await sisyphusLearner.initialize();
  startNightlyCron(sisyphusLearner, 3, 0); // Run at 03:00 daily
  
  await registerCommands(client);
  
  retentionService.start();
  reminderService.start();
  console.log('🔄 Background services started');
  
  // Poll for mentions and respond with AI only
  setInterval(async () => {
    try {
      const channel = client.getChannel('1178146867540930601');
      if (channel) {
        const messages = await (channel as any).getMessages(10);
        const myId = client.user.id;
        const myName = client.user.username;
        
        for (const msg of messages.slice(-5).reverse()) {
          const content = msg.content || '';
          const isMentioned = content.includes(`<@${myId}>`) || 
                            content.includes(`<@!${myId}>`) ||
                            content.includes(`@${myName}`);
          
          if (isMentioned && !processedMessages.has(msg.id) && !msg.author.bot) {
            processedMessages.add(msg.id);
            console.log(`📣 MENTION from ${msg.author.username}: ${content}`);
            
            const response = await aiService.generateResponse(content, msg.author.username);
            await (channel as any).createMessage(response);
            console.log(`📤 AI Response sent`);
          }
        }
      }
    } catch (e) {
      console.log(`Error: ${e}`);
    }
  }, 5000);
  
  // Poll for democratic proposals and send AI responses to Discord
  const GROUP_DM_CHANNEL_ID = '1178146867540930601';
  setInterval(async () => {
    try {
      const channel = client.getChannel(GROUP_DM_CHANNEL_ID);
      if (!channel) return;
      
      await governanceService.processReadyProposals(async (result: string) => {
        await (channel as any).createMessage(result);
        console.log(`📤 AI response sent to Discord`);
      });
    } catch (e) {
      console.log(`Proposal poll error: ${e}`);
    }
  }, 10000);
});

client.on('newGuild', (guild: any) => {
  console.log(`➕ Joined new guild: ${guild.name}`);
});

client.on('guildCreate', (guild: any) => {
  console.log(`➕ Guild created/joined: ${guild.name}`);
});

client.on('messageCreate', (msg: any) => {
  console.log('📩 NEW MESSAGE!');
  console.log(`   Author: ${msg.author?.username}`);
  console.log(`   Content: ${msg.content}`);
});

client.on('messageCreate', async (msg: any) => {
  console.log(`📩 [${msg.channel.type}] ${msg.author.username}: ${msg.content?.substring(0, 80)}`);
  
  if (msg.author.bot) return;
  
  const userMessage = msg.content?.replace(/<@!?\d+>/g, '').replace(/@inebotten/gi, '').trim() || '';
  
  if (isTechStackQuery(userMessage)) {
    const lines = [
      '📦 **Teknologistack / Tech Stack**',
      '',
      '💻 **Language & Runtime:** TypeScript (ES Modules), Node.js 18+',
      '💬 **Discord:** Eris, discord.js-selfbot-v13',
      '🤖 **AI / LLM:** Ollama (mistral:7b-instruct)',
      '🗄️ **Database:** SQLite via sql.js',
      '📅 **Date Handling:** date-fns, chrono-node',
      '🐳 **Infrastructure:** Docker',
    ];
    await msg.channel.createMessage(lines.join('\n'));
    return;
  }
  
  if (isFeaturesQuery(userMessage)) {
    const lines = [
      '🎯 **Hva jeg kan gjøre / What I can do**',
      '',
      '📅 **Kalender / Calendar**',
      '• "@inebotten hva har vi planlagt?" - Vis ukesplan',
      '• "@inebotten når er møte?" - Spør om spesifikk hendelse',
      '• /kalender - Vis kalender (uke/måned)',
      '',
      '💾 **Minner / Memory**',
      '• "@inebotten husk at jeg liker pizza" - Lagre fakta',
      '• "@inebotten hva husker du om meg?" - Hent minner',
      '',
      '🔄 **Gjentakende hendelser**',
      '• "Møte hver torsdag kl 14" - Opprett gjentakende',
      '',
      '✅ **RSVP**',
      '• Reager på hendelser med ✅/❌/🤔',
      '• "@inebotten hvem kommer?" - Se deltakere',
      '',
      '📊 **Avstemninger / Polls**',
      '• "@inebotten finn en tid for møte" - Tidsavstemning',
      '',
      '🖼️ **Teknisk info**',
      '• "@inebotten hva kjører du på?" - Tech stack',
    ];
    await msg.channel.createMessage(lines.join('\n'));
    return;
  }
  
  await messageIngestion.process(msg);
});

client.on('any', (event: any) => {
  if (event.t === 'MESSAGE_CREATE') {
    console.log('📨 Caught MESSAGE_CREATE event');
  }
});

client.on('raw', (packet: any) => {
  if (packet.t === 'MESSAGE_CREATE') {
    console.log('📨 Raw MESSAGE_CREATE:', packet.d.content?.substring(0, 50));
  }
});

client.on('interactionCreate', async (interaction: any) => {
  console.log('🔧 Interaction received:', JSON.stringify(interaction.data, null, 2));
  if (!interaction.data?.name) return;
  
  const cmd = interaction.data.name;
  
  switch (cmd) {
    case 'jeg-samtykker':
      await consentManager.handleOptIn(interaction);
      break;
    case 'jeg-tilbakekall':
      await consentManager.handleRevocation(interaction);
      break;
    case 'kalender':
      await calendarService.handleCalendarCommand(interaction);
      break;
    case 'oppgaver':
      await reminderService.handleTasksCommand(interaction);
      break;
    case 'propose':
    case 'forslag': {
      const result = await governanceService.handleProposal(interaction);
      await interaction.reply({
        content: result.message,
        ephemeral: false
      });
      break;
    }
    case 'dictate':
    case 'diktér': {
      const result = await governanceService.handleDictate(interaction);
      await interaction.reply({
        content: result.message,
        ephemeral: false
      });
      break;
    }
    case 'godkjenn': {
      const suggestionId = interaction.data?.options?.find((o: any) => o.name === 'id')?.value;
      if (!suggestionId) {
        const pending = suggestionsDb.getPending();
        if (pending.length === 0) {
          await interaction.reply({ content: 'Ingen ventende forbedringsforslag.', ephemeral: true });
        } else {
          const lines = ['📋 Ventende forbedringsforslag:', ''];
          for (const s of pending) {
            lines.push(`- ${s.id.slice(0, 8)} [${s.category}] ${s.description.substring(0, 50)} (${s.effort_estimate})`);
          }
          await interaction.reply({ content: lines.join('\n'), ephemeral: true });
        }
      } else {
        suggestionsDb.approve(suggestionId, interaction.member?.id || 'unknown');
        await interaction.reply({ content: `✅ Forslag ${suggestionId.slice(0, 8)} godkjent!`, ephemeral: false });
      }
      break;
    }
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  retentionService.stop();
  reminderService.stop();
  client.disconnect({ reconnect: false });
  process.exit(0);
});

if (!token) {
  console.error('❌ No token found');
  process.exit(1);
}

client.connect();

client.on('error', (err: any) => {
  console.error('❌ Client error:', err.message);
});

client.on('warn', (info: any) => {
  console.log('⚠️ Warning:', info);
});
