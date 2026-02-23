import { consentDb } from '../db/index.js';

export class ConsentManager {
  async handleOptIn(interaction: any): Promise<void> {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    
    const existing = consentDb.findByUserId(userId) as { status?: string } | undefined;
    
    if (existing && existing.status === 'consented') {
      await interaction.reply({
        content: 'Du har allerede samtykket! Botten leser allerede meldingene dine.',
        ephemeral: true
      });
      return;
    }
    
    if (existing && existing.status === 'revoked') {
      consentDb.create(userId, guildId || undefined, channelId || undefined);
    } else if (!existing) {
      consentDb.create(userId, guildId || undefined, channelId || undefined);
    }
    
    await interaction.reply({
      content: 'Takk! Samtykke registrert. Botten vil nå lese meldingene dine og hjelpe med kalender og oppgaver.',
      ephemeral: true
    });
  }
  
  async handleRevocation(interaction: any): Promise<void> {
    const userId = interaction.user.id;
    
    const existing = consentDb.findByUserId(userId) as { status?: string } | undefined;
    
    if (!existing || existing.status !== 'consented') {
      await interaction.reply({
        content: 'Du har ikke gitt samtykke enda. Bruk /jeg-samtykker først.',
        ephemeral: true
      });
      return;
    }
    
    consentDb.revoke(userId);
    
    await interaction.reply({
      content: 'Samtykke tilbakekalt. Botten slutter å lese meldingene dine og vil slette dataene dine.',
      ephemeral: true
    });
  }
  
  hasConsent(userId: string): boolean {
    const consent = consentDb.findByUserId(userId) as { status?: string } | undefined;
    return consent?.status === 'consented';
  }
  
  getConsentedUsers(): string[] {
    const consented = consentDb.getConsentedUsers() as any[];
    return consented.map(c => c.user_id);
  }
}
