
export async function registerCommands(bot: any): Promise<void> {
  const commands = [
    {
      name: 'propose',
      nameLocalizations: {
        'no': 'forslag'
      },
      description: 'Submit a proposal for the group to vote on',
      descriptionLocalizations: {
        'no': 'Send et forslag som gruppen kan stemme på'
      },
      options: [
        {
          name: 'tekst',
          nameLocalizations: {
            'no': 'tekst'
          },
          description: 'The proposal text',
          descriptionLocalizations: {
            'no': 'Forslagsteksten'
          },
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'jeg-samtykker',
      description: 'Opt-in to data processing',
      descriptionLocalizations: {
        'no': 'Samtykke til databehandling'
      }
    },
    {
      name: 'jeg-tilbakekall',
      description: 'Revoke consent',
      descriptionLocalizations: {
        'no': 'Tilbakekall samtykke'
      }
    },
    {
      name: 'kalender',
      description: 'Calendar commands',
      descriptionLocalizations: {
        'no': 'Kalenderkommandoer'
      },
      options: [
        {
          name: 'uke',
          nameLocalizations: { 'no': 'uke' },
          description: 'Uke-nummer for navigasjon',
          descriptionLocalizations: { 'no': 'Uke-nummer for navigasjon' },
          type: 4,
          required: false
        },
        {
          name: 'handling',
          nameLocalizations: { 'no': 'handling' },
          description: 'What to do',
          type: 3,
          choices: [
            { name: 'List', nameLocalizations: { 'no': 'Liste' }, value: 'list' },
            { name: 'Add', nameLocalizations: { 'no': 'Legg til' }, value: 'add' }
          ]
        }
      ]
    },
    {
      name: 'forslag',
      description: 'Submit a proposal (alias)',
      descriptionLocalizations: {
        'no': 'Send et forslag'
      },
      options: [
        {
          name: 'tekst',
          nameLocalizations: { 'no': 'tekst' },
          description: 'The proposal text',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'dictate',
      nameLocalizations: {
        'no': 'diktér'
      },
      description: 'Directly prompt AI to implement changes',
      descriptionLocalizations: {
        'no': 'Direkte prompt AI til å implementere endringer'
      },
      options: [
        {
          name: 'tekst',
          nameLocalizations: {
            'no': 'tekst'
          },
          description: 'What you want implemented',
          descriptionLocalizations: {
            'no': 'Hva du vil ha implementert'
          },
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'godkjenn',
      description: 'Approve an improvement suggestion',
      options: [
        {
          name: 'id',
          description: 'Suggestion ID to approve (use without ID to list pending)',
          type: 3,
          required: false
        }
      ]
    }
  ];

  try {
    await bot.application?.commands.create(commands);
    console.log('✅ Slash commands registered');
  } catch (e) {
    console.error('Failed to register commands:', e);
  }
}
