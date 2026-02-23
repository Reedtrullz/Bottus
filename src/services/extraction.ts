import * as chrono from 'chrono-node';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Europe/Oslo';

export interface ExtractedItem {
  type: 'event' | 'task' | 'agreement';
  title: string;
  description?: string;
  startTime?: number;
  endTime?: number;
  dueTime?: number;
  participants?: string[];
  confidence: number;
  clarification?: string;
  // Optional recurrence rule for recurring events (RFC 5545 RRULE)
  recurrenceRule?: string;
}

export class ExtractionService {
  private agreementPatterns = [
    /\b(vi blir enige?|enighet|avtale|agreement)\b/i,
    /\b(jeg lover|lofte|forplikter|forpliktelse)\b/i,
    /\b(husk|husk at|ikke glem|pass på|merk deg)\b/i,
    /\b(skal|må|vil|bør|trenger å)\s+\b.*\b(gjøre|ta|sette|holde|leve)\b/i,
  ];
  
  extract(message: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    
    const tasks = this.extractTasks(message);
    const dates = this.extractDates(message);
    const agreements = this.extractAgreements(message);
    
    items.push(...tasks);
    items.push(...dates);
    items.push(...agreements);
    
    return items;
  }
  
  private extractTasks(message: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('husk') || lowerMsg.includes('ikke glem')) {
      const huskMatch = message.match(/(?:husk|ikke glem)\s+(.+?)(?:\s+(?:på|kl|den)\s+|$)/i);
      let title = huskMatch && huskMatch[1] ? huskMatch[1].trim() : null;
      
      const results = chrono.parse(message);
      const hasDate = results.length > 0;
      
      if (title && hasDate) {
        const parsed = results[0];
        const startTime = Math.floor(parsed.start.date().getTime() / 1000);
        
        const dateText = parsed.text.toLowerCase();
        const isWeekly = dateText.includes('hver') || dateText.includes('alle') || 
                        dateText.includes('mandag') || dateText.includes('tirsdag') ||
                        dateText.includes('onsdag') || dateText.includes('torsdag') ||
                        dateText.includes('fredag') || dateText.includes('lørdag') || dateText.includes('søndag');
        const hasTime = dateText.includes('kl') || /\d{1,2}:\d{2}/.test(dateText);
        // Detect recurring patterns and derive a recurrenceRule if applicable
        let recurrenceRule: string | undefined;
        // Try to detect a specific day (eg: "hver mandag") and map to BYDAY codes
        const dayCodeFromText = (() => {
          const days: Record<string,string> = {
            mandag: 'MO',
            tirsdag: 'TU',
            onsdag: 'WE',
            torsdag: 'TH',
            fredag: 'FR',
            lørdag: 'SA',
            søndag: 'SU'
          };
          for (const [name, code] of Object.entries(days)) {
            if (dateText.includes(name)) return code;
          }
          return null as string | null;
        })();
        if (dayCodeFromText) {
          recurrenceRule = `RRULE:FREQ=WEEKLY;BYDAY=${dayCodeFromText}`;
        } else if (dateText.includes('hver uke')) {
          recurrenceRule = 'RRULE:FREQ=WEEKLY';
          if (dateText.includes('annenhver uke')) {
            recurrenceRule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
          }
        } else if (dateText.includes('månedlig')) {
          recurrenceRule = 'RRULE:FREQ=MONTHLY';
        }
        
        if (!isWeekly && hasTime) {
          items.push({
            type: 'task',
            title,
            description: message,
            startTime,
            recurrenceRule,
            confidence: 0.85
          });
        } else {
          let clarification = '';
          if (isWeekly && hasTime) {
            clarification = 'Er det hver uke på samme dag som møtet, eller en spesifikk ukedag? Og hvilken tid?';
          } else if (isWeekly) {
            clarification = 'Er det hver uke på samme dag, eller bare denne dagen?';
          } else if (hasTime) {
            clarification = 'Hvilken tid på dagen?';
          }
          items.push({
            type: 'task',
            title,
            description: message,
            startTime,
            recurrenceRule,
            confidence: 0.4,
            clarification
          });
        }
      } else if (title && !hasDate) {
        items.push({
          type: 'task',
          title,
          description: message,
          recurrenceRule: undefined,
          confidence: 0.6
        });
      } else if (!title && hasDate) {
        items.push({
          type: 'task',
          title: 'Påminnelse',
          description: message,
          recurrenceRule: undefined,
          confidence: 0.5
        });
      }
    }
    
