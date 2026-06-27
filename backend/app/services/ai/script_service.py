import logging
from app.core.config import settings

from .factory import AIProviderFactory
from .prompt_builder import PromptBuilderService
from .interfaces import ProviderError

logger = logging.getLogger(__name__)

class ScriptService:
    def __init__(self):
        self.providers = AIProviderFactory.get_providers()

    async def _execute_with_failover(self, prompt: str) -> str:
        """
        Executes a prompt against the configured providers.
        If AUTO_FAILOVER is enabled, it will try the next provider in the list upon failure.
        """
        last_error = None
        
        for provider in self.providers:
            try:
                logger.info(f"Attempting generation with provider: {provider.name}")
                result = await provider.generate(prompt)
                return result
            except ProviderError as e:
                logger.warning(f"Provider {provider.name} failed: {e.message} (Code: {e.code})")
                last_error = e
                if not settings.AUTO_FAILOVER:
                    break
            except Exception as e:
                logger.error(f"Unexpected error with provider {provider.name}: {str(e)}")
                last_error = ProviderError(str(e), "UNKNOWN_ERROR")
                if not settings.AUTO_FAILOVER:
                    break
        
        # If all available providers fail, raise the last exception
        if last_error:
            raise last_error
        
        raise ProviderError("No AI providers available", "NO_PROVIDERS")


    async def generate_script(self, topic: str, tone: str, length: str, target_audience: str) -> str:
        prompt = PromptBuilderService.build_generate_prompt(topic, tone, length, target_audience)
        return await self._execute_with_failover(prompt)

    async def rewrite_script(self, script: str, tone: str) -> str:
        prompt = PromptBuilderService.build_rewrite_prompt(script, tone)
        return await self._execute_with_failover(prompt)

    async def translate_script(self, script: str, language: str) -> str:
        prompt = PromptBuilderService.build_translate_prompt(script, language)
        return await self._execute_with_failover(prompt)
