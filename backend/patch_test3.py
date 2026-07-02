import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
os.environ['TESTING'] = 'true'
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///:memory:'
os.environ['LOCAL_STORAGE_PATH'] = '/tmp/test_storage'

from app.services.voice.providers.factory import VoiceProviderFactory

def test_missing_api_key():
    print("Testing missing API key (ElevenLabs)...")
    # Temporarily unset the key
    old_key = os.environ.get('ELEVENLABS_API_KEY')
    if 'ELEVENLABS_API_KEY' in os.environ:
        del os.environ['ELEVENLABS_API_KEY']
        
    try:
        from app.core.config import settings
        settings.ELEVENLABS_API_KEY = None
        
        provider = VoiceProviderFactory.get('elevenlabs')
        try:
            provider.clone_voice("Test", "/tmp/nonexistent.mp3")
            print("❌ Expected exception for missing API key, but succeeded.")
        except ValueError as e:
            if "API key not configured" in str(e):
                print("✅ Handled missing API key correctly:", str(e))
            else:
                print("❌ Unexpected error:", str(e))
                
    finally:
        if old_key is not None:
            os.environ['ELEVENLABS_API_KEY'] = old_key
            settings.ELEVENLABS_API_KEY = old_key

def test_invalid_provider():
    print("Testing invalid provider...")
    try:
        provider = VoiceProviderFactory.get('nonexistent')
        print("❌ Expected exception for invalid provider, but succeeded.")
    except ValueError as e:
        if "Unknown voice provider" in str(e):
            print("✅ Handled invalid provider correctly:", str(e))
        else:
            print("❌ Unexpected error:", str(e))

def test_openai_clone_rejection():
    print("Testing OpenAI clone rejection...")
    provider = VoiceProviderFactory.get('openai')
    try:
        provider.clone_voice("Test", "/tmp/nonexistent.mp3")
        print("❌ Expected exception for OpenAI clone, but succeeded.")
    except NotImplementedError as e:
        if "does not support voice cloning" in str(e):
            print("✅ Handled OpenAI clone rejection correctly:", str(e))
        else:
            print("❌ Unexpected error:", str(e))

if __name__ == '__main__':
    test_missing_api_key()
    test_invalid_provider()
    test_openai_clone_rejection()
