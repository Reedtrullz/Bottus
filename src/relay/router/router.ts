// Local minimal RelayRouter interface to avoid external import issues in stub mode
export interface RelayRouter {
  route(input: any): Promise<any>;
  addRoute(pattern: string, handler: (input: any) => any): void;
}

// Lightweight placeholder router implementation
export class RelayRouterImpl implements RelayRouter {
  private routes: Array<{ pattern: string; handler: (input: any) => Promise<any> | any }> = [];

  async route(input: any): Promise<any> {
    // naive routing: find first matching by exact pattern if present in input.type
    for (const r of this.routes) {
      // simple heuristic: if input and pattern match strictly, call handler
      if (input?.type && r.pattern === input.type) {
        return await r.handler(input);
      }
    }
    return null as any;
  }

  addRoute(pattern: string, handler: (input: any) => any): void {
    this.routes.push({ pattern, handler });
  }
}
