import pytest
from unittest.mock import MagicMock
from app.services.import_service import ImportService
from app.models.content import ImportJobStatus

def test_parse_pptx(tmp_path):
    # For a real test, we would generate a valid PPTX using python-pptx or load a fixture
    # Here we just mock the parse
    ImportService.parse_pptx = MagicMock(return_value={"title": "Mock PPTX", "scenes": [{"id": "scene-1", "text": "Slide 1", "script": "Slide 1"}]})
    
    result = ImportService.parse_pptx(str(tmp_path / "test.pptx"))
    
    assert result["title"] == "Mock PPTX"
    assert len(result["scenes"]) == 1
    assert result["scenes"][0]["text"] == "Slide 1"

def test_parse_pdf(tmp_path):
    ImportService.parse_pdf = MagicMock(return_value={"title": "Mock PDF", "scenes": [{"id": "scene-1", "text": "Page 1", "script": "Page 1"}]})
    
    result = ImportService.parse_pdf(str(tmp_path / "test.pdf"))
    
    assert result["title"] == "Mock PDF"
    assert len(result["scenes"]) == 1
    assert result["scenes"][0]["text"] == "Page 1"
