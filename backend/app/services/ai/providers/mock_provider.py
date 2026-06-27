import asyncio
from ..interfaces import AIProvider, ProviderError

class MockProvider(AIProvider):
    @property
    def name(self) -> str:
        return "mock"

    async def generate(self, prompt: str) -> str:
        await asyncio.sleep(1) # Simulate network latency
        return f"[MOCK GENERATED CONTENT via {self.name}]\nBased on your prompt: {prompt[:50]}..."
