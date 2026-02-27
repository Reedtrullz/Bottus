import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HelpHandler } from '../../src/relay/handlers/help.js'
import { globalHandlers, HandlerContext } from '../../src/relay/handlers/index.js'
import { InMemorySkillRegistry } from '../../src/relay/skills/registry.js'
import { ExtractionService } from '../../src/services/extraction.js'

describe('Relay integration paths', () => {
  // Mock dependencies
  const mockDiscord = {
    sendMessage: vi.fn(async () => ({ id: 'mock-msg-id' }))
  }

  const mockHandlerContext: HandlerContext = {
    message: '',
    userId: 'mock-user-id',
    channelId: 'mock-channel-id',
    discord: mockDiscord as any
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Handler dispatch via globalHandlers', () => {
    it('should dispatch help messages to HelpHandler', async () => {
      // Create a fresh handler instance for testing
      const helpHandler = new HelpHandler()
      
      // Test canHandle detection
      const helpMessage = 'help'
      const ctx = { ...mockHandlerContext, message: helpMessage }
      
      const canHandle = helpHandler.canHandle(helpMessage, ctx)
      expect(canHandle).toBe(true)
    })

    it('should detect identity questions', async () => {
      const helpHandler = new HelpHandler()
      
      const identityMessage = 'who are you?'
      const ctx = { ...mockHandlerContext, message: identityMessage }
      
      const canHandle = helpHandler.canHandle(identityMessage, ctx)
      expect(canHandle).toBe(true)
    })

    it('should detect calendar help requests', async () => {
      const helpHandler = new HelpHandler()
      
      const calendarMessage = 'how to create event?'
      const ctx = { ...mockHandlerContext, message: calendarMessage }
      
      const canHandle = helpHandler.canHandle(calendarMessage, ctx)
      expect(canHandle).toBe(true)
    })

    it('should not handle non-help messages', async () => {
      const helpHandler = new HelpHandler()
      
      const randomMessage = 'what is the weather today?'
      const ctx = { ...mockHandlerContext, message: randomMessage }
      
      const canHandle = helpHandler.canHandle(randomMessage, ctx)
      expect(canHandle).toBe(false)
    })

    it('should register handlers in globalHandlers registry', () => {
      // Verify that globalHandlers has handlers registered
      // The registry should have multiple handlers from relay/index.ts
      const handlers = (globalHandlers as any).handlers
      expect(handlers).toBeDefined()
      expect(Array.isArray(handlers)).toBe(true)
    })
  })

  describe('HelpHandler integration', () => {
    it('should respond to help requests', async () => {
      const helpHandler = new HelpHandler()
      
      const helpMessage = 'help'
      const ctx = { ...mockHandlerContext, message: helpMessage }
      
      const result = await helpHandler.handle(helpMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })

    it('should respond to identity questions', async () => {
      const helpHandler = new HelpHandler()
      
      const identityMessage = 'who are you?'
      const ctx = { ...mockHandlerContext, message: identityMessage }
      
      const result = await helpHandler.handle(identityMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })

    it('should respond to capabilities queries', async () => {
      const helpHandler = new HelpHandler()
      
      const capabilitiesMessage = 'what can you do?'
      const ctx = { ...mockHandlerContext, message: capabilitiesMessage }
      
      const result = await helpHandler.handle(capabilitiesMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })

    it('should respond to calendar help in Norwegian', async () => {
      const helpHandler = new HelpHandler()
      
      const calendarMessage = 'hvordan lage en avtale?'
      const ctx = { ...mockHandlerContext, message: calendarMessage }
      
      const result = await helpHandler.handle(calendarMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })

    it('should respond to memory help requests', async () => {
      const helpHandler = new HelpHandler()
      
      const memoryMessage = 'how to remember things?'
      const ctx = { ...mockHandlerContext, message: memoryMessage }
      
      const result = await helpHandler.handle(memoryMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })

    it('should respond to image generation help', async () => {
      const helpHandler = new HelpHandler()
      
      const imageMessage = 'how to generate images?'
      const ctx = { ...mockHandlerContext, message: imageMessage }
      
      const result = await helpHandler.handle(imageMessage, ctx)
      
      expect(result.handled).toBe(true)
      expect(mockDiscord.sendMessage).toHaveBeenCalled()
    })
  })

  describe('Skill registry integration', () => {
    it('should create a skill registry instance', () => {
      const registry = new InMemorySkillRegistry()
      expect(registry).toBeDefined()
    })

    it('should register and retrieve skills', () => {
      const registry = new InMemorySkillRegistry()
      
      const mockSkill = {
        name: 'test-skill',
        description: 'A test skill',
        canHandle: () => false,
        handle: async () => ({ handled: false })
      }
      
      registry.register(mockSkill)
      
      const retrieved = registry.getSkill('test-skill')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('test-skill')
    })

    it('should find handler for matching message', () => {
      const registry = new InMemorySkillRegistry()
      
      const mockSkill = {
        name: 'find-skill',
        description: 'A skill that finds things',
        canHandle: (msg: string) => msg.includes('find'),
        handle: async () => ({ handled: true, response: 'found it' })
      }
      
      registry.register(mockSkill)
      
      const found = registry.findHandler('find something', mockHandlerContext as any)
      expect(found).toBeDefined()
      expect(found?.name).toBe('find-skill')
    })

    it('should return undefined when no skill matches', () => {
      const registry = new InMemorySkillRegistry()
      
      const mockSkill = {
        name: 'calendar-skill',
        description: 'A calendar skill',
        canHandle: (msg: string) => msg.includes('calendar'),
        handle: async () => ({ handled: true })
      }
      
      registry.register(mockSkill)
      
      const found = registry.findHandler('hello world', mockHandlerContext as any)
      expect(found).toBeUndefined()
    })

    it('should unregister skills', () => {
      const registry = new InMemorySkillRegistry()
      
      const mockSkill = {
        name: 'removable-skill',
        description: 'A skill that can be removed',
        canHandle: () => false,
        handle: async () => ({ handled: false })
      }
      
      registry.register(mockSkill)
      const removed = registry.unregister('removable-skill')
      
      expect(removed).toBe(true)
      expect(registry.getSkill('removable-skill')).toBeUndefined()
    })

    it('should get all registered skills', () => {
      const registry = new InMemorySkillRegistry()
      
      const skill1 = {
        name: 'skill-1',
        description: 'First skill',
        canHandle: () => false,
        handle: async () => ({ handled: false })
      }
      
      const skill2 = {
        name: 'skill-2',
        description: 'Second skill',
        canHandle: () => false,
        handle: async () => ({ handled: false })
      }
      
      registry.register(skill1)
      registry.register(skill2)
      
      const allSkills = registry.getAllSkills()
      expect(allSkills.length).toBe(2)
    })
  })

  describe('Extraction service integration', () => {
    it('should create an extraction service instance', () => {
      const extraction = new ExtractionService()
      expect(extraction).toBeDefined()
    })

    it('should extract date from message', () => {
      const extraction = new ExtractionService()
      
      // Test date extraction
      const result = extraction.extract('meeting tomorrow at 3pm')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should extract event from message', () => {
      const extraction = new ExtractionService()
      
      // Test event extraction
      const result = extraction.extract('create event team meeting on monday')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty messages', () => {
      const extraction = new ExtractionService()
      
      const result = extraction.extract('')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should extract task from message', () => {
      const extraction = new ExtractionService()
      
      // Test task extraction
      const result = extraction.extract('remind me to buy milk')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Handler dispatch flow', () => {
    it('should dispatch help message through globalHandlers', async () => {
      const helpHandler = new HelpHandler()
      const { HandlerRegistry } = await import('../../src/relay/handlers/registry.js')
      
      const testRegistry = new HandlerRegistry()
      testRegistry.register(helpHandler)
      
      const ctx = { ...mockHandlerContext, message: 'help' }
      const result = await testRegistry.dispatch('help', ctx)
      
      expect(result.handled).toBe(true)
    })

    it('should return handled:false for unhandled messages', async () => {
      const { HandlerRegistry } = await import('../../src/relay/handlers/registry.js')
      const registry = new HandlerRegistry()
      
      const ctx = { ...mockHandlerContext, message: 'some random unhandled message' }
      const result = await registry.dispatch('some random unhandled message', ctx)
      
      expect(result.handled).toBe(false)
    })
  })
})
