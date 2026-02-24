export interface RelayRouter {
  route(payload: any): Promise<any>;
}

export class RelayRouterStub implements RelayRouter {
  async route(_payload: any): Promise<any> {
    return {};
  }
}
export const ROUTER_RELAY_STUB = true;
