import re
from typing import List
from sqlalchemy.orm import Session
from app.models.content import BrandGlossary

class GlossaryService:
    @staticmethod
    def get_glossary_for_workspace(db: Session, workspace_id: int) -> List[BrandGlossary]:
        return db.query(BrandGlossary).filter(BrandGlossary.workspace_id == workspace_id).all()

    @staticmethod
    def apply_glossary_rules(text: str, glossaries: List[BrandGlossary]) -> str:
        """
        Applies brand glossary rules to the given text.
        Replaces 'term' with 'replacement' in a case-insensitive manner,
        while maintaining whole-word boundaries.
        """
        if not text or not glossaries:
            return text
            
        result_text = text
        for rule in glossaries:
            # \b matches word boundaries to avoid replacing parts of words
            pattern = re.compile(rf"\b{re.escape(rule.term)}\b", re.IGNORECASE)
            result_text = pattern.sub(rule.replacement, result_text)
            
        return result_text
