"""
Discord.py-self Proof of Concept
Tests if discord.py-self can replace discord.js-selfbot-v13

Features to test:
1. User token authentication
2. DM support (type 1)
3. Group DM support (type 1 with recipients)
4. Message receiving
5. Message sending
6. Reaction handling
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

import discord
from discord.ext import commands

# Load environment variables
load_dotenv()

# Configuration
USER_TOKEN = os.getenv('DISCORD_USER_TOKEN')
TEST_CHANNEL_ID = os.getenv('TEST_CHANNEL_ID')  # Optional: for testing

class DiscordPySelfSpike:
    """Proof of concept bot using discord.py-self"""
    
    def __init__(self):
        # Create client with all intents for user account
        self.client = discord.Client(
            self_bot=True,
            intents=discord.Intents.all()
        )
        
        self.user_id = None
        self.username = None
        self.connection_time = None
        
        # Register event handlers
        self.client.event(self.on_ready)
        self.client.event(self.on_message)
        self.client.event(self.on_disconnect)
        
    async def on_ready(self):
        """Called when client is ready"""
        self.user_id = self.client.user.id
        self.username = self.client.user.name
        self.connection_time = datetime.now()
        
        print(f"✅ Connected!")
        print(f"   User: {self.username}#{self.client.user.discriminator}")
        print(f"   ID: {self.user_id}")
        print(f"   Time: {self.connection_time}")
        
        # List accessible channels
        await self.list_channels()
        
    async def on_message(self, message):
        """Handle incoming messages"""
        # Ignore own messages
        if message.author.id == self.user_id:
            return
            
        channel_type = self.get_channel_type(message.channel)
        
        print(f"\n📩 New message:")
        print(f"   From: {message.author.name}")
        print(f"   Channel Type: {channel_type}")
        print(f"   Content: {message.content[:100]}...")
        
        # Test reply functionality
        if self.should_reply(message):
            await self.handle_test_command(message)
            
    async def on_disconnect(self):
        """Handle disconnection"""
        print(f"\n❌ Disconnected at {datetime.now()}")
        
    def get_channel_type(self, channel) -> str:
        """Determine channel type"""
        if isinstance(channel, discord.DMChannel):
            return "DM"
        elif isinstance(channel, discord.GroupChannel):
            return "Group DM"
        elif isinstance(channel, discord.TextChannel):
            return "Guild Text"
        else:
            return f"Unknown ({type(channel).__name__})"
            
    def should_reply(self, message) -> bool:
        """Check if we should reply to this message"""
        # Reply if mentioned or in DM
        is_mentioned = self.client.user in message.mentions
        is_dm = isinstance(message.channel, (discord.DMChannel, discord.GroupChannel))
        
        return is_mentioned or is_dm
        
    async def handle_test_command(self, message):
        """Handle test commands"""
        content = message.content.lower()
        
        if 'ping' in content:
            await message.channel.send('Pong! 🏓')
            print(f"   ✉️  Replied: Pong!")
            
        elif 'test' in content:
            await message.channel.send(
                f"✅ discord.py-self test successful!\n"
                f"Channel type: {self.get_channel_type(message.channel)}\n"
                f"Bot: {self.username}"
            )
            print(f"   ✉️  Replied: Test successful")
            
        elif 'react' in content:
            # Test reaction functionality
            try:
                await message.add_reaction('✅')
                print(f"   ✅ Added reaction")
            except Exception as e:
                print(f"   ❌ Failed to add reaction: {e}")
                
    async def list_channels(self):
        """List accessible channels"""
        print(f"\n📋 Accessible channels:")
        
        dms = []
        group_dms = []
        guilds = []
        
        for channel in self.client.private_channels:
            if isinstance(channel, discord.DMChannel):
                dms.append(channel)
            elif isinstance(channel, discord.GroupChannel):
                group_dms.append(channel)
                
        for guild in self.client.guilds:
            guilds.append(guild)
            
        print(f"   DMs: {len(dms)}")
        print(f"   Group DMs: {len(group_dms)}")
        print(f"   Guilds: {len(guilds)}")
        
        if group_dms:
            print(f"\n   Group DM details:")
            for gdm in group_dms[:3]:  # Show first 3
                print(f"      - {gdm.name or 'Unnamed'} (ID: {gdm.id})")
                print(f"        Recipients: {len(gdm.recipients)}")
                
    async def send_test_message(self, channel_id: int, content: str):
        """Send a test message to specific channel"""
        try:
            channel = self.client.get_channel(channel_id)
            if channel:
                await channel.send(content)
                print(f"✉️  Sent message to {channel_id}")
                return True
            else:
                print(f"❌ Channel {channel_id} not found")
                return False
        except Exception as e:
            print(f"❌ Failed to send message: {e}")
            return False
            
    def run(self):
        """Start the bot"""
        if not USER_TOKEN:
            print("❌ Error: DISCORD_USER_TOKEN not set in .env")
            print("   Create .env file with: DISCORD_USER_TOKEN=your_token_here")
            sys.exit(1)
            
        print("🚀 Starting discord.py-self spike test...")
        print("   Press Ctrl+C to exit\n")
        
        try:
            self.client.run(USER_TOKEN)
        except discord.LoginFailure:
            print("❌ Login failed: Invalid token")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)


if __name__ == '__main__':
    bot = DiscordPySelfSpike()
    bot.run()
