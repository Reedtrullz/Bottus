# Documentation Improvement Plan

## TL;DR

> Create comprehensive documentation covering environment variables, development setup, troubleshooting, deployment, contributing guidelines, testing strategy, and system architecture guides.
> 
> **Deliverables**: 11 new documentation files + README updates
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - Multiple waves
> **Critical Path**: Env vars → Setup → Troubleshooting

---

## Context

### Original Request
"Deep analysis of our project and ensure there are documentation, guides and readmes for how things work and is structured."

### Current Documentation State

**Already exists:**
- Root README.md - Project overview with features, commands, architecture
- AGENTS.md - AI assistant instructions
- docs/calendar-skill.md - Calendar feature documentation
- docs/discord-selfbot-setup.md - Selfbot setup
- docs/hotspot-onboarding.md - High-complexity area guide
- docs/image-generation-schema.md - Image generation schema
- src/AGENTS.md - Source code structure overview
- src/relay/AGENTS.md - Relay bot detailed docs + migration risks
- src/services/AGENTS.md - 12 domain services
- src/commands/AGENTS.md - Slash commands
- src/gateway/AGENTS.md - Experimental gateway
- src/db/AGENTS.md - Database schemas
- skills/google-calendar-api/README.md
- skills/google-calendar-api/SKILL.md

**Missing (identified via analysis):**
- Environment variables documentation
- Detailed development setup guide
- Troubleshooting guide
- Deployment/production guide
- Contributing guidelines
- Testing strategy document
- Skills system overview
- Plan router documentation
- Self-healing system docs
- Health monitoring docs
- README updates with doc links

---

## Work Objectives

### Core Objective
Create a complete documentation suite that enables developers to:
1. Set up the development environment from scratch
2. Understand all configuration options
3. Troubleshoot common issues independently
4. Deploy to production
5. Contribute to the project

### Concrete Deliverables

1. `docs/env-variables.md` - All environment variables with descriptions
2. `docs/development-setup.md` - Step-by-step dev setup guide
3. `docs/troubleshooting.md` - Common issues and solutions
4. `docs/deployment.md` - Production deployment guide
5. `CONTRIBUTING.md` - Contribution guidelines
6. `docs/testing.md` - Testing strategy and patterns
7. `docs/skills-system.md` - Skills architecture overview
8. `docs/plan-router.md` - Plan router documentation
9. `docs/self-healing.md` - Self-healing system docs
10. `docs/health-monitoring.md` - Health monitoring docs
11. Update README.md with doc links

### Definition of Done

- [ ] All 11 documentation files created
- [ ] README.md updated with documentation links
- [ ] Code examples verified accurate
- [ ] File paths verified to exist in codebase

### Must Have
- Accurate environment variable reference
- Working development setup steps
- Common troubleshooting scenarios
- Production deployment instructions

### Must NOT Have
- Outdated information (verify against current code)
- Incomplete commands (include all required flags)
- Generic boilerplate (customize to this project)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: None required for documentation
- **Agent-Executed QA**: Manual review of each doc for:
  - Accuracy of code examples
  - Correct file paths
  - Working commands
  - Consistent formatting

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - can run in parallel):
├── Doc 1: Environment Variables Reference
├── Doc 2: Development Setup Guide
└── Doc 3: Troubleshooting Guide

Wave 2 (Deployment & Contributing):
├── Doc 4: Deployment Guide
├── Doc 5: Contributing Guidelines
└── Doc 6: Testing Strategy

Wave 3 (Architecture & Systems):
├── Doc 7: Skills System Overview
├── Doc 8: Plan Router Documentation
├── Doc 9: Self-Healing System
└── Doc 10: Health Monitoring

