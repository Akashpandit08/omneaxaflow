from .base import VoiceProvider
from .elevenlabs_provider import ElevenLabsProvider
from .xtts_provider import XTTSProvider
from .openai_provider import OpenAIProvider
from .cartesia_provider import CartesiaProvider
from .polly_provider import PollyProvider

class VoiceProviderFactory:
    @staticmethod
    def get(provider_name: str) -> VoiceProvider:
        name = provider_name.lower().strip()
        if name == "elevenlabs":
            return ElevenLabsProvider()
        elif name == "xtts":
            return XTTSProvider()
        elif name == "openai":
            return OpenAIProvider()
        elif name == "cartesia":
            return CartesiaProvider()
        elif name == "polly":
            return PollyProvider()
        else:
            raise ValueError(f"Unknown voice provider: {provider_name}")
