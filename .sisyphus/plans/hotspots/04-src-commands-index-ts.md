# Hotspot Brief: src/commands/index.ts

**Size:** 129 lines  
**Complexity:** Low-Medium - 1 function, 7 command definitions with localizations

**Primary Responsibilities:**
registerCommands registers 7 Discord slash commands with Norwegian localizations (propose/forslag, jeg-samtykker, jeg-tilbakekall, kalender, dictate/diktér, godkjenn). Each command includes metadata (name, description, options, choices) and localization variants.

**Key Patterns:**
- Single async function with hardcoded command array
- Command options: text input (type 3), integer (type 4), choices
- Norwegian localization in nameLocalizations/descriptionLocalizations
- Bilingual command names (English primary, Norwegian localization)
- Error handling with console logging
- Application commands API (bot.application?.commands.create)

**Extraction Opportunities:**
1. **CommandRegistry/Loader:** Move command array to separate files (one per command) and load dynamically
2. **LocalizationExtractor:** Pull Norwegian strings to external i18n files
3. **CommandBuilder:** Create builder functions for each command type instead of inline objects
4. **CommandSchema:** Define TypeScript interfaces for command, option, choice structures
5. **CommandValidator:** Add validation for required fields, choice values before registration
