"""Test basic discord.py-self installation"""
import sys

def test_import():
    """Test that discord.py-self can be imported"""
    try:
        import discord
        print(f"✅ discord.py-self imported successfully")
        print(f"   Version: {discord.__version__}")
        return True
    except ImportError as e:
        print(f"❌ Failed to import discord.py-self: {e}")
        return False

def test_client_creation():
    """Test that we can create a self-bot client"""
    try:
        import discord
        client = discord.Client(self_bot=True)
        print(f"✅ Self-bot client created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create client: {e}")
        return False

if __name__ == '__main__':
    print("Testing discord.py-self installation...\n")
    
    success = True
    success &= test_import()
    success &= test_client_creation()
    
    print()
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed")
        sys.exit(1)
