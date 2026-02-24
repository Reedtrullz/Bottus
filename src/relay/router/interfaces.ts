// Interfaces for the Relay Router placeholder
export interface RelayRouter {
  route(input: any): Promise<any>;
  addRoute(pattern: string, handler: (input: any) => any): void;
}

export type RouteResult = {
  matched: boolean;
  data?: any;
};
