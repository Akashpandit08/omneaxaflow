from abc import ABC, abstractmethod

class ProviderError(Exception):
    """Exception raised when an AI provider fails."""
    def __init__(self, message: str, code: str = "PROVIDER_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

class AIProvider(ABC):
    """Abstract Base Class for all AI Providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g., 'openai')."""
        pass

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate text based on a prompt."""
        pass
