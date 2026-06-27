import httpx
from ..interfaces import AIProvider, ProviderError

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        if not self.api_key:
            raise ProviderError("OpenAI API key is missing", code="MISSING_API_KEY")

    @property
    def name(self) -> str:
        return "openai"

    async def generate(self, prompt: str) -> str:
        # Pseudo-implementation for OpenAI REST API
        # Using httpx to avoid heavy dependencies and handle missing keys gracefully
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ProviderError("Invalid OpenAI API key", code="INVALID_API_KEY")
            if e.response.status_code == 429:
                raise ProviderError("OpenAI quota exceeded", code="QUOTA_EXCEEDED")
            raise ProviderError(f"OpenAI HTTP error: {str(e)}", code="HTTP_ERROR")
        except httpx.RequestError as e:
            raise ProviderError(f"OpenAI timeout or network error: {str(e)}", code="PROVIDER_TIMEOUT")
        except Exception as e:
            raise ProviderError(str(e), code="UNKNOWN_ERROR")
