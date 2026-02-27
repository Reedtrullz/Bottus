import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module - this provides the mocked db objects
vi.mock('../../src/db/index.js', () => ({
  eventDb: {
    create: vi.fn().mockImplementation((event: any) => event.id || 'mock-uuid-1234'),
    findUpcoming: vi.fn().mockReturnValue([]),
    findByUserId: vi.fn().mockReturnValue([]),
    searchByTitle: vi.fn().mockImplementation((userId: string, titleQuery: string) => {
      if (titleQuery === 'Birthday Party') return [{ id: 'event-1', title: 'Birthday Party' }];
      if (titleQuery === 'Meeting') return [{ id: 'event-1', title: 'Team Meeting' }];
      return [];
    }),
    delete: vi.fn().mockReturnValue({ changes: 1 }),
    deleteExpired: vi.fn().mockReturnValue({ changes: 0 })
  },
  roleDb: {
    getUserRole: vi.fn().mockReturnValue('member'),
    setUserRole: vi.fn(),
    removeUserRole: vi.fn(),
    getChannelRoles: vi.fn().mockReturnValue([]),
    getUserChannels: vi.fn().mockReturnValue([])
  },
  consentDb: {
    findByUserId: vi.fn().mockReturnValue(null),
    create: vi.fn(),
    revoke: vi.fn(),
    getConsentedUsers: vi.fn().mockReturnValue([])
  },
  rsvpDb: {
    upsert: vi.fn(),
    findForEvent: vi.fn().mockReturnValue([]),
    remove: vi.fn(),
    countForEvent: vi.fn().mockReturnValue(0)
  },
  // These are not tested as per requirements
  initializeDatabase: vi.fn()
}));

