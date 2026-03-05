# Discord API Monitoring Setup

## Overview

This document describes the monitoring infrastructure for detecting Discord API changes and bot health issues.

## Automated Monitoring

### GitHub Actions Workflow

**File:** `.github/workflows/discord-api-monitor.yml`

**Schedule:** Runs every hour

**What it does:**
1. Checks Discord API changelog for breaking changes
2. Monitors for keywords: "breaking", "deprecated", "removed", "user token", "selfbot"
3. Creates GitHub issue if potential breaking change detected
4. Performs health check on bot

### Manual Monitoring

**Discord Developer Server:**
- Join: https://discord.gg/discord-developers
- Channel: #api-announcements

**Discord API Docs:**
- Bookmark: https://discord.com/developers/docs/change-log
- Check weekly for updates

**GitHub Repositories to Watch:**
- aiko-chan-ai/discord.js-selfbot-v13 (archived but check issues)
- dolfies/discord.py-self (alternative library)
- discord/discord-api-docs (official)

## Alert Triggers

### Critical Alerts (Immediate Action Required)
- Discord announces API deprecation
- Bot cannot connect for >1 hour
- Mass account bans reported

### Warning Alerts (Monitor Closely)
- Discord updates ToS regarding selfbots
- Rate limits increased
- New authentication requirements announced

### Info Alerts (Stay Informed)
- General API updates
- Feature additions
- Documentation changes

## Setting Up Notifications

### GitHub Issues
Workflow automatically creates issues for:
- Breaking changes
- Health check failures
- Security advisories

### Email Notifications
1. Go to repository Settings → Notifications
2. Enable "Actions" notifications
3. Set up email alerts for issues with labels: `alert`, `breaking-change`

### Slack/Discord Webhooks (Optional)
```yaml
- name: Send to Slack
  if: env.POTENTIAL_BREAKING_CHANGE == 'true'
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"🚨 Discord API Alert detected!"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Health Check Implementation

### Current Health Endpoint
The bot exposes `/health` endpoint with Discord connection status:

```json
{
  "status": "healthy",
  "services": { ... },
  "discord": {
    "connected": true,
    "lastActivity": 1709641200000,
    "lastError": null,
    "healthy": true
  },
  "timestamp": "2026-03-05T10:00:00.000Z"
}
```

### Monitoring Dashboard
To implement a dashboard:
1. Query `/health` endpoint every minute
2. Log results to time-series database
3. Alert if `discord.healthy` is false for >5 minutes

## Response Procedures

### When Alert Fires

**Step 1: Assess**
- Check Discord status page: https://status.discord.com
- Check if it's a widespread issue
- Determine severity

**Step 2: Decide**
| Severity | Action | Timeline |
|----------|--------|----------|
| Critical | Start emergency migration | Immediate |
| High | Activate shadow mode testing | Within 24h |
| Medium | Document and monitor | Within 1 week |
| Low | Log for quarterly review | Next review |

**Step 3: Execute**
- Follow migration runbook if needed
- Notify stakeholders
- Document findings

## Testing the Monitoring

### Simulate Alert
```bash
# Create test issue
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_REPO/issues \
  -d '{
    "title": "TEST ALERT - Discord API Change",
    "body": "This is a test of the alerting system",
    "labels": ["alert", "test"]
  }'
```

### Verify Notifications
1. Check email
2. Check GitHub notifications
3. Verify webhook delivery (if configured)

## Maintenance

**Weekly:**
- Review any alerts
- Check Discord changelog manually

**Monthly:**
- Review monitoring effectiveness
- Update keyword list if needed
- Test alert pathways

**Quarterly:**
- Full monitoring system review
- Update contact information
- Review and update runbooks

## Contact List

**Primary:** [Your Name] - [Email]  
**Secondary:** [Backup Name] - [Email]  
**Escalation:** [Manager] - [Email]

---

## Quick Reference

**Discord Status:** https://status.discord.com  
**API Change Log:** https://discord.com/developers/docs/change-log  
**Selfbot Library:** Check issues on archived repo  
**Alternative Library:** https://github.com/dolfies/discord.py-self

**Emergency Actions:**
1. Check this document
2. Review migration runbook
3. Contact team
4. Decide: Patch / Migrate / Wait