Wave 4 (Integration):
└── Doc 11: README Updates + Review
```

### Reference Sources

**For env-variables.md:**
- `.env.example` - All env var names
- `docker-compose.yml` - Docker-specific vars

**For development-setup.md:**
- `package.json` - npm scripts
- `README.md` - Existing quick start

**For self-healing.md:**
- `src/services/self-healer.ts` - SelfHealer class
- `src/services/error-classifier.ts` - ErrorClassifier, RecoveryStrategy

**For health-monitoring.md:**
- `src/services/health-monitor.ts` - HealthMonitor class, ServiceStatus types

**For plan-router.md:**
- `src/relay/plan-router.ts` - PlanRouter class, PlanAction types

**For skills-system.md:**
- `src/relay/skills/interfaces.ts` - Skill interface
- `src/relay/skills/registry.ts` - Skill registry

---

## TODOs

- [x] 1. Create docs/env-variables.md

  **What to do**:
  - Document all environment variables from .env.example
  - Include Docker-specific variables from docker-compose.yml
  - Add security warnings for sensitive values
  - Provide complete example .env file

  **References**:
  - `.env.example` - Primary reference
  - `docker-compose.yml` - Docker vars

  **QA Scenarios**:
  - Verify all variables listed exist in codebase
  - Check default values match actual code
  - Verify example commands work

- [x] 2. Create docs/development-setup.md

  **What to do**:
  - Prerequisites (Node.js, Docker, Ollama, ComfyUI)
  - Step-by-step installation
  - Running in development mode
  - Running tests
  - Environment configuration

  **References**:
  - `package.json` - npm scripts
  - `README.md` - Existing quick start

- [x] 3. Create docs/troubleshooting.md

  **What to do**:
  - Common connection errors (Ollama, ComfyUI, Discord)
  - Authentication issues
  - Database issues
  - Performance problems
  - Selfbot detection/ban prevention

  **References**:
  - `src/services/health-monitor.ts` - Health checks
  - Existing error handling code

- [x] 4. Create docs/deployment.md

  **What to do**:
  - Docker deployment
  - Production considerations
  - Environment configuration
  - Health checks
  - Logging
  - Backup strategies

  **References**:
  - `docker-compose.yml` - Deployment config

- [x] 5. Create CONTRIBUTING.md

  **What to do**:
  - Getting started
  - Development workflow
  - Code style conventions
  - Commit message format
  - Pull request process
  - Hotspot modification guidelines

  **References**:
  - `docs/hotspot-onboarding.md` - Hotspot guidelines
  - `src/*/AGENTS.md` - Code conventions

- [x] 6. Create docs/testing.md

  **What to do**:
  - Testing philosophy
  - Test structure and patterns
  - Running tests
  - Adding new tests
  - Coverage expectations

  **References**:
  - `tests/` - Existing test files
  - `package.json` - Test scripts

- [x] 7. Create docs/skills-system.md

  **What to do**:
  - Skills architecture overview
  - Creating a new skill
  - Skill interface reference
  - Existing skills reference

  **References**:
  - `src/relay/skills/interfaces.ts` - Skill interface
  - `src/relay/skills/registry.ts` - Skill registry

- [x] 8. Create docs/plan-router.md

  **What to do**:
  - How routing works
  - Confidence thresholds
  - Action types
  - Extension points

  **References**:
  - `src/relay/plan-router.ts` - PlanRouter class

- [x] 9. Create docs/self-healing.md

  **What to do**:
  - Error classification system
  - Recovery strategies
  - Retry configuration
  - Metrics and monitoring

  **References**:
  - `src/services/self-healer.ts` - SelfHealer class
  - `src/services/error-classifier.ts` - ErrorClassifier

- [x] 10. Create docs/health-monitoring.md

  **What to do**:
  - Health check endpoints
  - Service status types
  - Integration with self-healing
  - Custom health checks

  **References**:
  - `src/services/health-monitor.ts` - HealthMonitor class

- [x] 11. Update README.md

  **What to do**:
  - Add "Documentation" section with all doc links
  - Ensure consistency with new docs

---

## Commit Strategy

- **Wave 1**: `docs: add env-vars, setup, troubleshooting guides`
- **Wave 2**: `docs: add deployment, contributing, testing guides`
- **Wave 3**: `docs: add architecture docs (skills, router, heal, health)`
- **Wave 4**: `docs: update README with doc links`

---

## Success Criteria

### Verification Commands
```bash
# Verify all docs exist
ls -la docs/*.md CONTRIBUTING.md

# Verify content length (minimums)
wc -l docs/*.md CONTRIBUTING.md
```

### Final Checklist
- [ ] All 11 deliverables present
- [ ] README links working
- [ ] Code examples tested
- [ ] File paths verified
- [ ] Consistent formatting
