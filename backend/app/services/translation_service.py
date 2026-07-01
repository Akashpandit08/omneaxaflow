import os
import logging
from typing import Optional
from google.cloud import translate_v2 as translate

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        try:
            # Requires GOOGLE_APPLICATION_CREDENTIALS in env
            self.client = translate.Client()
            self.enabled = True
        except Exception as e:
            logger.warning(f"Google Cloud Translation API could not be initialized: {e}. Falling back to mock translation.")
            self.enabled = False

    def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> str:
        """
        Translates text to the target language.
        If Google API is not enabled, returns a mocked translation.
        """
        if not text:
            return text
            
        if not self.enabled:
            logger.info(f"Mock translating '{text}' to '{target_language}'")
            return f"[{target_language}] {text}"
            
        try:
            if source_language:
                result = self.client.translate(
                    text, target_language=target_language, source_language=source_language
                )
            else:
                result = self.client.translate(text, target_language=target_language)
                
            return result.get("translatedText", text)
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            raise ValueError(f"Translation failed: {str(e)}")
