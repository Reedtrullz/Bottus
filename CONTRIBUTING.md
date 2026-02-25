# Contributing Guide

Thank you for your interest in contributing to the Ine-Discord project!

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git
- A code editor (VS Code recommended)

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Bottus.git
   cd Bottus
   ```
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## Code Style

### TypeScript Conventions

- Use **ES modules** (`type: "module"` in package.json)
- Use **TypeScript** for all new code
- Use **class-based** services with constructor DI
- **Async/await** over promises

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `calendar-service.ts`)
- Classes: `PascalCase` (e.g., `CalendarService`)
- Functions: `camelCase` (e.g., `getEvents()`)
- Constants: `UPPER_SNAKE_CASE`

### Code Formatting

```bash
# Format code
npm run format

# Lint code
npm run lint
```

### Import Order

1. Built-in Node.js modules
2. External packages
3. Internal modules (relative)

```typescript
// 1. Built-in
import path from 'path';
import fs from 'fs';

// 2. External
import { some } from 'some-package';
import * as chrono from 'chrono-node';

// 3. Internal
import { CalendarService } from '../services/calendar.js';
import { eventDb } from '../db/index.js';
```

## Commit Messages

### Format

```
type(scope): description

[optional body]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Examples

```
feat(calendar): add RSVP confirmation reactions

fix(extraction): handle Norwegian date format "klokken"

docs(readme): update installation instructions

refactor(services): extract polling scheduler
```

## Pull Requests

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Code builds without errors (`npm run build`)
- [ ] No new linting errors
- [ ] Documentation updated if needed
- [ ] Commit messages are clear

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Changed X to Y
- Added new feature Z

## Testing
- Tested locally with...
- Ran existing tests: [pass/fail]

## Related Issues
Closes #123
```

## Working with Hotspots

This project has areas marked as "hotspots" - high-complexity code that requires extra care. See [Hotspot Onboarding](docs/hotspot-onboarding.md) for details.

### Hotspot Guidelines

**DO:**
- Keep changes focused and incremental
- Add comments explaining complex logic
- Extract new helper functions rather than adding to large functions
- Test locally before pushing
- Update hotspot briefs if changes significantly alter the file

**DO NOT:**
- Add new message handlers to sequential if-chains in relay/index.ts
- Add new synchronous writes to the database layer
- Introduce new hardcoded values
- Bypass the existing service architecture

### Modifying Hotspots

If your work requires significant changes to a hotspot:

1. Read the hotspot brief in `.sisyphus/plans/hotspots/`
2. Understand the current patterns
3. Consider extracting new code instead of adding to existing files
4. Get a second opinion before making large changes

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test
npm test -- tests/relay/calendar-skill-v2.test.ts
```

### Writing Tests

Follow existing patterns in `tests/`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarService } from '../../src/services/calendar.js';

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    service = new CalendarService();
  });

  it('should create an event', async () => {
    const event = await service.create({
      title: 'Test Event',
      startTime: Date.now(),
    });
    expect(event.title).toBe('Test Event');
  });
});
```

### Test Coverage

- New features should include tests
- Bug fixes should include regression tests
- Aim for meaningful coverage, not 100%

## Project Structure

```
src/
├── index.ts           # Main entry
├── relay/            # Discord↔Ollama relay
│   ├── index.ts     # Relay entry
│   ├── discord.ts   # Discord client
│   ├── ollama.ts    # Ollama client
│   ├── skills/      # Skill system
│   ├── handlers/    # Message handlers
│   └── plan-router.ts
├── services/         # Domain services
│   ├── calendar*.ts
│   ├── comfyui.ts
│   ├── extraction.ts
│   └── ...
├── commands/        # Slash commands
├── db/             # Database layer
└── gateway/        # Experimental gateway
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Welcome newcomers

---

Thanks for contributing!
