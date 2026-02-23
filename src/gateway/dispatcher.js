class SkillDispatcher {
  constructor() {
    this.skills = [];
  }
  register(skill) {
    this.skills.push(skill);
    console.log(`[Dispatcher] Registered skill: ${skill.name}`);
  }
  async dispatch(parsed, ctx) {
    // Use cleanedContent (without @mention) for skill matching
    const message = parsed.cleanedContent || parsed.content || '';
    console.log(`[Dispatcher] Dispatching: "${message}", skills: ${this.skills.length}`);
    for (const skill of this.skills) {
      try {
        const canHandle = skill.canHandle(message, ctx);
        console.log(`[Dispatcher] Skill "${skill.name}" canHandle: ${canHandle}`);
        if (canHandle) {
          const result = await skill.handle(message, ctx);
          console.log(`[Dispatcher] Skill "${skill.name}" result:`, result);
          if (result && result.handled) {
            return result;
          }
        }
      } catch (err) {
        console.error(`[Dispatcher] Skill "${skill.name}" error:`, err);
      }
    }
    return { handled: false };
  }
}

export { SkillDispatcher };
