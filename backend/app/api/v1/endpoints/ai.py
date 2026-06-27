from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.ai import (
    ScriptGenerateRequest,
    ScriptRewriteRequest,
    ScriptTranslateRequest,
    AIResponse
)
from app.services.ai.script_service import ScriptService
from app.services.ai.interfaces import ProviderError

router = APIRouter()
script_service = ScriptService()

@router.post("/generate", response_model=AIResponse)
async def generate_script(body: ScriptGenerateRequest):
    try:
        result = await script_service.generate_script(
            topic=body.topic,
            tone=body.tone,
            length=body.length,
            target_audience=body.targetAudience
        )
        return AIResponse(success=True, script=result)
    except ProviderError as e:
        return JSONResponse(
            status_code=502, # Bad Gateway
            content={"success": False, "message": e.message, "code": e.code}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e), "code": "INTERNAL_ERROR"}
        )

@router.post("/rewrite", response_model=AIResponse)
async def rewrite_script(body: ScriptRewriteRequest):
    try:
        result = await script_service.rewrite_script(
            script=body.script,
            tone=body.tone
        )
        return AIResponse(success=True, script=result)
    except ProviderError as e:
        return JSONResponse(
            status_code=502,
            content={"success": False, "message": e.message, "code": e.code}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e), "code": "INTERNAL_ERROR"}
        )

@router.post("/translate", response_model=AIResponse)
async def translate_script(body: ScriptTranslateRequest):
    try:
        result = await script_service.translate_script(
            script=body.script,
            language=body.language
        )
        return AIResponse(success=True, script=result)
    except ProviderError as e:
        return JSONResponse(
            status_code=502,
            content={"success": False, "message": e.message, "code": e.code}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e), "code": "INTERNAL_ERROR"}
        )