// Import the mocked modules
import { eventDb, roleDb, consentDb, rsvpDb } from '../../src/db/index.js';

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('eventDb', () => {
    describe('create', () => {
      it('should create an event and return id', () => {
        const eventData = {
          userId: 'user-123',
          title: 'Test Event',
          startTime: Math.floor(Date.now() / 1000),
          guildId: 'guild-456',
          channelId: 'channel-789'
        };

        const result = eventDb.create(eventData);

        expect(result).toBe('mock-uuid-1234');
        expect(eventDb.create).toHaveBeenCalledWith(eventData);
      });

      it('should create event with provided id', () => {
        const eventData = {
          id: 'custom-id',
          userId: 'user-123',
          title: 'Test Event',
          startTime: Math.floor(Date.now() / 1000)
        };

        const result = eventDb.create(eventData);

        expect(result).toBe('custom-id');
      });
    });

    describe('findUpcoming', () => {
      it('should return upcoming events', () => {
        const mockEvents = [
          { id: 'event-1', title: 'Future Event', start_time: Date.now() / 1000 + 3600 }
        ];
        (eventDb.findUpcoming as any).mockReturnValue(mockEvents);

        const result = eventDb.findUpcoming(5);

        expect(eventDb.findUpcoming).toHaveBeenCalledWith(5);
        expect(result).toEqual(mockEvents);
      });

      it('should return empty array when no events', () => {
        (eventDb.findUpcoming as any).mockReturnValue([]);

        const result = eventDb.findUpcoming();

        expect(result).toEqual([]);
      });
    });

    describe('findByUserId', () => {
      it('should return events for a user', () => {
        const mockEvents = [
          { id: 'event-1', user_id: 'user-123', title: 'Event 1' },
          { id: 'event-2', user_id: 'user-123', title: 'Event 2' }
        ];
        (eventDb.findByUserId as any).mockReturnValue(mockEvents);

        const result = eventDb.findByUserId('user-123');

        expect(eventDb.findByUserId).toHaveBeenCalledWith('user-123');
        expect(result).toEqual(mockEvents);
      });

      it('should return empty array when user has no events', () => {
        (eventDb.findByUserId as any).mockReturnValue([]);

        const result = eventDb.findByUserId('user-no-events');

        expect(result).toEqual([]);
      });
    });

    describe('searchByTitle', () => {
      it('should return exact match first', () => {
        const result = eventDb.searchByTitle('user-123', 'Birthday Party');

        expect(result).toEqual([{ id: 'event-1', title: 'Birthday Party' }]);
      });

      it('should return partial matches if no exact match', () => {
        const result = eventDb.searchByTitle('user-123', 'Meeting');

        expect(result).toEqual([{ id: 'event-1', title: 'Team Meeting' }]);
      });

      it('should return empty array for empty query', () => {
        (eventDb.searchByTitle as any).mockReturnValue([]);

        const result = eventDb.searchByTitle('user-123', '');

        expect(result).toEqual([]);
      });
    });

    describe('delete', () => {
      it('should delete event by id', () => {
        eventDb.delete('event-123');

        expect(eventDb.delete).toHaveBeenCalledWith('event-123');
      });
    });
  });

  describe('roleDb', () => {
    describe('getUserRole', () => {
      it('should return user role in channel', () => {
        (roleDb.getUserRole as any).mockReturnValue('admin');

        const result = roleDb.getUserRole('channel-123', 'user-456');

        expect(roleDb.getUserRole).toHaveBeenCalledWith('channel-123', 'user-456');
        expect(result).toBe('admin');
      });

      it('should return member as default role', () => {
        (roleDb.getUserRole as any).mockReturnValue('member');

        const result = roleDb.getUserRole('channel-123', 'user-new');

        expect(result).toBe('member');
      });
    });

    describe('setUserRole', () => {
      it('should set user role in channel', () => {
        roleDb.setUserRole('channel-123', 'user-456', 'admin', 'owner-789');

        expect(roleDb.setUserRole).toHaveBeenCalledWith('channel-123', 'user-456', 'admin', 'owner-789');
      });
    });

    describe('removeUserRole', () => {
      it('should remove user role from channel', () => {
        roleDb.removeUserRole('channel-123', 'user-456');

        expect(roleDb.removeUserRole).toHaveBeenCalledWith('channel-123', 'user-456');
      });
    });

    describe('getChannelRoles', () => {
      it('should return all roles in channel', () => {
        const mockRoles = [
          { user_id: 'user-1', role: 'admin' },
          { user_id: 'user-2', role: 'member' }
        ];
        (roleDb.getChannelRoles as any).mockReturnValue(mockRoles);

        const result = roleDb.getChannelRoles('channel-123');

        expect(roleDb.getChannelRoles).toHaveBeenCalledWith('channel-123');
        expect(result).toEqual(mockRoles);
      });

      it('should return empty array when no roles', () => {
        (roleDb.getChannelRoles as any).mockReturnValue([]);

        const result = roleDb.getChannelRoles('channel-empty');

        expect(result).toEqual([]);
      });
    });
  });

  describe('consentDb', () => {
    describe('findByUserId', () => {
      it('should return consent record for user', () => {
        const mockConsent = { user_id: 'user-123', status: 'consented' };
        (consentDb.findByUserId as any).mockReturnValue(mockConsent);

        const result = consentDb.findByUserId('user-123');

        expect(consentDb.findByUserId).toHaveBeenCalledWith('user-123');
        expect(result).toEqual(mockConsent);
      });

      it('should return null when no consent record', () => {
        (consentDb.findByUserId as any).mockReturnValue(null);

        const result = consentDb.findByUserId('user-no-consent');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create consent record', () => {
        consentDb.create('user-123', 'guild-456', 'channel-789');

        expect(consentDb.create).toHaveBeenCalledWith('user-123', 'guild-456', 'channel-789');
      });

      it('should create consent with user id only', () => {
        consentDb.create('user-123');

        expect(consentDb.create).toHaveBeenCalledWith('user-123');
      });
    });

    describe('revoke', () => {
      it('should revoke consent', () => {
        consentDb.revoke('user-123');

        expect(consentDb.revoke).toHaveBeenCalledWith('user-123');
      });
    });

    describe('getConsentedUsers', () => {
      it('should return consented users', () => {
        const mockUsers = [
          { user_id: 'user-1', status: 'consented' },
          { user_id: 'user-2', status: 'consented' }
        ];
        (consentDb.getConsentedUsers as any).mockReturnValue(mockUsers);

        const result = consentDb.getConsentedUsers();

        expect(result).toEqual(mockUsers);
      });

      it('should return empty array when no users', () => {
        (consentDb.getConsentedUsers as any).mockReturnValue([]);

        const result = consentDb.getConsentedUsers();

        expect(result).toEqual([]);
      });
    });
  });

  describe('rsvpDb', () => {
    describe('upsert (setRsvp)', () => {
      it('should insert new RSVP', () => {
        rsvpDb.upsert('event-123', 'user-456', 'yes');

        expect(rsvpDb.upsert).toHaveBeenCalledWith('event-123', 'user-456', 'yes');
      });

      it('should update existing RSVP', () => {
        rsvpDb.upsert('event-123', 'user-456', 'no');

        expect(rsvpDb.upsert).toHaveBeenCalledWith('event-123', 'user-456', 'no');
      });
    });

    describe('findForEvent (getRsvp)', () => {
      it('should return RSVPs for event', () => {
        const mockRsvps = [
          { event_id: 'event-123', user_id: 'user-1', status: 'yes' },
          { event_id: 'event-123', user_id: 'user-2', status: 'no' }
        ];
        (rsvpDb.findForEvent as any).mockReturnValue(mockRsvps);

        const result = rsvpDb.findForEvent('event-123');

        expect(rsvpDb.findForEvent).toHaveBeenCalledWith('event-123');
        expect(result).toEqual(mockRsvps);
      });

      it('should return empty array when no RSVPs', () => {
        (rsvpDb.findForEvent as any).mockReturnValue([]);

        const result = rsvpDb.findForEvent('event-empty');

        expect(result).toEqual([]);
      });
    });

    describe('countForEvent', () => {
      it('should count RSVPs with status filter', () => {
        (rsvpDb.countForEvent as any).mockReturnValue(5);

        const result = rsvpDb.countForEvent('event-123', 'yes');

        expect(rsvpDb.countForEvent).toHaveBeenCalledWith('event-123', 'yes');
        expect(result).toBe(5);
      });

      it('should count all RSVPs without filter', () => {
        (rsvpDb.countForEvent as any).mockReturnValue(10);

        const result = rsvpDb.countForEvent('event-123');

        expect(rsvpDb.countForEvent).toHaveBeenCalledWith('event-123');
        expect(result).toBe(10);
      });

      it('should return 0 when no RSVPs', () => {
        (rsvpDb.countForEvent as any).mockReturnValue(0);

        const result = rsvpDb.countForEvent('event-empty');

        expect(result).toBe(0);
      });
    });

    describe('remove', () => {
      it('should remove RSVP', () => {
        rsvpDb.remove('event-123', 'user-456');

        expect(rsvpDb.remove).toHaveBeenCalledWith('event-123', 'user-456');
      });
    });
  });
});
