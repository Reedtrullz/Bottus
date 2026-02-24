#!/usr/bin/env node

/**
 * Discord Selfbot Client Wrapper for NanoBot
 * 
 * Handles Discord DM/Group DM communication using discord.js-selfbot-v13
 * Communicates with Python NanoBot via stdin/stdout JSONL protocol
 * 
 * Usage: node discord-client.js <user_token>
 */

import { Client } from 'discord.js-selfbot-v13';

const client = new Client({
  // Selfbot configuration
  checkUpdate: false,
});

let userId = '';
let username = '';
let ready = false;

const stdout = process.stdout;
const stderr = process.stderr;
const stdin = process.stdin;

let buffer = '';

/**
 * Send a message to Python via stdout
 */
function sendToPython(type, data) {
  const msg = JSON.stringify({ type, data });
  stdout.write(msg + '\n');
}

/**
 * Send an error to Python
 */
function sendError(message) {
  sendToPython('error', { message: String(message) });
}

/**
 * Parse incoming messages from Python (stdin)
 */
function handlePythonMessage(line) {
  try {
    const msg = JSON.parse(line);
    
    if (msg.type === 'send') {
      handleSendMessage(msg.data);
    } else if (msg.type === 'stop') {
      handleStop();
    } else if (msg.type === 'ping') {
      sendToPython('pong', {});
    }
  } catch (err) {
    console.error('[Discord] Failed to parse Python message:', err.message);
  }
}

/**
 * Handle send request from Python
 */
async function handleSendMessage(data) {
  const { channel_id, content, embed } = data;
  
  if (!channel_id || !content) {
    sendError('Missing channel_id or content');
    return;
  }
  
  try {
    const channel = client.channels.cache.get(channel_id);
    if (!channel) {
      sendError(`Channel not found: ${channel_id}`);
      return;
    }
    
    const payload = { content };
    if (embed) {
      payload.embed = embed;
    }
    
    await channel.send(payload);
    sendToPython('sent', { channel_id, success: true });
  } catch (err) {
    sendError(`Failed to send: ${err.message}`);
  }
}

/**
 * Handle stop request from Python
 */
function handleStop() {
  console.error('[Discord] Received stop signal');
  client.destroy();
  process.exit(0);
}

/**
 * Check if message is from a DM channel
 */
function isDM(msg) {
  return msg.channel.type === 1 || 
    (msg.channel.recipients !== undefined && msg.channel.type !== 2);
}

/**
 * Check if the bot was mentioned in the message
 */
function isMentioned(content) {
  if (!userId) return false;
  const mentionPattern = new RegExp(`<@!?${userId}>|@${username}`, 'i');
  return mentionPattern.test(content);
}

/**
 * Format and forward incoming Discord message to Python
 */
async function handleDiscordMessage(msg) {
  // Ignore bot messages
  if (msg.author.bot) return;
  
  const channelId = msg.channel.id;
  const senderId = msg.author.id;
  const senderName = msg.author.username;
  const content = msg.content || '';
  const messageId = msg.id;
  const timestamp = msg.createdAt.toISOString();
  
  // Only process DMs or messages where bot is mentioned
  const dm = isDM(msg);
  const mentioned = isMentioned(content);
  
  // Skip if not DM and not mentioned
  if (!dm && !mentioned) return;
  
  console.error(`[Discord] ${dm ? 'DM' : 'Mention'} from ${senderName}: ${content.substring(0, 50)}...`);
  
  // Determine channel type
  let isGroupDm = false;
  if (dm) {
    // Check if it's a group DM (has multiple recipients or name)
    isGroupDm = msg.channel.type === 3 || 
      (msg.channel.recipients && msg.channel.recipients.size > 1);
  }
  
  sendToPython('message', {
    channel_id: channelId,
    sender_id: senderId,
    sender_name: senderName,
    content: content,
    message_id: messageId,
    is_dm: dm,
    is_group_dm: isGroupDm,
    timestamp: timestamp,
  });
}

// Event Handlers

client.on('ready', () => {
  const user = client.user;
  userId = user?.id || '';
  username = user?.username || '';
  const discriminator = user?.discriminator || '';
  
  console.error(`[Discord] Logged in as ${username}#${discriminator} (ID: ${userId})`);
  
  ready = true;
  sendToPython('ready', {
    user_id: userId,
    username: username,
  });
});

client.on('message', handleDiscordMessage);

client.on('error', (err) => {
  console.error('[Discord] Client error:', err.message);
  sendError(err.message);
});

client.on('disconnect', () => {
  console.error('[Discord] Client disconnected');
  if (ready) {
    sendToPython('disconnected', {});
    ready = false;
  }
});

client.on('reconnecting', () => {
  console.error('[Discord] Client reconnecting...');
});

// IPC Setup

stdin.setEncoding('utf8');

stdin.on('data', (chunk) => {
  buffer += chunk;
  
  // Process line by line
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.substring(0, newlineIndex);
    buffer = buffer.substring(newlineIndex + 1);
    
    if (line.trim()) {
      handlePythonMessage(line);
    }
  }
});

stdin.on('end', () => {
  console.error('[Discord] stdin ended');
  handleStop();
});

// Startup

const token = process.argv[2];

if (!token) {
  console.error('Usage: node discord-client.js <user_token>');
  process.exit(1);
}

console.error('[Discord] Starting client...');

// Send startup acknowledgment
sendToPython('starting', {});

// Login
client.login(token).catch((err) => {
  console.error('[Discord] Login failed:', err.message);
  sendError(`Login failed: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('[Discord] Received SIGINT');
  handleStop();
});

process.on('SIGTERM', () => {
  console.error('[Discord] Received SIGTERM');
  handleStop();
});
