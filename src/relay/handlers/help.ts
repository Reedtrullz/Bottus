/**
 * UX-Focused Help Handler for Inebotten
 * 
 * Provides contextual, actionable help responses with copy-paste examples.
 * Answers what users actually ask rather than generic monologues.
 */

import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { logger } from '../../utils/logger.js';

type HelpCategory = 'identity' | 'capabilities' | 'calendar' | 'memory' | 'images' | 'reminders' | 'polls' | 'overview';

interface HelpContent {
  brief: string;
  standard: string;
  detailed: string;
}

interface LanguageContent {
  nb: HelpContent;
  en: HelpContent;
}

export class HelpHandler implements MessageHandler {
  readonly name = 'help';

  /**
   * Detect what category of help user is asking for
   */
  private detectCategory(message: string): HelpCategory | null {
    const m = message.toLowerCase();
    
    // Identity questions
    if (this.matchAny(m, [
      'who are you', 'what are you', 'what is your name', 'kven er du', 'kven er dette',
      'hvem er du', 'hva er du', 'kva er du', 'identity', 'identitet'
    ])) {
      return 'identity';
    }
    
    // Calendar-specific help
    if (this.matchAny(m, [
      'calendar', 'kalender', 'avtale', 'event', 'møte', 'hendelse',
      'hvordan lage avtale', 'hvordan opprette', 'how to schedule',
      'how to create event', 'lage en avtale', 'opprette kalender'
    ])) {
      return 'calendar';
    }
    
    // Memory-specific help
    if (this.matchAny(m, [
      'memory', 'huske', 'minne', 'husk', 'recall', 'remember',
      'how to remember', 'hvordan huske', 'lagre'
    ])) {
      return 'memory';
    }
    
    // Image generation help
    if (this.matchAny(m, [
      'image', 'bilde', 'generate', 'tegn', 'comfyui', 'generer',
      'how to generate', 'how to create image', 'lage bilde'
    ])) {
      return 'images';
    }
    
    // Reminders help
    if (this.matchAny(m, [
      'reminder', 'påminnelse', 'påminning', 'remind', 'alarm',
      'how to remind', 'hvordan minne'
    ])) {
      return 'reminders';
    }
    
    // Polls help
    if (this.matchAny(m, [
      'poll', 'avstemning', 'stemme', 'voting', 'vote',
      'how to poll', 'lage avstemning'
    ])) {
      return 'polls';
    }
    
    // Capabilities - what can you do
    if (this.matchAny(m, [
      'what can you do', 'hva kan du', 'kva kan du', 'hva kan jeg',
      'hvilke ting kan du', 'hvilke kommandoer', 'hva alt kan du', 'kva ting kan du',
      'capabilities', 'funksjoner', 'features', 'abilities'
    ])) {
      return 'capabilities';
    }
    
    // General help
    if (this.matchAny(m, [
      'help', 'hjelp', 'helping', 'helper', 'hjelp meg',
      'how do you work', 'how to use', 'how do i use',
      'hvordan bruke', 'hvordan bruke deg', 'hva gjør du', 'hva er dine funksjoner',
      'kommandoer', 'commands', 'what commands', 'hvilke kommandoer', 'list commands'
    ])) {
      return 'overview';
    }
    
    return null;
  }

  /**
   * Detect user's language preference
   */
  private detectLanguage(message: string): 'nb' | 'en' {
    const m = message.toLowerCase();
    const englishPatterns = ['who are you', 'what are you', 'what can you do', 'help', 
      'how do', 'how to', 'commands', 'what is', 'how can'];
    const norwegianPatterns = ['hvem er', 'hva kan', 'hvordan', 'hjelp', 'hva gjør',
      'kommandoer', 'hvilke', 'kva'];
    
    const hasEnglish = englishPatterns.some(p => m.includes(p));
    const hasNorwegian = norwegianPatterns.some(p => m.includes(p));
    
    return hasEnglish && !hasNorwegian ? 'en' : 'nb';
  }

