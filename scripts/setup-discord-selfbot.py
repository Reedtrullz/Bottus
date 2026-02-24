#!/usr/bin/env python3
"""
Setup script for Discord Selfbot Channel

This script installs the Discord selfbot channel into NanoBot by:
1. Copying the channel file to the correct location
2. Adding config schema entries
3. Adding channel initialization to manager.py

Usage:
    python scripts/setup-discord-selfbot.py [--uninstall]
"""

import argparse
import os
import re
import shutil
import sys
from pathlib import Path


def get_site_packages() -> Path:
    """Find the site-packages directory where nanobot is installed."""
    # First, try to find where nanobot is actually installed
    try:
        import nanobot
        nanobot_path = Path(nanobot.__file__).parent
        # Go up from nanobot/ to site-packages
        if nanobot_path.name == "nanobot":
            return nanobot_path.parent
    except ImportError:
        pass
    
    # Fallback to site.getsitepackages()
    import site
    sites = site.getsitepackages()
    if sites:
        return Path(sites[0])
    
    # Fallback: try to find it in sys.path
    for p in sys.path:
        sp = Path(p)
        if sp.name == "site-packages" and sp.exists():
            return sp
    
    raise RuntimeError("Could not find site-packages directory")


def install_channel() -> None:
    """Install the Discord selfbot channel."""
    project_root = Path(__file__).parent.parent.resolve()
    site_packages = get_site_packages()
    nanobot_channels = site_packages / "nanobot" / "channels"
    
    if not nanobot_channels.exists():
        print(f"Error: NanoBot channels directory not found: {nanobot_channels}")
        sys.exit(1)
    
    # 1. Copy the channel file
    source_file = project_root / "scripts" / "discord-selfbot-channel.py"
    dest_file = nanobot_channels / "discord_selfbot.py"
    
    if source_file.exists():
        shutil.copy2(source_file, dest_file)
        print(f"✓ Copied channel file to {dest_file}")
    else:
        print(f"Error: Source file not found: {source_file}")
        sys.exit(1)
    
    # 2. Update schema.py to add DiscordSelfbotConfig
    schema_file = nanobot_channels.parent / "config" / "schema.py"
    
    if schema_file.exists():
        with open(schema_file, "r") as f:
            content = f.read()
        
        # Check if already installed
        if "DiscordSelfbotConfig" in content:
            print("✓ DiscordSelfbotConfig already in schema.py")
        else:
            # Add DiscordSelfbotConfig class after DiscordConfig
            config_class = '''

class DiscordSelfbotConfig(Base):
    """Discord selfbot channel configuration (user token, not bot token)."""

    enabled: bool = False
    token: str = ""  # User token from Discord (NOT bot token)
    allow_from: list[str] = Field(default_factory=list)  # Allowed user IDs
    client_path: str = ""  # Path to discord-client.js script
'''
            # Find the DiscordConfig class and add after it
            pattern = r'(class DiscordConfig\(Base\):.*?intents: int = 37377\s*# GUILDS.*?\n\n)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                content = content[:match.end()] + config_class + content[match.end():]
                with open(schema_file, "w") as f:
                    f.write(content)
                print(f"✓ Added DiscordSelfbotConfig to {schema_file}")
            else:
                print("⚠ Could not find DiscordConfig in schema.py - please add manually")
    
    # 3. Update ChannelsConfig in schema.py
    with open(schema_file, "r") as f:
        content = f.read()
    
    if "discord_selfbot:" in content:
        print("✓ discord_selfbot already in ChannelsConfig")
    else:
        # Add discord_selfbot to ChannelsConfig
        pattern = r'(    discord: DiscordConfig = Field\(default_factory=DiscordConfig\)\n)'
        replacement = r'\1    discord_selfbot: DiscordSelfbotConfig = Field(default_factory=DiscordSelfbotConfig)\n'
        content = re.sub(pattern, replacement, content)
        
        with open(schema_file, "w") as f:
            f.write(content)
        print(f"✓ Added discord_selfbot to ChannelsConfig")
    
    # 4. Update manager.py to initialize the channel
    manager_file = nanobot_channels / "manager.py"
    
    if manager_file.exists():
        with open(manager_file, "r") as f:
            content = f.read()
        
        # Check if already installed
        if "discord_selfbot" in content:
            print("✓ discord_selfbot already in manager.py")
        else:
            # Add initialization after Discord channel
            pattern = r'''(        # Discord channel
        if self\.config\.channels\.discord\.enabled:
            try:
                from nanobot\.channels\.discord import DiscordChannel
                self\.channels\["discord"\] = DiscordChannel\(
                    self\.config\.channels\.discord, self\.bus
                \)
                logger\.info\("Discord channel enabled"\)
            except ImportError as e:
                logger\.warning\("Discord channel not available: \{\}", e\)
)'''
            
            # More flexible pattern
            insert_after = '''        # Discord channel
        if self.config.channels.discord.enabled:
            try:
                from nanobot.channels.discord import DiscordChannel
                self.channels["discord"] = DiscordChannel(
                    self.config.channels.discord, self.bus
                )
                logger.info("Discord channel enabled")
            except ImportError as e:
                logger.warning("Discord channel not available: {}", e)
        '''
        
        new_block = insert_after + '''
        # Discord selfbot channel
        if self.config.channels.discord_selfbot.enabled:
            try:
                from nanobot.channels.discord_selfbot import DiscordSelfbotChannel
                self.channels["discord_selfbot"] = DiscordSelfbotChannel(
                    self.config.channels.discord_selfbot, self.bus
                )
                logger.info("Discord selfbot channel enabled")
            except ImportError as e:
                logger.warning("Discord selfbot channel not available: {}", e)
'''
        
        content = content.replace(insert_after, new_block)
        
        with open(manager_file, "w") as f:
            f.write(content)
        print(f"✓ Added discord_selfbot initialization to {manager_file}")
    
    print("\n✓ Discord selfbot channel installed successfully!")
    print("\nNext steps:")
    print("1. Add to your config.json:")
    print('''
    "channels": {
        "discord_selfbot": {
            "enabled": true,
            "token": "YOUR_DISCORD_USER_TOKEN"
        }
    }
''')


def uninstall_channel() -> None:
    """Uninstall the Discord selfbot channel."""
    site_packages = get_site_packages()
    nanobot_channels = site_packages / "nanobot" / "channels"
    
    # Remove channel file
    channel_file = nanobot_channels / "discord_selfbot.py"
    if channel_file.exists():
        channel_file.unlink()
        print(f"✓ Removed {channel_file}")
    
    print("\n⚠ Note: You may need to manually remove config entries from:")
    print(f"  - {nanobot_channels.parent / 'config' / 'schema.py'}")
    print(f"  - {nanobot_channels / 'manager.py'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Setup Discord selfbot channel for NanoBot")
    parser.add_argument("--uninstall", action="store_true", help="Uninstall the channel")
    args = parser.parse_args()
    
    if args.uninstall:
        uninstall_channel()
    else:
        install_channel()


if __name__ == "__main__":
    main()
