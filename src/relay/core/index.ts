export interface CoreRelay {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onReady(): void;
}

export class CoreRelayStub implements CoreRelay {
  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  onReady(): void {
  }
}

export const CORE_RELAY_STUB = true;
