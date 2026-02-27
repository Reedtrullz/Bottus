import { describe, it, expect } from 'vitest';
import type { UserProfile } from '../../src/services/user-profile.js';
import { userProfileService } from '../../src/services/user-profile.js';

describe('UserProfileService', () => {
  describe('UserProfile interface', () => {
    it('should have all required profile fields', () => {
      const profile: UserProfile = {
        name: 'Test User',
        timezone: 'America/New_York',
        language: 'en-US',
        communicationStyle: 'professional',
        responseLength: 'detailed',
        technicalLevel: 'expert',
        primaryRole: 'Developer',
        mainProjects: 'Bottus',
        toolsYouUse: 'TypeScript',
        topicsOfInterest: ['AI', 'Discord'],
        specialInstructions: 'Be concise',
        rawContent: '# User Profile'
      };

      expect(profile.name).toBe('Test User');
      expect(profile.topicsOfInterest).toHaveLength(2);
      expect(profile.topicsOfInterest).toContain('AI');
    });
  });

  describe('parseUserMarkdown', () => {
    // Access private method via the singleton instance's prototype
    const parseMethod = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(userProfileService),
      'parseUserMarkdown'
    )?.value as (content: string) => UserProfile;

    it('should parse name from markdown', () => {
      const content = `**Name**: John Doe`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.name).toBe('John Doe');
    });

    it('should parse timezone from markdown', () => {
      const content = `**Timezone**: America/Los_Angeles`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.timezone).toBe('America/Los_Angeles');
    });

    it('should parse language from markdown', () => {
      const content = `**Language**: en-US`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.language).toBe('en-US');
    });

    it('should parse communication style - casual', () => {
      const content = `
## Communication Style
- [x] Casual
- [ ] Professional
- [ ] Technical
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.communicationStyle).toBe('casual');
    });

    it('should parse communication style - professional', () => {
      const content = `
## Communication Style
- [ ] Casual
- [x] Professional
- [ ] Technical
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.communicationStyle).toBe('professional');
    });

    it('should parse communication style - technical', () => {
      const content = `
## Communication Style
- [ ] Casual
- [ ] Professional
- [x] Technical
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.communicationStyle).toBe('technical');
    });

    it('should parse response length - brief', () => {
      const content = `
## Response Length
- [x] Brief
- [ ] Detailed
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.responseLength).toBe('brief');
    });

    it('should parse response length - detailed', () => {
      const content = `
## Response Length
- [ ] Brief
- [x] Detailed
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.responseLength).toBe('detailed');
    });

    it('should parse technical level - beginner', () => {
      const content = `
## Technical Level
- [x] Beginner
- [ ] Expert
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.technicalLevel).toBe('beginner');
    });

    it('should parse technical level - expert', () => {
      const content = `
## Technical Level
- [ ] Beginner
- [x] Expert
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.technicalLevel).toBe('expert');
    });

    it('should parse primary role', () => {
      const content = `**Primary Role**: Software Engineer`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.primaryRole).toBe('Software Engineer');
    });

    it('should parse main projects', () => {
      const content = `**Main Projects**: Bottus, NanoBot`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.mainProjects).toBe('Bottus, NanoBot');
    });

    it('should parse special instructions', () => {
      const content = `
## Special Instructions
Always use Norwegian greetings.

---
More content
      `;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.specialInstructions).toBe('Always use Norwegian greetings.');
    });

    it('should parse special instructions at end of file', () => {
      const content = `
## Special Instructions
Be friendly and helpful.
`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.specialInstructions).toBe('Be friendly and helpful.');
    });

    it('should use defaults when fields are missing', () => {
      const content = `**Name**: Test User`;
      const profile = parseMethod.call(userProfileService, content);

      expect(profile.name).toBe('Test User');
      // These fields should use defaults
      expect(profile.timezone).toBe('Europe/Oslo');
      expect(profile.language).toBe('nb-NO');
      expect(profile.communicationStyle).toBe('casual');
    });
  });
});
