import { proposalDb } from '../db/index.js'
import { v4 as uuidv4 } from 'uuid'

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

  async createProposal(input: CodeProposal): Promise<CodeProposal> {
    // Generate a new ID if not provided
    const id = input.id ?? uuidv4()

    // Derive a title if not explicitly provided
    const derivedTitle = (input.title && input.title.trim().length > 0)
      ? input.title
      : (input.description?.split('\n')[0]?.trim() ?? 'Untitled Proposal')

    // Prepare payload for DB insertion. Use camelCase as per plan description,
    // while DB may map to snake_case internally.
    const payload: Partial<CodeProposal> = {
      id,
      guildId: input.guildId,
      proposerId: input.proposerId,
      title: derivedTitle,
      description: input.description,
      type: input.type ?? 'feature',
      status: input.status ?? 'pending',
    }

    // Persist to database
    const created: any = await (this.db as any).create?.(payload)

    // Attempt to map DB response back to CodeProposal format
    if (created && typeof created === 'object') {
      const mapped: CodeProposal = {
        id: created.id ?? id,
        guildId: created.guildId ?? created.guild_id ?? input.guildId,
        proposerId: created.proposerId ?? created.proposer_id ?? input.proposerId,
        title: created.title ?? derivedTitle,
        description: created.description ?? input.description,
        type: created.type ?? payload.type ?? 'feature',
        status: created.status ?? payload.status ?? 'pending',
        patchContent: created.patchContent ?? input.patchContent,
        testResults: created.testResults ?? input.testResults,
        githubPrUrl: created.githubPrUrl ?? input.githubPrUrl,
        githubBranch: created.githubBranch ?? input.githubBranch,
        approverId: created.approverId ?? input.approverId,
        rejectedBy: created.rejectedBy,
        rejectedReason: created.rejectedReason ?? input.rejectedReason,
        createdAt: created.createdAt ?? new Date().toISOString(),
        updatedAt: created.updatedAt ?? new Date().toISOString(),
        appliedAt: created.appliedAt,
      }
      return mapped
    }

    // Fallback: try to fetch the newly created proposal by ID
    const fetched = await this.getProposal(id)
    if (fetched) return fetched

    // Last resort: return a minimal CodeProposal instance
    return {
      id,
      guildId: input.guildId,
      proposerId: input.proposerId,
      title: derivedTitle,
      description: input.description,
      type: input.type ?? 'feature',
      status: input.status ?? 'pending',
    } as CodeProposal
  }
  abstract validateProposal(input: CodeProposal): boolean
  async approve(proposalId: string, approverId: string): Promise<CodeProposal | null> {
    // Load the existing proposal
    const existing = await this.getProposal(proposalId)
    if (!existing) {
      // If the proposal does not exist, return null as per spec
      return null
    }

    // Prepare update payload in DB-friendly (snake_case) form
    const payload = {
      id: proposalId,
      status: 'approved',
      approver_id: approverId,
      updatedAt: new Date().toISOString(),
    }

    // Persist the update
    await (this.db as any).update?.(payload)

    // Return the freshly updated proposal
    return this.getProposal(proposalId)
  }
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
