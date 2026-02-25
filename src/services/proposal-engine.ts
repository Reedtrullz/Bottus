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
  async getProposal(id: string): Promise<CodeProposal | null> {
    type ProposalRow = {
      id: string
      guild_id: string
      proposer_id: string
      title: string
      description: string
      type: string
      status: string
      patch_content?: string
      test_results?: string
      github_pr_url?: string
      github_branch?: string
      approver_id?: string
      rejected_by?: string
      rejected_reason?: string
      created_at?: string
      updated_at?: string
      applied_at?: string
    }
    const row = await (this.db as unknown as { queryOne: (arg: { id: string }) => Promise<ProposalRow | null> }).queryOne({ id })
    if (!row) return null
    const mapped: CodeProposal = {
      id: row.id,
      guildId: row.guild_id,
      proposerId: row.proposer_id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      patchContent: row.patch_content,
      testResults: row.test_results,
      githubPrUrl: row.github_pr_url,
      githubBranch: row.github_branch,
      approverId: row.approver_id,
      rejectedBy: row.rejected_by,
      rejectedReason: row.rejected_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      appliedAt: row.applied_at,
    }
    return mapped
  }
  async listProposals(filter?: Record<string, unknown>): Promise<CodeProposal[]> {
    const hasFilter = !!(filter && Object.keys(filter).length > 0)
  type DbLike = {
      findPending?: () => Promise<unknown[]>
      queryAll?: () => Promise<unknown[]>
      findByStatus?: (status: string) => Promise<unknown[]>
    }
    const db = this.db as unknown as DbLike

  let rows: unknown[] = []
    if (!hasFilter) {
      if (typeof db.findPending === 'function') {
        rows = await db.findPending()
      } else if (typeof db.queryAll === 'function') {
        rows = await db.queryAll()
      }
  } else {
      const status = (filter as { status?: string }).status
      if (typeof db.findByStatus === 'function' && status !== undefined) {
        rows = await db.findByStatus(status)
      } else if (typeof db.queryAll === 'function') {
        rows = await db.queryAll()
        if (status !== undefined) {
          rows = (rows as { status?: string }[]).filter((r) => r.status === status)
        }
      }
    }
    if (!Array.isArray(rows)) {
      return []
    }
  const mapper = (this as unknown as { getProposal: (row: { [key: string]: unknown }) => CodeProposal }).getProposal
  return (rows as { [key: string]: unknown }[]).map((r) => mapper(r))
  }
}
