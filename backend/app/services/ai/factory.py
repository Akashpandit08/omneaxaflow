from typing import List
from app.core.config import settings

from .interfaces import AIProvider
from .providers.openai_provider import OpenAIProvider
from .providers.gemini_provider import GeminiProvider
from .providers.claude_provider import ClaudeProvider
from .providers.mock_provider import MockProvider

class AIProviderFactory:
    """Factory to instantiate AI providers based on environment configuration."""

    @staticmethod
    def get_providers() -> List[AIProvider]:
        """
        Returns a list of available providers, with the primary provider first.
        If no real provider is fully configured, MockProvider is appended as a final fallback.
        """
        providers = []
        
        # Try to initialize configured providers
        try:
            providers.append(OpenAIProvider(api_key=settings.OPENAI_API_KEY))
        except Exception:
            pass

        try:
            providers.append(GeminiProvider(api_key=settings.GEMINI_API_KEY))
        except Exception:
            pass

        try:
            providers.append(ClaudeProvider(api_key=settings.CLAUDE_API_KEY))
        except Exception:
            pass

        # Sort so the primary provider is first
        providers.sort(key=lambda p: 0 if p.name == settings.PRIMARY_PROVIDER else 1)

        # Always add the mock provider as a guaranteed ultimate fallback
        providers.append(MockProvider())

        return providers
