import logging
from typing import Optional
from google.cloud import translate_v2 as translate


logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        try:
            self.client = translate.Client()
            self.enabled = True
        except Exception as e:
            logger.warning("Google Cloud Translation API could not be initialized: %s", e)
            self.enabled = False

    def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> str:
        """
        Translates text to the target language.
        """
        if not text:
            return text
            
        if not self.enabled:
            raise ValueError(
                "Translation provider is not configured. Set GOOGLE_APPLICATION_CREDENTIALS for development."
            )
            
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
