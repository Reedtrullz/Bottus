import * as fs from 'fs';
import * as path from 'path';

const PROPOSAL_QUEUE_PATH = './data/proposal_queue.json';

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

export async function pollForProposals(): Promise<StoredProposal[]> {
  const queue = loadQueue();
  return queue.filter(p => p.status === 'needs_ai' && !p.result);
}

export async function markProposalReady(proposalId: string, result: string): Promise<void> {
  const queue = loadQueue();
  const idx = queue.findIndex(p => p.id === proposalId);
  if (idx !== -1) {
    queue[idx].status = 'ready';
    queue[idx].result = result;
    queue[idx].executedAt = Date.now();
    saveQueue(queue);
    console.log(`✅ Marked proposal ${proposalId} as ready`);
  }
}

if (require.main === module) {
  console.log('🔍 Polling for proposals needing AI response...');
  setInterval(async () => {
    const proposals = await pollForProposals();
    if (proposals.length > 0) {
      console.log(`\n🎯 FOUND ${proposals.length} PROPOSAL(S) NEEDING AI:`);
      for (const p of proposals) {
        console.log(`   - "${p.originalText}"`);
        console.log(`     Status: ${p.status}`);
        console.log(`     Proposers: ${p.proposers.length}`);
      }
      console.log(`\n💡 Generate a response and call markProposalReady(id, response)`);
    }
  }, 5000);
}
