class DiscordGateway {
  constructor() {
    this._handler = null;
  }
  onMessage(fn) {
    this._handler = fn;
  }
  login(token) {
    return Promise.resolve();
  }
  async sendMessage(channelId, text) {
    return Promise.resolve({ channelId, text });
  }
}

class GatewayMessage {
  constructor(username, content, channelId) {
    this.username = username;
    this.content = content;
    this.channelId = channelId;
  }
}

class GatewayContext {
  constructor(obj) {
    Object.assign(this, obj);
  }
}

class OllamaClient {
  chat(prompt, context) {
    return Promise.resolve('');
  }
  isAvailable() {
    return Promise.resolve(false);
  }
}

class ExtractionService {
}

export { DiscordGateway, GatewayMessage, GatewayContext, OllamaClient, ExtractionService };
