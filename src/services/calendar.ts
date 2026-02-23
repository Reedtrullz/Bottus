import { google } from 'googleapis';
import { CalendarDisplayService } from './calendar-display.js';
import { tokenDb } from '../db/index.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export class CalendarService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  async createEvent(userId: string, event: {
    title: string;
    description?: string;
    startTime: number;
    endTime?: number;
    recurrenceRule?: string;
  }): Promise<string | null> {
    const tokens = tokenDb.get(userId) as any;
    if (!tokens) {
      console.log(`No Google tokens for user ${userId}`);
      return null;
    }
    
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const requestBody: any = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: new Date(event.startTime * 1000).toISOString(),
          timeZone: 'Europe/Oslo'
        },
        end: event.endTime ? {
          dateTime: new Date(event.endTime * 1000).toISOString(),
          timeZone: 'Europe/Oslo'
        } : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 }
          ]
        }
      };
      if (event.recurrenceRule) {
        requestBody.recurrence = [ event.recurrenceRule ];
      }
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody
      });
      
      return response.data.id || null;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }
  
  async handleCalendarCommand(interaction: any): Promise<void> {
    let ukeOffset = 0;
    try {
      const opts = (interaction?.data?.options) ?? [];
      const ukeOpt = opts.find((o: any) => o.name === 'uke');
      if (ukeOpt && typeof ukeOpt.value === 'number') {
        ukeOffset = Number(ukeOpt.value);
      }
    } catch {
      ukeOffset = 0;
    }
    
    const calendarDisplay = new CalendarDisplayService();
    const embed = await calendarDisplay.buildWeekEmbed(undefined, undefined, ukeOffset);
    if (embed) {
      await interaction.reply({ embeds: [embed as any] });
    } else {
      await interaction.reply({ content: 'Ingen kalenderdata funnet for denne uka.', ephemeral: true });
    }
  }
  
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId
    });
  }
  
  async handleCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    tokenDb.save(userId, {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiresAt: tokens.expiry_date || 0
    });
  }
}