    return items;
  }
  
  private extractDates(message: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    
    const results = chrono.parse(message);
    
    for (const result of results) {
      const startDate = result.start.date();
      const endDate = result.end?.date();
      
      const startTime = Math.floor(startDate.getTime() / 1000);
      const endTime = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;
      // Detect possible recurrence from the date text
      const dateText = result.text.toLowerCase();
      let recurrenceRule: string | undefined = undefined;
      // Day-based weekly recurrence (e.g., "hver mandag")
      const dayCodeFromText = (() => {
        const days: Record<string,string> = {
          mandag: 'MO',
          tirsdag: 'TU',
          onsdag: 'WE',
          torsdag: 'TH',
          fredag: 'FR',
          lørdag: 'SA',
          søndag: 'SU'
        };
        for (const [name, code] of Object.entries(days)) {
          if (dateText.includes(name)) return code;
        }
        return null as string | null;
      })();
      if (dayCodeFromText) {
        recurrenceRule = `RRULE:FREQ=WEEKLY;BYDAY=${dayCodeFromText}`;
      } else if (dateText.includes('hver uke')) {
        recurrenceRule = 'RRULE:FREQ=WEEKLY';
        if (dateText.includes('annenhver uke')) {
          recurrenceRule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
        }
      } else if (dateText.includes('månedlig')) {
        recurrenceRule = 'RRULE:FREQ=MONTHLY';
      }
      
      const context = message.substring(
        Math.max(0, result.index - 30),
        Math.min(message.length, result.index + result.text.length + 30)
      );
      
      let title = 'Arrangement';
      if (context.toLowerCase().includes('møte') || context.toLowerCase().includes('meeting')) {
        title = 'Møte';
      } else if (context.toLowerCase().includes('avtale') || context.toLowerCase().includes('date')) {
        title = 'Avtale';
      } else if (context.toLowerCase().includes('deadline') || context.toLowerCase().includes('frist')) {
        title = 'Frist';
      }
      
        items.push({
          type: context.toLowerCase().includes('frist') || context.toLowerCase().includes('deadline') ? 'task' : 'event',
          title,
          description: `Fra chat: "${result.text}"`,
          startTime,
          endTime,
          recurrenceRule,
          confidence: 0.8
        });
    }
    
    return items;
  }
  
  private extractAgreements(message: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    
    for (const pattern of this.agreementPatterns) {
      const match = message.match(pattern);
      if (match) {
        const matchIndex = (match as RegExpMatchArray).index ?? 0;
        const context = message.substring(
          Math.max(0, matchIndex - 20),
          Math.min(message.length, matchIndex + match[0].length + 20)
        );
        
        let title = 'Avtale';
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('husk') || lowerMsg.includes('ikke glem')) {
          title = 'Påminnelse';
          const huskMatch = message.match(/(?:husk|ikke glem)\s+(.+?)(?:\s+på|\s+kl|\s+\d|$)/i);
          if (huskMatch && huskMatch[1]) {
            title = huskMatch[1].trim();
          }
        }
        
        items.push({
          type: 'task',
          title: title,
          description: context,
          confidence: 0.7
        });
        break;
      }
    }
    
    return items;
  }
  
  formatTimestamp(timestamp: number): string {
    return formatInTimeZone(new Date(timestamp * 1000), TIMEZONE, 'PPp');
  }
}
