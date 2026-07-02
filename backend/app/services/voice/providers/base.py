from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Generator

class VoiceProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def validate_credentials(self) -> bool:
        """Returns True if the provider is configured and available."""
        pass

    @abstractmethod
    def clone_voice(self, name: str, file_path: str, description: str = "") -> str:
        """Trains a voice clone and returns the provider_voice_id. Raises ValueError on failure."""
        pass

    @abstractmethod
    def text_to_speech(self, voice_id: str, text: str) -> Generator[bytes, None, None]:
        """Generates speech from text and yields audio chunks."""
        pass

    @abstractmethod
    def generate_preview(self, voice_id: str) -> str:
        """Generates a short preview audio and returns its URL."""
        pass