  /**
   * Helper to match multiple patterns
   */
  private matchAny(message: string, patterns: string[]): boolean {
    return patterns.some(p => message.includes(p));
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    try {
      if (!message) return false;
      const m = message.toLowerCase();
      
      // Debug: check identity patterns
      const identityPatterns = [
        'who are you', 'what are you', 'what is your name', 'kven er du', 'kven er dette',
        'hvem er du', 'hva er du', 'kva er du', 'identity', 'identitet'
      ];
      const identityMatch = identityPatterns.some(p => m.includes(p));
      
      const category = this.detectCategory(m);
      logger.info(`[Relay] HelpHandler canHandle: msg="${m}", identityMatch=${identityMatch}, category="${category}"`);
      return category !== null;
    } catch (e) {
      logger.error(`[Relay] HelpHandler canHandle ERROR:`, e as any);
      return false;
    }
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const category = this.detectCategory(message) || 'overview';
      const lang = this.detectLanguage(message);
      logger.info(`[Relay] HelpHandler handle: category="${category}", lang="${lang}"`);
      const response = this.buildResponse(category, lang);
      
      await ctx.discord.sendMessage(ctx.channelId, response);
      return { handled: true };
  } catch (e) {
      logger.error('[Relay] HelpHandler error:', e as any);
      return { handled: true, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Build contextual help response based on category and language
   */
  private buildResponse(category: HelpCategory, lang: 'nb' | 'en'): string {
    const content = this.getHelpContent(category, lang);
    
    // Return appropriate detail level based on category
    switch (category) {
      case 'identity':
        return content.brief;
      case 'capabilities':
      case 'overview':
        return content.standard;
      default:
        return content.detailed;
    }
  }

  /**
   * Get help content for specific category and language
   */
  private getHelpContent(category: HelpCategory, lang: 'nb' | 'en'): HelpContent {
    const db = this.contentDatabase;
    return db[category]?.[lang] || db.overview[lang];
  }

  /**
   * Rich help content database organized by category and language
   */
  private contentDatabase: Record<HelpCategory, LanguageContent> = {
    identity: {
      nb: {
        brief: `👋 Jeg er **Inebotten** - din personlige Discord-assistent!

Jeg kan hjelpe deg med:
• 📅 Kalender og avtaler
• 💾 Huske ting for deg  
• 🖼️ Generere bilder
• 📊 Lage avstemninger

**Prøv dette:**
«hva kan du?» → se alle mulighetene
«hvordan lage en avtale?» → kalenderhjelp`,
        standard: `👋 Jeg er **Inebotten** - din personlige assistent i Discord! 🎉

Jeg er bygget for å hjelpe gruppa med å holde oversikt over:
• 📅 **Kalender** - avtaler og møter
• 💾 **Hukommelse** - huske ting dere trenger
• 🖼️ **Bilder** - generere bilder på kommando
• 📊 **Avstemninger** - finne beste tidspunkt

Prøv «hva kan du?» for å se alle mulighetene!`,
        detailed: `👋 Jeg er **Inebotten**!

Jeg er en AI-assistent som lever i Discord-gruppa di. Bruk @nevnet for å snakke med meg.

**Hva jeg kan hjelpe med:**
• Kalender og tidsplanering
• Huske viktige ting
• Bildegenerering
• Avstemninger

Ikke nøl med å spørre!`
      },
      en: {
        brief: `👋 I'm **Inebotten** - your personal Discord assistant!

I can help with:
• 📅 Calendar and events
• 💾 Remembering things
• 🖼️ Generating images
• 📊 Creating polls

**Try this:**
«what can you do?» → see all possibilities
«how to create event?» → calendar help`,
        standard: `👋 I'm **Inebotten** - your personal Discord assistant! 🎉

I'm built to help your group with:
• 📅 **Calendar** - events and meetings
• 💾 **Memory** - remembering important things
• 🖼️ **Images** - generate images on command
• 📊 **Polls** - find the best time

Try «what can you do?» to see everything I can do!`,
        detailed: `👋 I'm **Inebotten**!

I'm an AI assistant living in your Discord group. Mention me with @ to talk to me.

**What I can help with:**
• Calendar and scheduling
• Remembering important things
• Image generation
• Polls

Don't hesitate to ask!`
      }
    },

    capabilities: {
      nb: {
        brief: `📋 **Hva jeg kan:**

**📅 Kalender**
«hva skjer i dag?» → se dagens plan
«når er møtet?» → finn et tidspunkt
/neste uke → se fremover

**💾 Minner**
«husk at Jonas liker kaffe» → lagre et minne
«hva husker du?» → hent lagrede minner

**🖼️ Bilder**
«lag et bilde av en strand i solnedgang»

**📊 Avstemninger**
«finn en tid for møte»

Spør «hvordan lage en avtale?» for detaljer!`,
        standard: `📋 **Her er hva jeg kan hjelpe deg med:**

**📅 Kalender & Avtaler**
• «hva skjer i dag?» → se dagens plan
• «når er julen?» → finn en dato
• «vis kalender» → se hele uken
• «/kalender» → interaktiv kalender

**💾 Huske Ting**
• «husk at jeg liker kaffe» → lagre et minne
• «husk at møte kl 15» → lagre med tidspunkt
• «hva husker du?» → hent lagrede minner

**🖼️ Bildegenerering**
• «lag et bilde av en katt»
• «tegn en strand i solnedgang»
• «generer et bilde av et fjell»

**📊 Avstemninger**
• «finn en tid for møte»
• «avstemning: pizza eller burgere?»

**💡 Prøv dette:**
\`\`\`
husk at teammøte er på mandag kl 14
hva skjer i morgen?
lag et bilde av en koselig katt
\`\`\``,
        detailed: `📋 **Alle mine funksjoner:**

**📅 KALENDER**
- Spør om «hva skjer» for å se planer
- Fortell meg datoer så husker jeg dem
- Bruk /kalender for interaktiv visning
- «når er X?» for spesifikke hendelser

**💾 HUKOMMELSE**
- «husk at [ting]» lagrer i minnet
- «hva husker du?» henter alt lagret
- Fungerer på tvers av samtaler

**🖼️ BILDER**
- Si «lag et bilde av [beskrivelse]»
- Prøv: «lag et bilde av en koselig katt ved peisen»
- Jo mer detaljert, jo bedre resultat

**📊 AVSTEMNINGER**
- «finn en tid for møte» lager poll
- «avstemning: [alternativ 1] eller [alternativ 2]»

Spør «help» for oversikt!`
      },
      en: {
        brief: `📋 **What I can do:**

**📅 Calendar**
«what's happening today?» → see today's plans
«when is the meeting?» → find a time
/navigate the calendar

**💾 Memory**
«remember I like coffee» → store a memory
«what do you remember?» → recall memories

**🖼️ Images**
«generate an image of a sunset beach»

**📊 Polls**
«find a time for meeting»

Ask «how to create event?» for details!`,
        standard: `📋 **Here's what I can help you with:**

**📅 Calendar & Events**
• «what's happening today?» → see today's plans
• «when is Christmas?» → find a date
• «show calendar» → see the whole week
• «/calendar» → interactive calendar

**💾 Remembering Things**
• «remember I like coffee» → store a memory
• «remember meeting at 3pm» → store with time
• «what do you remember?» → retrieve stored memories

**🖼️ Image Generation**
• «generate an image of a cat»
• «draw a sunset beach»
• «create an image of a mountain»

**📊 Polls**
• «find a time for meeting»
• «poll: pizza or burgers?»

**💡 Try this:**
\`\`\`
remember team meeting is Monday at 2pm
what's happening tomorrow?
generate an image of a cozy cat
\`\`\``,
        detailed: `📋 **All my features:**

**📅 CALENDAR**
- Ask «what's happening» to see plans
- Tell me dates and I'll remember them
- Use /calendar for interactive view
- «when is X?» for specific events

**💾 MEMORY**
- «remember [thing]» stores in memory
- «what do you remember?» retrieves everything
- Works across conversations

**🖼️ IMAGES**
- Say «generate an image of [description]»
- Try: «generate an image of a cozy cat by the fireplace»
- More detailed = better results

**📊 POLLS**
- «find a time for meeting» creates a poll
- «poll: [option 1] or [option 2]»

Ask «help» for overview!`
      }
    },

    calendar: {
      nb: {
        brief: `📅 **Kalenderhjelp:**

**Enkelt** - bare fortell meg tidspunktet:
«Vi har møte på mandag kl 14»
«Lunsj på fredag kl 12»

**Spesifikt** - bruk kalenderkommandoen:
• \`/kalender\` - se hele uken
• \`/kalender uke:1\` - hopp til uke 1
• \`/kalender måned:januar\` - hopp til måned

**Spør:**
«hva skjer i dag?» → dagens plan
«når er julen?» → finn en dato`,
        standard: `📅 **Slik lager du kalenderhendelser:**

**1. Enkelt (naturlig språk)**
Bare fortell meg når noe er:
• «Vi har møte på mandag kl 14»
• «Lunsj på fredag kl 12»
• «Julen er 25. desember»

**2. Spesifikt (/kalender)**
Bruk slash-kommandoen:
• \`/kalender\` → viser hele uken
• \`/kalender uke:1\` → gå til uke 1
• \`/kalender måned:januar\` → gå til januar

**3. Spør om ting**
• «hva skjer i dag?»
• «når er [hendelse]?»
• «vis kalender»

**Eksempel å prøve:**
\`\`\`
«Vi har møte på onsdag kl 15:00»
\`\`\``,
        detailed: `📅 **Komplett kalenderhjelp:**

**OPPRETTE HENDELSER**

**Metode 1: Naturlig språk**
Bare fortell meg! Eksempler:
- «Vi har møte på mandag kl 14»
- «Lunsj på fredag kl 12»
- «Julen er 25. desember kl 18:00»
- «Trening hver tirsdag kl 17»

**Metode 2: Kalenderkommando**
- \`/kalender\` → Vis ukens kalender
- Naviger med knapper (← →)

**SE HENDELSER**

- «hva skjer i dag?» → Dagens plan
- «hva skjer i morgen?» → Morgendagens plan  
- «når er [hendelse]?» → Søk etter hendelse
- «detaljer om 25. desember» → Spesifikk dag

**TIPS**
- Fortell meg tidspunkt så legger jeg det til
- Du kan svare «avtale» når jeg spør om noe er en avtale
- Spør «hva skjer» for rask oversikt`
      },
      en: {
        brief: `📅 **Calendar Help:**

**Simple** - just tell me the time:
«We have a meeting on Monday at 2pm»
«Lunch on Friday at 12pm»

**Specific** - use calendar command:
• \`/calendar\` - see the whole week
• \`/calendar week:1\` - jump to week 1
• \`/calendar month:january\` - jump to month

**Ask:**
«what's happening today?» → today's plans
«when is Christmas?» → find a date`,
        standard: `📅 **How to create calendar events:**

**1. Simple (natural language)**
Just tell me when something is:
• «We have a meeting on Monday at 2pm»
• «Lunch on Friday at 12pm»
• «Christmas is December 25th»

**2. Specific (/calendar)**
Use the slash command:
• \`/calendar\` → shows whole week
• \`/calendar week:1\` → jump to week 1
• \`/calendar month:january\` → jump to january

**3. Ask around**
• «what's happening today?»
• «when is [event]?»
• «show calendar»

**Example to try:**
\`\`\`
We have a meeting on Wednesday at 3pm
\`\`\``,
        detailed: `📅 **Complete Calendar Help:**

**CREATING EVENTS**

**Method 1: Natural Language**
Just tell me! Examples:
- «We have a meeting on Monday at 2pm»
- «Lunch on Friday at 12pm»
- «Christmas is December 25th at 6pm»
- «Training every Tuesday at 5pm»

**Method 2: Calendar Command**
- \`/calendar\` → Show week's calendar
- Navigate with buttons (← →)

**VIEWING EVENTS**

- «what's happening today?» → Today's plans
- «what's happening tomorrow?» → Tomorrow's plans
- «when is [event]?» → Search for event
- «details about December 25th» → Specific day

**TIPS**
- Tell me the time and I'll add it
- You can answer «event» when I ask if something is an event
- Ask «what's happening» for quick overview`
      }
    },

    memory: {
      nb: {
        brief: `💾 **Hukommelseshjelp:**

**Lagre:**
• «husk at jeg liker kaffe»
• «husk at Jonas er allergisk mot nøtter»
• «husk at møte kl 15»

**Hent:**
• «hva husker du?»
• «husker du noe?»

**Eksempel å prøve:**
\`\`\`
husk at vi trenger melk
hva husker du?
\`\`\``,
        standard: `💾 **Slik husker jeg ting:**

**LAGRE ET MINNE**
Bare si «husk at» + det du vil huske:
• «husk at jeg liker kaffe»
• «husk at Jonas er allergisk mot nøtter»
• «husk at møte kl 15»
• «husk at vi trenger melk»

**HENTE MINNER**
• «hva husker du?» → viser alle minner
• «husker du noe?» → viser alle minner

**TIPS**
- Minner varer evig (inntil slettet)
- Kan lagre alt - fakta, preferanser, avtaler
- Spør «hva husker du?» for å se alt`,
        detailed: `💾 **Komplett hukommelseshjelp:**

**LAGRE MINNER**

Si «husk at» + det du vil huske:
\`\`\`
husk at jeg liker kaffe
husk at Jonas er allergisk mot nøtter
husk at møte er kl 15
husk at vi trenger melk
husk at favorittfilmen min er Matrix
\`\`\`

**HENTE MINNER**

• «hva husker du?» → viser alle lagrede minner
• «husker du noe?» → viser alle minner
• «husker du [ting]?» → søk etter spesifikk ting

**SLETTE MINNER**
Foreløpig må du si «glem alt» så fjerner jeg alt.

**BRUKSOMRÅDER**
- Preferanser («husk at jeg er vegetarianer»)
- Fakta («husk at sjefen heter Marie»)
- Avtaler («husk at vi har møte kl 14»)
- Shopping («husk at vi trenger melk»)

**Eksempel:**
\`\`\`
Du: husk at jeg er allergisk mot gluten
Meg: Lagret! 💾

Du: hva husker du?
Meg: Du er allergisk mot gluten
\`\`\``
      },
      en: {
        brief: `💾 **Memory Help:**

**Store:**
• «remember I like coffee»
• «remember Jonas is allergic to nuts»
• «remember meeting at 3pm»

**Recall:**
• «what do you remember?»
• «do you remember anything?»

**Example to try:**
\`\`\`
remember we need milk
what do you remember?
\`\`\``,
        standard: `💾 **How I remember things:**

**STORE A MEMORY**
Just say «remember» + what you want to remember:
• «remember I like coffee»
• «remember Jonas is allergic to nuts»
• «remember meeting at 3pm»
• «remember we need milk»

**RETRIEVE MEMORIES**
• «what do you remember?» → shows all memories
• «do you remember anything?» → shows all memories

**TIPS**
- Memories last forever (until deleted)
- Can store anything - facts, preferences, agreements
- Ask «what do you remember?» to see everything`,
        detailed: `💾 **Complete Memory Help:**

**STORING MEMORIES**

Say «remember» + what you want to remember:
\`\`\`
remember I like coffee
remember Jonas is allergic to nuts
remember meeting is at 3pm
remember we need milk
remember my favorite movie is Matrix
\`\`\`

**RETRIEVING MEMORIES**

• «what do you remember?» → shows all stored memories
• «do you remember anything?» → shows all memories
• «do you remember [thing]?» → search for specific thing

**DELETING MEMORIES**
For now say «forget everything» and I'll clear it.

**USE CASES**
- Preferences («remember I'm vegetarian»)
- Facts («remember the boss is named Marie»)
- Agreements («remember we have meeting at 2pm»)
- Shopping («remember we need milk»)

**Example:**
\`\`\`
You: remember I'm allergic to gluten
Me: Stored! 💾

You: what do you remember?
Me: You're allergic to gluten
\`\`\``
      }
    },

    images: {
      nb: {
        brief: `🖼️ **Bildehjelp:**

Si bare «lag et bilde av» + beskrivelse:
• «lag et bilde av en katt»
• «tegn en strand i solnedgang»
• «generer et bilde av et fjell»

**Eksempel å prøve:**
\`\`\`
lag et bilde av en koselig katt ved peisen
\`\`\``,
        standard: `🖼️ **Slik genererer jeg bilder:**

**ENKELT**
Si «lag et bilde av» + det du vil se:
• «lag et bilde av en katt»
• «tegn en strand i solnedgang»
• «generer et bilde av et fjell»

**DETALJERT**
Jo mer beskrivelse, jo bedre bilde:
• «lag et bilde av en koselig katt som sitter ved peisen i stua»
• «tegn et fantasy-slott på toppen av et fjell i solnedgang»

**TIPS**
- Bruk engelske beskrivelser ofte bedre
- Prøv forskjellige stiler: «i stil med», «som illustrasjon», «fotorealistisk»
- Vær tålmodig - det tar ~30 sekunder`,
        detailed: `🖼️ **Komplett bildegenereringshjelp:**

**GRUNLEGGENDE**

Si «lag et bilde av» + beskrivelse:
\`\`\`
lag et bilde av en katt
tegn en hund
generer et bilde av en blomst
\`\`\`

**AVANSERT**

Jo mer detaljert beskrivelse, jo bedre resultat:
\`\`\`
lag et bilde av en koselig katt som sitter ved peisen i stua, i varmt lys

tegn et fantasy-slott på toppen av et fjell omgitt av skog, i solnedgang, digital kunst

generer et bilde av en neon-by i regnet, cyberpunk-stil, fotorealistisk
\`\`\`

**STIL-TIPS**
- «fotorealistisk» - ekte bilde
- «digital kunst» - illustrator-stil
- «i stil med [artist]» - kopier stil
- «som illustrasjon» / «som tegneserie»

**VENTETID**
- Tar typisk 20-60 sekunder
- Jeg sender bildet når det er klart!`
      },
      en: {
        brief: `🖼️ **Image Help:**

Just say «generate an image of» + description:
• «generate an image of a cat»
• «draw a sunset beach»
• «create an image of a mountain»

**Example to try:**
\`\`\`
generate an image of a cozy cat by the fireplace
\`\`\``,
        standard: `🖼️ **How I generate images:**

**SIMPLE**
Just say «generate an image of» + what you want to see:
• «generate an image of a cat»
• «draw a sunset beach»
• «create an image of a mountain»

**DETAILED**
More description = better image:
• «generate an image of a cozy cat sitting by the fireplace in the living room»
• «draw a fantasy castle on top of a mountain surrounded by forest at sunset»

**TIPS**
- English descriptions often work better
- Try different styles: «in the style of», «as illustration», «photorealistic»
- Be patient - takes ~30 seconds`,
        detailed: `🖼️ **Complete Image Generation Help:**

**BASIC**

Say «generate an image of» + description:
\`\`\`
generate an image of a cat
draw a dog
create an image of a flower
\`\`\`

**ADVANCED**

More detailed description = better result:
\`\`\`
generate an image of a cozy cat sitting by the fireplace in the living room, in warm light

draw a fantasy castle on top of a mountain surrounded by forest at sunset, digital art

create an image of a neon city in the rain, cyberpunk style, photorealistic
\`\`\`

**STYLE TIPS**
- «photorealistic» - real photo look
- «digital art» - illustrator style
- «in the style of [artist]» - copy style
- «as illustration» / «as cartoon»

**WAIT TIME**
- Typically takes 20-60 seconds
- I'll send the image when it's ready!`
      }
    },

    reminders: {
      nb: {
        brief: `⏰ **Påminnelseshjelp:**

Jeg husker automatisk tider og minner deg!
• «husk at møte kl 15» → påminnelse før møtet
• Fortell meg tidspunkt så ordner jeg resten

**Eksempel:**
«husk at vi har standup kl 09:00»`,
        standard: `⏰ **Påminnelser:**

Jeg kan huske tider og minne deg:

**AUTOMATISK**
Fortell meg et tidspunkt så husker jeg det:
• «husk at møte kl 15» → påminnelse før møtet
• «husk at standup er kl 09:00» → påminnelse neste dag

**MANUELLT**
• Si «påminnelse om [ting] kl [tid]»
• Jeg sender en påminnelse når tidspunktet nærmer seg

**TIPS**
- Påminnelser sendes ~1 time før hendelsen
- Spør «hvilke påminnelser har jeg?» for å se aktive`,
        detailed: `⏰ **Komplett påminnelseshjelp:**

**AUTOMATISKE PÅMINNELSER**

Når du forteller meg om en hendelse med tidspunkt:
\`\`\`
husk at møte kl 15
husk at standup er hver dag kl 09:00
husk at julen er 25. desember kl 18:00
\`\`\`

Jeg sender en påminnelse ~1 time før!

**MANUELLE PÅMINNELSER**

• «påminnelse om å ringe Per kl 14:00»
• «husk at jeg skal kjøpe melk»

**SE PÅMINNELSER**

Foreløpig viser jeg påminnelser når du spør om kalenderen.

**TIPS**
- Fortell meg «kl» + tidspunkt så lager jeg påminnelse
- Påminnelser gjelder kun for kommende hendelser`
      },
      en: {
        brief: `⏰ **Reminder Help:**

I automatically remember times and remind you!
• «remember meeting at 3pm» → reminder before the meeting
• Just tell me a time and I'll handle the rest

**Example:**
«remember we have standup at 9am»`,
        standard: `⏰ **Reminders:**

I can remember times and remind you:

**AUTOMATIC**
Just tell me a time and I'll remember:
• «remember meeting at 3pm» → reminder before meeting
• «remember standup is at 9am» → reminder next day

**MANUAL**
• Say «remind me to [thing] at [time]»
• I'll send a reminder when the time approaches

**TIPS**
- Reminders sent ~1 hour before event
- Ask «what reminders do I have?» to see active ones`,
        detailed: `⏰ **Complete Reminder Help:**

**AUTOMATIC REMINDERS**

When you tell me about an event with a time:
\`\`\`
remember meeting at 3pm
remember standup is every day at 9am
remember Christmas is December 25th at 6pm
\`\`\`

I'll send a reminder ~1 hour before!

**MANUAL REMINDERS**

• «remind me to call Per at 2pm»
• «remember to buy milk»

**VIEW REMINDERS**

For now I show reminders when you ask about the calendar.

**TIPS**
- Tell me «at» + time and I'll create a reminder
- Reminders only apply to upcoming events`
      }
    },

    polls: {
      nb: {
        brief: `📊 **Avstemningshjelp:**

**Enkelt:**
• «finn en tid for møte»
• «avstemning: pizza eller burgere?»

**Eksempel:**
«avstemning: spansk eller italiensk?»`,
        standard: `📊 **Avstemninger:**

**LAGRE AVSTEMNING**
• «finn en tid for møte» → lager tidspunkt-poll
• «avstemning: pizza eller burgere?» → ja/nei poll
• «poll: kino eller bowling?»

**BRUK**
- Jeg lager en poll i chatten
- Alle kan stemme med reactions
- Resultatet vises automatisk

**TIPS**
- Vær tydelig på alternativene
- «eller» fungerer bra som skilletegn`,
        detailed: `📊 **Komplett avstemningshjelp:**

**TIDSAVSTEMNING**

Finne beste tidspunkt:
\`\`\`
finn en tid for møte
finn en tid for standup
når passer det best for alle?
\`\`\`

Jeg spør deltakerne om preferanser og finner beste tidspunkt.

**ALTERNATIV-AVSEMNING**

Velge mellom alternativer:
\`\`\`
avstemning: pizza eller burgere?
poll: spansk eller italiensk?
kino eller bowling?
\`\`\`

**HVORDAN STEMME**
- Klikk på reaction under poll
- ✅ = ja, ❌ = nei, 🤔 = kanskje

**TIPS**
- Vær tydelig på alternativene
- Bruk «eller» mellom alternativene
- Max ~10 alternativ per avstemning`
      },
      en: {
        brief: `📊 **Poll Help:**

**Simple:**
• «find a time for meeting»
• «poll: pizza or burgers?»

**Example:**
«poll: spanish or italian?»`,
        standard: `📊 **Polls:**

**CREATE POLL**
• «find a time for meeting» → creates time poll
• «poll: pizza or burgers?» → yes/no poll
• «vote: cinema or bowling?»

**USAGE**
- I create a poll in chat
- Everyone can vote with reactions
- Results show automatically

**TIPS**
- Be clear with alternatives
- «or» works well as separator`,
        detailed: `📊 **Complete Poll Help:**

**TIME POLLS**

Find best time:
\`\`\`
find a time for meeting
find a time for standup
when works best for everyone?
\`\`\`

I ask participants for preferences and find the best time.

**ALTERNATIVE POLLS**

Choose between alternatives:
\`\`\`
poll: pizza or burgers?
vote: spanish or italian?
cinema or bowling?
\`\`\`

**HOW TO VOTE**
- Click on reaction under poll
- ✅ = yes, ❌ = no, 🤔 = maybe

**TIPS**
- Be clear with alternatives
- Use «or» between alternatives
- Max ~10 alternatives per poll`
      }
    },

    overview: {
      nb: {
        brief: `❓ **Hjelp!**

Jeg kan hjelpe deg med:

📅 **Kalender** - «hva skjer i dag?»
💾 **Minner** - «husk at jeg liker kaffe»
🖼️ **Bilder** - «lag et bilde av en katt»
📊 **Avstemninger** - «finn en tid for møte»

**Prøv dette:**
\`\`\`
hva kan du?
hvordan lage en avtale?
husk at møte kl 15
\`\`\``,
        standard: `❓ **Hjelpeoversikt**

Jeg er her for å hjelpe! Her er en oversikt:

**📅 KALENDER**
- Spør «hva skjer i dag?»
- Fortell meg tidspunkt så lager jeg hendelse
- Bruk /kalender for interaktiv visning

**💾 HUKOMMELSE**
- Si «husk at [ting]» for å lagre
- Spør «hva husker du?» for å hente

**🖼️ BILDER**
- Si «lag et bilde av [beskrivelse]»

**📊 AVSTEMNINGER**
- «finn en tid for møte»
- «avstemning: A eller B?»

**KOM I GANG:**
\`\`\`
1. «hva kan du?» → se alle muligheter
2. «hvordan lage en avtale?» → kalenderhjelp
3. Prøv selv!
\`\`\`

Spør meg om hva som helst!`,
        detailed: `❓ **Komplett hjelp - Oversikt**

**HVORFOR KAN JEG HJELPE?**

Jeg er en AI-assistent som lever i Discord-gruppa di. Bruk @nevnet for å aktivere meg.

**HVA KAN JEG GJØRE?**

| Funksjon | Eksempel | Beskrivelse |
|----------|----------|-------------|
| Kalender | «hva skjer i dag?» | Se planer, legg til hendelser |
| Minne | «husk at...» | Lagre viktige ting |
| Bilder | «lag et bilde av...» | Generere bilder |
| Avstemning | «finn en tid for...» | Finne beste tidspunkt |
| Påminnelse | Automatisk | Minne om kommende ting |

**KOM I GANG**

1. **Lær meg å kjenne:**
   - «husk at jeg liker kaffe»

2. **Sjekk kalenderen:**
   - «hva skjer i dag?»

3. **Prøv bilder:**
   - «lag et bilde av en katt»

4. **Spar tid med avstemninger:**
   - «finn en tid for møte»

**TRENGER DU MER HJELP?**

- «hvordan lage en avtale?» → kalenderdetaljer
- «hvordan huske ting?» → minnehjelp
- «hvordan generere bilder?» → bildehjelp
- «help» → denne meldingen`
      },
      en: {
        brief: `❓ **Help!**

I can help you with:

📅 **Calendar** - «what's happening today?»
💾 **Memory** - «remember I like coffee»
🖼️ **Images** - «generate an image of a cat»
📊 **Polls** - «find a time for meeting»

**Try this:**
\`\`\`
what can you do?
how to create an event?
remember meeting at 3pm
\`\`\``,
        standard: `❓ **Help Overview**

I'm here to help! Here's an overview:

**📅 CALENDAR**
- Ask «what's happening today?»
- Tell me a time and I'll create an event
- Use /calendar for interactive view

**💾 MEMORY**
- Say «remember [thing]» to store
- Ask «what do you remember?» to retrieve

**🖼️ IMAGES**
- Say «generate an image of [description]»

**📊 POLLS**
- «find a time for meeting»
- «poll: A or B?»

**GET STARTED:**
\`\`\`
1. «what can you do?» → see all possibilities
2. «how to create an event?» → calendar help
3. Try it yourself!
\`\`\`

Ask me anything!`,
        detailed: `❓ **Complete Help - Overview**

**WHAT CAN I HELP WITH?**

I'm an AI assistant living in your Discord group. Mention me with @ to activate me.

**WHAT CAN I DO?**

| Feature | Example | Description |
|---------|---------|-------------|
| Calendar | «what's happening today?» | See plans, add events |
| Memory | «remember I like...» | Store important things |
| Images | «generate an image of...» | Create images |
| Polls | «find a time for...» | Find best time |
| Reminders | Automatic | Remind about upcoming things |

**GETTING STARTED**

1. **Get to know me:**
   - «remember I like coffee»

2. **Check the calendar:**
   - «what's happening today?»

3. **Try images:**
   - «generate an image of a cat»

4. **Save time with polls:**
   - «find a time for meeting»

**NEED MORE HELP?**

- «how to create an event?» → calendar details
- «how to remember things?» → memory help
- «how to generate images?» → image help
- «help» → this message`
      }
    }
  };
}
