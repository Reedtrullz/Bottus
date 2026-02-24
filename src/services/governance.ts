import * as fs from 'fs';
import * as path from 'path';

const PROPOSAL_QUEUE_PATH = './data/proposal_queue.json';

// Simple hash function for proposal text normalization
function normalizeProposalText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[^\w\sæøåÆØÅ]/g, ''); // Remove special chars but keep spaces
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

interface StoredProposal {
  id: string;
  normalizedText: string;
  originalText: string;
  proposers: string[];
  status: 'pending' | 'needs_ai' | 'ready' | 'sent';
  createdAt: number;
  executedAt?: number;
  result?: string;
}

// In-memory store for proposals (loaded from queue)
const proposals = new Map<string, StoredProposal>();

function ensureQueueFile(): void {
  const dir = path.dirname(PROPOSAL_QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(PROPOSAL_QUEUE_PATH)) {
    fs.writeFileSync(PROPOSAL_QUEUE_PATH, JSON.stringify([], null, 2));
  }
}

function loadQueue(): StoredProposal[] {
  ensureQueueFile();
  try {
    const data = fs.readFileSync(PROPOSAL_QUEUE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveQueue(queue: StoredProposal[]): void {
  ensureQueueFile();
  fs.writeFileSync(PROPOSAL_QUEUE_PATH, JSON.stringify(queue, null, 2));
}

function getProposalByNormalized(normalizedText: string): StoredProposal | undefined {
  for (const proposal of proposals.values()) {
    if (proposal.normalizedText === normalizedText) {
      return proposal;
    }
  }
  return undefined;
}

export class GovernanceService {
  /**
   * Handle a proposal from a user.
   * If 2 different users propose the same thing -> execute immediately
   */
  async handleProposal(interaction: any): Promise<{ executed: boolean; message: string; proposalId?: string }> {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const proposalText = interaction.options?.getString('tekst') || 
                        interaction.options?.getString('text') ||
                        interaction.content?.replace('/propose', '').trim() ||
                        '';
    
    if (!proposalText) {
      return { executed: false, message: 'Vennligst gi et forslagstekst. Bruk: /propose <tekst>' };
    }

    const normalizedText = normalizeProposalText(proposalText);
    const proposalHash = hashText(normalizedText);
    
    // Check if this user already proposed something similar
    const existingProposal = getProposalByNormalized(normalizedText);
    
    if (existingProposal) {
      // User already proposed this
      if (existingProposal.proposers.includes(userId)) {
        return { 
          executed: false, 
          message: `Du har allerede foreslått: "${existingProposal.originalText}"\nVent på at andre skal støtte forslaget!`,
          proposalId: existingProposal.id
        };
      }
      
      // Add this user as a supporter
      existingProposal.proposers.push(userId);
      
      // Check if we now have 2 different proposers
      const uniqueProposers = [...new Set(existingProposal.proposers)];
      
      if (uniqueProposers.length >= 2) {
        // EXECUTE! Two people agree!
        existingProposal.status = 'needs_ai';
        console.log(`🎯 DEMOCRATIC APPROVAL: "${proposalText}" by ${uniqueProposers.length} users`);
        
        // Write to execution queue
        const queue = loadQueue();
        const idx = queue.findIndex(p => p.id === existingProposal.id);
        if (idx !== -1) {
          queue[idx].status = 'needs_ai';
        } else {
          queue.push(existingProposal);
        }
        saveQueue(queue);
        
        return { 
          executed: true, 
          message: `🎉 DEMOKRATISK GODKJENNING!\n\n"${proposalText}"\n\nForeslått av: ${uniqueProposers.length} personer\n\nUtfører forslaget...`,
          proposalId: existingProposal.id
        };
      }
      
      return { 
        executed: false, 
        message: `✅ Du støtter nå forslaget: "${proposalText}"\n\nNå har ${uniqueProposers.length}/2 støttet. Trenger ${2 - uniqueProposers.length} til!`,
        proposalId: existingProposal.id
      };
    }
    
    // New proposal
    const newProposal: StoredProposal = {
      id: proposalHash,
      normalizedText,
      originalText: proposalText,
      proposers: [userId],
      status: 'pending',
      createdAt: Date.now()
    };
    
    proposals.set(proposalHash, newProposal);
    
    // Also save to queue file
    const queue = loadQueue();
    queue.push(newProposal);
    saveQueue(queue);
    
    return { 
      executed: false, 
      message: `📝 Nytt forslag: "${proposalText}"\n\nForeslått av: ${username}\n\nTrenger 1 mer for å utføre!`,
      proposalId: newProposal.id
    };
  }
  
  /**
   * Get all pending proposals for display
   */
  listProposals(): string {
    const queue = loadQueue();
    const pending = queue.filter(p => p.status === 'pending');
    
    if (pending.length === 0) {
      return 'Ingen aktive forslag.';
    }
    
    return pending.map(p => 
      `• "${p.originalText}" (${p.proposers.length}/2 støttet)`
    ).join('\n');
  }
  
  /**
   * Get executed proposals (for this session to poll)
   */
  getExecutedProposals(): StoredProposal[] {
    const queue = loadQueue();
    return queue.filter(p => p.status === 'needs_ai');
  }
  
  /**
   * Handle a dictate command - single user, immediate AI processing
   */
  async handleDictate(interaction: any): Promise<{ message: string; proposalId: string }> {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const dictateText = interaction.options?.getString('tekst') || 
                       interaction.options?.getString('text') ||
                       interaction.content?.replace('/dictate', '').trim() ||
                       '';
    
    if (!dictateText) {
      return { message: 'Vennligst gi en instruks. Bruk: /dictate <tekst>', proposalId: '' };
    }

    const proposalId = 'dictate_' + Date.now() + '_' + userId;
    
    const newProposal: StoredProposal = {
      id: proposalId,
      normalizedText: dictateText.toLowerCase().trim(),
      originalText: dictateText,
      proposers: [userId],
      status: 'needs_ai',
      createdAt: Date.now()
    };
    
    const queue = loadQueue();
    queue.push(newProposal);
    saveQueue(queue);
    proposals.set(proposalId, newProposal);
    
    console.log(`📜 DICTATE from ${username}: "${dictateText}"`);
    
    return { 
      message: `📜 Motatt: "${dictateText}"\n\nGenererer respons...`,
      proposalId: newProposal.id
    };
  }
  
  /**
   * Poll for proposals where AI has generated a response
   * Call this periodically - sends ready results to Discord
   */
  async processReadyProposals(sendMessage: (msg: string) => Promise<void>): Promise<void> {
    const queue = loadQueue();
    const ready = queue.filter(p => p.status === 'ready' && p.result);
    
    for (const proposal of ready) {
      console.log(`📤 Sending AI response for: ${proposal.originalText}`);
      
      await sendMessage(proposal.result!);
      
      proposal.status = 'sent';
      saveQueue(queue);
    }
  }
}

// Export for use in other modules
export const governanceService = new GovernanceService();
