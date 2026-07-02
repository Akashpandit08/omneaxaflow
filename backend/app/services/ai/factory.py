from typing import List

from app.core.config import settings

from .interfaces import AIProvider, ProviderError
from .providers.claude_provider import ClaudeProvider
from .providers.gemini_provider import GeminiProvider
from .providers.openai_provider import OpenAIProvider


class AIProviderFactory:
    """Instantiate AI providers from explicit environment configuration."""

    @staticmethod
    def get_providers() -> List[AIProvider]:
        primary = settings.PRIMARY_PROVIDER.lower()

        if primary == "mock":
            raise ProviderError(
                "Mock AI provider has been removed from this system.",
                code="MOCK_PROVIDER_REMOVED",
            )

        configured = {
            "gemini": (settings.GEMINI_API_KEY, GeminiProvider),
            "openai": (settings.OPENAI_API_KEY, OpenAIProvider),
            "claude": (settings.CLAUDE_API_KEY, ClaudeProvider),
        }

        if primary not in configured:
            raise ProviderError(f"Unsupported PRIMARY_PROVIDER: {settings.PRIMARY_PROVIDER}", code="INVALID_PROVIDER")

        primary_key, primary_cls = configured[primary]
        if not primary_key:
            raise ProviderError(
                f"{settings.PRIMARY_PROVIDER} is configured as PRIMARY_PROVIDER but its API key is missing.",
                code="MISSING_API_KEY",
            )

        providers: List[AIProvider] = [primary_cls(api_key=primary_key)]

        if settings.AUTO_FAILOVER:
            for name, (api_key, provider_cls) in configured.items():
                if name != primary and api_key:
                    providers.append(provider_cls(api_key=api_key))

        return providers
