class MessageParser {
  parse(msg) {
    const cleaned = (msg.content || '').trim();
    return {
      raw: msg,
      username: msg.username,
      channelId: msg.channelId,
      cleanedContent: cleaned
    };
  }
}

export { MessageParser };
