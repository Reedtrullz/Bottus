"""Discord selfbot channel implementation using Node.js subprocess.

This channel uses discord.js-selfbot-v13 via a Node.js subprocess to handle
Discord DMs and Group DMs. Communicates via stdin/stdout JSON protocol.

Installation:
1. Copy this file to: ~/.local/lib/python3.13/site-packages/nanobot/channels/discord_selfbot.py
2. Add DiscordSelfbotConfig to schema.py
3. Add discord_selfbot to ChannelsConfig
4. Add initialization to manager.py

Or use the setup script: scripts/setup-discord-selfbot.py
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from threading import Thread
from typing import Any

from loguru import logger

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


def _split_message(content: str, max_len: int = 2000) -> list[str]:
    """Split content into chunks within max_len, preferring line breaks."""
    if not content:
        return []
    if len(content) <= max_len:
        return [content]
    chunks: list[str] = []
    while content:
        if len(content) <= max_len:
            chunks.append(content)
            break
        cut = content[:max_len]
        pos = cut.rfind('\n')
        if pos <= 0:
            pos = cut.rfind(' ')
        if pos <= 0:
            pos = max_len
        chunks.append(content[:pos])
        content = content[pos:].lstrip()
    return chunks


class DiscordSelfbotConfig:
    """Discord selfbot channel configuration."""

    def __init__(
        self,
        enabled: bool = False,
        token: str = "",
        allow_from: list[str] | None = None,
        client_path: str = "",
    ):
        self.enabled = enabled
        self.token = token
        self.allow_from = allow_from or []
        # Path to discord-client.js script
        self.client_path = client_path or str(
            Path(__file__).parent.parent.parent / "scripts" / "discord-client.js"
        )


class DiscordSelfbotChannel(BaseChannel):
    """
    Discord selfbot channel using discord.js-selfbot-v13 via Node.js subprocess.
    
    Handles Discord DMs and Group DMs by:
    1. Spawning a Node.js subprocess running discord-client.js
    2. Communicating via stdin/stdout JSON messages
    3. Forwarding incoming messages to NanoBot's message bus
    4. Sending outgoing messages from NanoBot to Discord
    """

    name = "discord_selfbot"

    def __init__(self, config: DiscordSelfbotConfig, bus: MessageBus):
        super().__init__(config, bus)
        self.config: DiscordSelfbotConfig = config
        self._process: subprocess.Popen | None = None
        self._reader_thread: Thread | None = None
        self._running = False
        self._user_id: str = ""
        self._username: str = ""
        
        # Map sender_id to channel_id for replies (like Telegram)
        self._channel_map: dict[str, str] = {}

    async def start(self) -> None:
        """Start the Discord selfbot channel."""
        if not self.config.token:
            logger.error("Discord selfbot token not configured")
            return

        client_path = self.config.client_path
        if not os.path.exists(client_path):
            logger.error(f"Discord client script not found: {client_path}")
            return

        self._running = True

        # Spawn Node.js subprocess
        try:
            self._process = subprocess.Popen(
                [sys.executable, "-m", "node", client_path, self.config.token],
                # Use node directly since script has shebang
                # Actually let's use node directly
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
        except Exception as e:
            # Try with node directly
            try:
                self._process = subprocess.Popen(
                    ["node", client_path, self.config.token],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                )
            except Exception as e2:
                logger.error(f"Failed to start Discord client: {e2}")
                return

        # Start reader thread for stdout
        self._reader_thread = Thread(target=self._read_stdout, daemon=True)
        self._reader_thread.start()

        logger.info("Discord selfbot channel started")

    def _read_stdout(self) -> None:
        """Read stdout from Node.js process in background thread."""
        if not self._process or not self._process.stdout:
            return

        buffer = ""
        while self._running and self._process.poll() is None:
            try:
                char = self._process.stdout.read(1)
                if not char:
                    break
                buffer += char
                if char == '\n':
                    line = buffer.strip()
                    buffer = ""
                    if line:
                        asyncio.run(self._handle_python_message(line))
            except Exception as e:
                logger.error(f"Error reading stdout: {e}")
                break

    async def _handle_python_message(self, line: str) -> None:
        """Handle incoming message from Node.js subprocess."""
        try:
            msg = json.loads(line)
            msg_type = msg.get("type")
            data = msg.get("data", {})

            if msg_type == "ready":
                self._user_id = data.get("user_id", "")
                self._username = data.get("username", "")
                logger.info(f"Discord selfbot logged in as {self._username}")

            elif msg_type == "message":
                await self._handle_incoming_message(data)

            elif msg_type == "error":
                logger.error(f"Discord error: {data.get('message')}")

            elif msg_type == "disconnected":
                logger.warning("Discord client disconnected")

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from Discord: {line[:100]}")

    async def _handle_incoming_message(self, data: dict[str, Any]) -> None:
        """Handle incoming Discord message and forward to message bus."""
        channel_id = data.get("channel_id", "")
        sender_id = data.get("sender_id", "")
        sender_name = data.get("sender_name", "")
        content = data.get("content", "")
        message_id = data.get("message_id", "")
        is_dm = data.get("is_dm", False)

        if not channel_id or not sender_id:
            return

        # Store channel mapping (sender_id -> channel_id)
        self._channel_map[sender_id] = channel_id

        # Build sender_id with username for allowlist matching (like Telegram)
        full_sender_id = f"{sender_id}|{sender_name}" if sender_name else sender_id

        logger.debug(f"Discord message from {sender_name}: {content[:50]}...")

        # Start typing indicator
        # (Optional: can be implemented by sending to Node.js)

        # Forward to message bus
        await self._handle_message(
            sender_id=full_sender_id,
            chat_id=channel_id,
            content=content,
            metadata={
                "message_id": message_id,
                "is_dm": is_dm,
                "sender_name": sender_name,
            },
        )

    async def stop(self) -> None:
        """Stop the Discord selfbot channel."""
        self._running = False

        # Send stop command to Node.js
        if self._process and self._process.stdin:
            try:
                self._process.stdin.write(json.dumps({"type": "stop"}) + "\n")
                self._process.stdin.flush()
            except Exception:
                pass

        # Terminate process
        if self._process:
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
            except Exception as e:
                logger.warning(f"Error stopping Discord process: {e}")

        logger.info("Discord selfbot channel stopped")

    async def send(self, msg: OutboundMessage) -> None:
        """Send a message through Discord."""
        if not self._process or not self._process.stdin:
            logger.warning("Discord process not running")
            return

        channel_id = msg.chat_id
        content = msg.content or ""

        if not channel_id or not content:
            return

        # Split long messages
        chunks = _split_message(content)
        if not chunks:
            return

        for chunk in chunks:
            payload = {
                "type": "send",
                "data": {
                    "channel_id": channel_id,
                    "content": chunk,
                },
            }

            try:
                self._process.stdin.write(json.dumps(payload) + "\n")
                self._process.stdin.flush()
            except Exception as e:
                logger.error(f"Failed to send Discord message: {e}")
                break
