import { proposalDb } from '../db/index.js'

export interface CodeProposal {
  id: string
  guildId: string
  proposerId: string
  title: string
  description: string
  type: string
  status: string
  patchContent?: string
  testResults?: string
  githubPrUrl?: string
  githubBranch?: string
  approverId?: string
  rejectedBy?: string
  rejectedReason?: string
  createdAt?: string
  updatedAt?: string
  appliedAt?: string
}

export abstract class ProposalEngine {
  protected db = proposalDb
  constructor(db?: typeof proposalDb) {
    if (db) this.db = db
  }

  abstract createProposal(input: CodeProposal): Promise<CodeProposal>
  abstract validateProposal(input: CodeProposal): boolean
  abstract approve(proposalId: string, approverId: string): Promise<CodeProposal>
  abstract reject(proposalId: string, rejectedBy: string, reason: string): Promise<CodeProposal>
  abstract getProposal(id: string): Promise<CodeProposal | null>
  abstract listProposals(filter?: Record<string, any>): Promise<CodeProposal[]>
}
