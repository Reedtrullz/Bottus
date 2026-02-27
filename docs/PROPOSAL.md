# Bottus Utviklingsplan

## Oversikt

Etter gjennomgang av Bottus (Ine-Discord) koden har jeg identifisert flere forbedringsområder for automatisering, sikkerhet og bedre samkjøring med nanobot.

---

## ✅ Implementert

### 1. API-nøkkel på health endpoint (FERDIG 🔒)

**Status:** Implementert

- Lagt til `HEALTH_API_KEY` miljøvariabel
- Alle `/api/*` endpoints krever `X-API-Key` header
- Dev-mode: hvis ingen nøkkel satt → åpen tilgang (for enkel testing)

```bash
# I .env
HEALTH_API_KEY=din_sikre_nøkkel
```

**Endpoints:**
- `GET /api/permissions/:userId/:channelId` -roller/permissions
- `GET /api/permissions/channels/:channelId` -kanalroller
- `GET /api/audit?userId=&channelId=&action=&limit=` -audit logs
- `GET /api/audit/recent` -siste 10 hendelser

---

### 2. Audit Logging API (FERDIG 📝)

**Status:** Implementert

- Lagt til `/api/audit` og `/api/audit/recent` i health endpoint
- Kan filtrere på userId, channelId, action
- Integrert med eksisterende AuditLogger

---

### 3. CI/CD Pipeline utvidelse (FERDIG 🚀)

**Status:** Implementert

- `ci.yml`: Lagt til `npm audit` for sikkerhetssjekk
- `deploy.yml`: Ny workflow for automatisk deploy til WSL ved merge til main
- Krever GitHub secrets: `WSL_HOST`, `WSL_USER`, `WSL_PASSWORD`, `WSL_PORT`

---

### 4. Delt env-fil (FERDIG 📂)

**Status:** Implementert

- Opprettet `.env.shared` med felles variabler for Bottus + Nanobot
- Inkluderer: BOTTUS_HEALTH_URL, BOTTUS_HEALTH_API_KEY, NANOBOT_CRON_DB

---

## ⏳ Gjenstående

| # | Oppgave | Status |
|---|---------|--------|
| 5 | Docker image build i CI | ✅ Ferdig |
| 6 | Rate-limiting på API | ✅ Ferdig |
| 7 | Nanobot cron → Google Calendar synk | ✅ Ferdig |

---

## 📋 Summary

Alle 7 forbedringer er nå implementert!

### Detaljer:

**GitHub Actions Workflows:**
- `ci.yml` - bygger, kjører tester + npm audit
- `deploy.yml` - auto-deploy til WSL ved merge til main
- `docker.yml` - bygger & pusher Docker image til GHCR + deploy ved release

**Sikkerhet:**
- API-nøkkel (`HEALTH_API_KEY`) på alle `/api/*` endpoints
- Rate-limiting (60 req/min per klient)
- Audit logging for alle sensitive operasjoner

**Integrasjon:**
- `.env.shared` - delte miljøvariabler for Bottus + Nanobot
- `scripts/sync_cron_to_gcal.py` - synkroniserer nanobot cron jobs til Google Calendar

---

## 🗳️ Avstemming

Gi thumbs up/down på gjenstående forslag, eller be meg implementere!
