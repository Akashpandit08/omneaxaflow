from typing import List
from app.core.config import settings

from .interfaces import AIProvider
from .providers.gemini_provider import GeminiProvider
from .providers.openai_provider import OpenAIProvider
from .providers.claude_provider import ClaudeProvider
from .providers.mock_provider import MockProvider

class AIProviderFactory:
    """Factory to instantiate AI providers based on environment configuration.
    
    Priority: Gemini is the default primary provider.
    OpenAI and Claude are optional fallbacks (only used if configured).
    MockProvider is always added as the final guaranteed fallback.
    """

    @staticmethod
    def get_providers() -> List[AIProvider]:
        """
        Returns a list of available providers, with the primary provider first.
        Gemini is the default primary provider. OpenAI support is optional.
        If no real provider is configured, MockProvider is used as a fallback.
        """
        providers = []

        # Always try Gemini first (primary default provider)
        try:
            providers.append(GeminiProvider(api_key=settings.GEMINI_API_KEY))
        except Exception:
            pass

        # OpenAI is optional — only initialized if an API key is explicitly provided
        try:
            if settings.OPENAI_API_KEY:
                providers.append(OpenAIProvider(api_key=settings.OPENAI_API_KEY))
        except Exception:
            pass

        # Claude is optional — only initialized if an API key is explicitly provided
        try:
            if settings.CLAUDE_API_KEY:
                providers.append(ClaudeProvider(api_key=settings.CLAUDE_API_KEY))
        except Exception:
            pass

        # Sort so the configured primary provider is first
        providers.sort(key=lambda p: 0 if p.name == settings.PRIMARY_PROVIDER else 1)

        # Always add the mock provider as a guaranteed ultimate fallback
        providers.append(MockProvider())

        return providers
