declare class SkillDispatcher {
  constructor();
  register(skill: any): void;
  dispatch(parsed: any, ctx: any): Promise<any>;
}
export { SkillDispatcher };
