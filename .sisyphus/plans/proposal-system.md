# Work Plan: Proposal System Implementation

## TL;DR
> Extend database schema for code proposals + create ProposalEngine service for AI-driven code change workflow with GitHub Actions validation.

**Deliverables**:
- Extended `proposals` table schema
- `ProposalEngine` service class
- GitHub Actions workflow for validation

**Estimated Effort**: Medium
**Parallel Execution**: NO (sequential - schema first, then service)

---

## Context

### Goal
Implement a system where users can propose code changes in Discord, AI generates patches, super-admin approves, and GitHub Actions validates/applies changes.

### Existing Infrastructure
- `proposals` table already exists in `src/db/index.ts`
- `proposalDb` helper object exists
- `ConfirmationService` for approvals
- `PermissionService` for access control
- CI workflow already set up in `.github/workflows/ci.yml`

---

## Work Objectives

### Core Objective
Enable users to propose code changes via Discord that get validated by GitHub Actions and applied after super-admin approval.

### Must Have
- Extended proposals table with code-specific fields
- ProposalEngine service with create/approve/reject methods
- GitHub Actions workflow for patch validation
- Integration with existing ConfirmationService

### Must NOT Have
- No auto-merge (human review required)
- No direct code execution by bot
- No modifications outside `src/` directory

---

## Execution Strategy

### Sequential Tasks

#### Task 1: Extend Database Schema
**File**: `src/db/index.ts`

- Add columns to `proposals` table:
  - `type TEXT DEFAULT 'feature'` — distinguish feature/fix/code proposals
  - `patch_content TEXT` — unified diff
  - `test_results TEXT` — JSON of test output
  - `github_pr_url TEXT` — link to PR
  - `github_branch TEXT` — branch name
  - `approver_id TEXT` — who approved
  - `rejected_by TEXT` — who rejected
  - `rejected_reason TEXT` — rejection reason
  - `updated_at INTEGER` — last update timestamp

- Add `update` method to `proposalDb` object

#### Task 2: Create ProposalEngine Service
**File**: `src/services/proposal-engine.ts` (new)

- `CodeProposal` interface
- `ProposalEngine` class with:
  - `createProposal(userId, description)` — AI generates patch
  - `validateProposal(proposalId)` — trigger GitHub Actions
  - `approve(proposalId, approverId)` — super-admin approval
  - `reject(proposalId, rejecterId, reason)` — rejection with reason
  - `getProposal(id)` — fetch proposal
  - `listProposals(status?)` — list by status

- Dependencies: GitHub API, ConfirmationService, PermissionService

#### Task 3: GitHub Actions Workflow
**File**: `.github/workflows/code-proposal.yml` (new)

- `workflow_dispatch` trigger
- `validate` job: git apply --check + npm test
- `apply` job: create branch + apply patch + open PR

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after
- **Framework**: vitest

### QA Scenarios

**Scenario: Create proposal via Discord command**
- Tool: Bash (simulate message processing)
- Preconditions: Bot running, user in Discord
- Steps:
  1. User sends `!propose add feature X`
  2. ProposalEngine.createProposal() called
  3. Patch generated and stored
- Expected: Proposal created with pending status

**Scenario: Super-admin approves**
- Tool: Bash (unit test)
- Preconditions: Proposal exists with passing tests
- Steps:
  1. Super-admin calls `!approve <id>`
  2. ProposalEngine.approve() verifies permission
  3. GitHub Actions triggered
- Expected: PR created, status = approved

---

## Commit Strategy

- **1**: `feat(proposals): add code proposal schema` — src/db/index.ts
- **2**: `feat(proposals): add ProposalEngine service` — src/services/proposal-engine.ts
- **3**: `feat(ci): add code proposal validation workflow` — .github/workflows/code-proposal.yml
