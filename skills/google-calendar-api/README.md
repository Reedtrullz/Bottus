# Google Calendar Integration

## Overview

The nanobot has a dualReminder system where both `cron` (internal) and Google Calendar stay in sync. All scheduled reminders are automatically added to Google Calendar.

## Setup

### Installed Skill
- **Skill**: `google-calendar-api` (v1.0.5)
- **Source**: ClawHub
- **Installation**: `npx --yes clawhub@latest install google-calendar-api`

### Credentials
Credentials are stored in `/home/reed/.nanobot/workspace/skills/google-calendar-api/.env`:
```
MATON_API_KEY=<api_key>
MATON_CONNECTION_ID=<connection_id>
```

### Connected Account
- **Email**: inebotten@gmail.com
- **Status**: Active
- **Connection ID**: 62ca6f8d-7264-4abb-a0c1-9091b360191f

## How It Works

1. **User requests a reminder** → nanobot creates it in cron (for notifications)
2. **Same reminder** → automatically created in Google Calendar
3. **Result**: Both systems contain identical reminders

### Architecture
```
User Request
    ↓
┌─────────────────────────────────────┐
│           nanobot (cron)            │
│  - Remembers all reminders         │
│  - Sends notifications              │
│  - Authoritative source of truth    │
└─────────────────────────────────────┘
    ↓ (automatic sync)
┌─────────────────────────────────────┐
│        Google Calendar              │
│  - Always up-to-date                │
│  - Shareable with others           │
│  - Visual backup                    │
└─────────────────────────────────────┘
```

## Usage

### Creating a Reminder

When user asks for a reminder, do BOTH:

1. **Cron (for notifications):**
```python
# Via cron tool
cron.add(action="add", at="2026-02-26T10:00:00", message="Meeting")
```

2. **Google Calendar (for visibility):**
```python
import urllib.request, json, datetime

api_key = "IXhfQep8kQnuqgkdsAu3NnwUvtjAjwcE_sTd2tNlAk61dvRjfMYy4bwpfz3lR0tIYshpcQHDMGt7gd4wir-nh9ZRERc4-ZZxdzY"
conn_id = "62ca6f8d-7264-4abb-a0c1-9091b360191f"

start = datetime.datetime(2026, 2, 26, 10, 0)
end = start + datetime.timedelta(minutes=30)

event = {
    "summary": "Reminder: Your message here",
    "description": "Created by nanobot reminder system",
    "start": {"dateTime": start.isoformat(), "timeZone": "Europe/Oslo"},
    "end": {"dateTime": end.isoformat(), "timeZone": "Europe/Oslo"}
}

req = urllib.request.Request(
    'https://gateway.maton.ai/google-calendar/calendar/v3/calendars/primary/events',
    data=json.dumps(event).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {api_key}',
        'Maton-Connection': conn_id,
        'Content-Type': 'application/json'
    }
)
urllib.request.urlopen(req)
```

### Listing Events

```python
import urllib.request, json

api_key = "IXhfQep8kQnuqgkdsAu3NnwUvtjAjwcE_sTd2tNlAk61dvRjfMYy4bwpfz3lR0tIYshpcQHDMGt7gd4Wir-nh9ZRERc4-ZZxdzY"
conn_id = "62ca6f8d-7264-4abb-a0c1-9091b360191f"

req = urllib.request.Request(
    'https://gateway.maton.ai/google-calendar/calendar/v3/calendars/primary/events?maxResults=10'
)
req.add_header('Authorization', f'Bearer {api_key}')
req.add_header('Maton-Connection', conn_id)

events = json.load(urllib.request.urlopen(req))
for event in events.get('items', []):
    print(f"{event['summary']} - {event['start'].get('dateTime', event['start'].get('date'))}")
```

## Troubleshooting

### Check connection status
```python
import urllib.request, json
api_key = "YOUR_API_KEY"
req = urllib.request.Request('https://ctrl.maton.ai/connections?app=google-calendar')
req.add_header('Authorization', f'Bearer {api_key}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
```

### Re-authenticate
If connection is inactive, get new session:
1. Visit: https://connect.maton.ai/
2. Login with Google
3. Update connection_id in .env

## Security Notes

- API key stored in `.env` - do not commit to version control
- Connection ID is tied to the user's Google account
- Calendar data is visible to anyone with the iCal link

## Future Improvements

- Auto-sync existing cron reminders to Google Calendar on startup
- Two-way sync (Google Calendar → cron)
- Delete reminders from both systems when removed from cron
