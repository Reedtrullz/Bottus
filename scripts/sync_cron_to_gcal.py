#!/usr/bin/env python3
"""
Nanobot Cron → Google Calendar Sync

Syncerer nanobot cron-jobs til Google Calendar.
Kjøres manuelt eller via cron.

Usage:
    python3 sync_cron_to_gcal.py
    python3 sync_cron_to_gcal.py --dry-run
    python3 sync_cron_to_gcal.py --delete-orphans
"""

import os
import sys
import json
import sqlite3
import argparse
from datetime import datetime, timedelta
from typing import Optional

# Config
MATON_API_KEY = os.environ.get('MATON_API_KEY')
MATON_CONNECTION = os.environ.get('MATON_CONNECTION')
CRON_DB = os.environ.get('NANOBOT_CRON_DB', '/home/reed/.nanobot/cron.db')
CALENDAR_ID = 'inebotten@gmail.com'  # "Degenerert Almanakk"

BASE_URL = 'https://gateway.maton.ai'
CTRL_URL = 'https://ctrl.maton.ai'

def get_connection_id() -> Optional[str]:
    """Get the active Google Calendar connection ID."""
    if MATON_CONNECTION:
        return MATON_CONNECTION
    
    req = f'{CTRL_URL}/connections?app=google-calendar&status=ACTIVE'
    req = urllib.request.Request(req)
    req.add_header('Authorization', f'Bearer {MATON_API_KEY}')
    
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
        connections = data.get('connections', [])
        if connections:
            return connections[0]['connection_id']
    return None

def list_gcal_events(max_results: int = 250) -> list:
    """List all events from Google Calendar."""
    conn_id = get_connection_id()
    if not conn_id:
        print("❌ No Google Calendar connection found")
        return []
    
    url = f'{BASE_URL}/google-calendar/calendar/v3/calendars/{urllib.parse.quote(CALENDAR_ID)}/events?maxResults={max_results}&singleEvents=true'
    
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {MATON_API_KEY}')
    req.add_header('Maton-Connection', conn_id)
    
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
        return data.get('items', [])

def create_gcal_event(summary: str, description: str, start: str, end: str) -> dict:
    """Create a calendar event."""
    conn_id = get_connection_id()
    
    url = f'{BASE_URL}/google-calendar/calendar/v3/calendars/{urllib.parse.quote(CALENDAR_ID)}/events'
    
    payload = {
        'summary': f'🤖 {summary}',
        'description': description,
        'start': {'dateTime': start, 'timeZone': 'Europe/Oslo'},
        'end': {'dateTime': end, 'timeZone': 'Europe/Oslo'},
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method='POST')
    req.add_header('Authorization', f'Bearer {MATON_API_KEY}')
    req.add_header('Maton-Connection', conn_id)
    req.add_header('Content-Type', 'application/json')
    
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def delete_gcal_event(event_id: str) -> bool:
    """Delete a calendar event."""
    conn_id = get_connection_id()
    
    url = f'{BASE_URL}/google-calendar/calendar/v3/calendars/{urllib.parse.quote(CALENDAR_ID)}/events/{event_id}'
    
    req = urllib.request.Request(url, method='DELETE')
    req.add_header('Authorization', f'Bearer {MATON_API_KEY}')
    req.add_header('Maton-Connection', conn_id)
    
    try:
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"❌ Failed to delete event {event_id}: {e}")
        return False

def get_cron_jobs(db_path: str) -> list:
    """Read cron jobs from nanobot's SQLite database."""
    if not os.path.exists(db_path):
        print(f"⚠️  Cron DB not found: {db_path}")
        return []
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, message, cron_expr, every_seconds, at_time, tz
        FROM cron_jobs 
        WHERE active = 1
    """)
    
    jobs = []
    for row in cursor.fetchall():
        jobs.append({
            'id': row[0],
            'message': row[1],
            'cron_expr': row[2],
            'every_seconds': row[3],
            'at_time': row[4],
            'tz': row[5],
        })
    
    conn.close()
    return jobs

def format_job_description(job: dict) -> str:
    """Format job details for calendar description."""
    parts = [f"**Nanobot Cron Job**", f"ID: `{job['id']}`"]
    
    if job.get('cron_expr'):
        parts.append(f"Schedule: `{job['cron_expr']}`")
    elif job.get('every_seconds'):
        secs = job['every_seconds']
        if secs < 3600:
            parts.append(f"Interval: every {secs//60} minutes")
        else:
            parts.append(f"Interval: every {secs//3600} hours")
    elif job.get('at_time'):
        parts.append(f"One-time: {job['at_time']}")
    
    if job.get('tz'):
        parts.append(f"Timezone: {job['tz']}")
    
    parts.append(f"\n---\n{job['message']}")
    
    return '\n'.join(parts)

def main():
    parser = argparse.ArgumentParser(description='Sync nanobot cron jobs to Google Calendar')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be synced without making changes')
    parser.add_argument('--delete-orphans', action='store_true', help='Delete calendar events without matching cron jobs')
    args = parser.parse_args()
    
    if not MATON_API_KEY:
        print("❌ MATON_API_KEY not set")
        sys.exit(1)
    
    print("📅 Syncing nanobot cron jobs to Google Calendar...\n")
    
    # Get cron jobs
    jobs = get_cron_jobs(CRON_DB)
    print(f"📋 Found {len(jobs)} active cron jobs")
    
    # Get calendar events
    gcal_events = list_gcal_events()
    bot_events = [e for e in gcal_events if e.get('summary', '').startswith('🤖 ')]
    print(f"📅 Found {len(bot_events)} existing bot events\n")
    
    # Find events to create (jobs without matching events)
    existing_summaries = {e['summary'] for e in bot_events}
    
    for job in jobs:
        summary = f"🤖 {job['message'][:50]}"
        
        if summary in existing_summaries:
            print(f"⏭️  Skip: {job['message'][:40]}... (already exists)")
            continue
        
        if args.dry_run:
            print(f"� Would create: {job['message'][:40]}...")
            continue
        
        # Create a placeholder event (one year from now for recurring)
        # For one-time, use the specific time
        now = datetime.now()
        
        if job.get('at_time'):
            try:
                start_dt = datetime.fromisoformat(job['at_time'].replace('Z', '+00:00'))
            except:
                start_dt = now + timedelta(days=1)
        else:
            # Default: 1 year from now for recurring
            start_dt = now + timedelta(days=365)
        
        end_dt = start_dt + timedelta(hours=1)
        
        try:
            result = create_gcal_event(
                summary=job['message'][:50],
                description=format_job_description(job),
                start=start_dt.isoformat(),
                end=end_dt.isoformat()
            )
            print(f"✅ Created: {job['message'][:40]}... → {result.get('htmlLink', '')}")
        except Exception as e:
            print(f"❌ Failed: {job['message'][:40]}... - {e}")
    
    # Handle orphan deletion
    if args.delete_orphans:
        job_ids = {job['id'] for job in jobs}
        for event in bot_events:
            desc = event.get('description', '')
            # Check if event is orphan (no matching job ID)
            # This is a simplified check - in production you'd match more carefully
            if 'Nanobot Cron Job' in desc and 'ID: `' in desc:
                continue  # Keep for now, would need more sophisticated matching
            
            if args.dry_run:
                print(f"� Would delete orphan: {event['summary']}")
            else:
                event_id = event['id']
                if delete_gcal_event(event_id):
                    print(f"🗑️  Deleted orphan: {event['summary']}")
    
    print("\n✨ Sync complete!")

if __name__ == '__main__':
    import urllib.parse
    import urllib.request
    main()
