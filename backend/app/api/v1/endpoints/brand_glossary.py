from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func

from app.core.deps import CurrentUser, DBSession, CurrentWorkspace
from app.models.content import BrandGlossary
from app.schemas.content import (
    BrandGlossaryCreate,
    BrandGlossaryUpdate,
    BrandGlossaryOut,
    BrandGlossaryListOut,
)
from app.services.glossary_service import GlossaryService

router = APIRouter()

class ApplyGlossaryRequest(BaseModel):
    text: str

class ApplyGlossaryResponse(BaseModel):
    original_text: str
    processed_text: str

@router.post("", response_model=BrandGlossaryOut, status_code=status.HTTP_201_CREATED)
async def create_brand_glossary_term(
    term_in: BrandGlossaryCreate,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    # Check if term already exists
    existing = db.execute(
        select(BrandGlossary).where(
            BrandGlossary.workspace_id == workspace.id,
            func.lower(BrandGlossary.term) == func.lower(term_in.term)
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Term already exists in this workspace glossary")

    glossary = BrandGlossary(
        workspace_id=workspace.id,
        term=term_in.term,
        replacement=term_in.replacement,
        description=term_in.description,
        created_by=current_user.id
    )
    db.add(glossary)
    db.commit()
    db.refresh(glossary)
    return glossary

@router.get("", response_model=BrandGlossaryListOut)
async def list_brand_glossary_terms(
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace,
    page: int = 1,
    page_size: int = 50
):
    query = select(BrandGlossary).where(BrandGlossary.workspace_id == workspace.id).order_by(BrandGlossary.term.asc())
    
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
    items = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return BrandGlossaryListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@router.put("/{id}", response_model=BrandGlossaryOut)
async def update_brand_glossary_term(
    id: int,
    term_in: BrandGlossaryUpdate,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    glossary = db.execute(
        select(BrandGlossary).where(BrandGlossary.id == id, BrandGlossary.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not glossary:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    if term_in.term is not None:
        # Check conflict
        existing = db.execute(
            select(BrandGlossary).where(
                BrandGlossary.workspace_id == workspace.id,
                func.lower(BrandGlossary.term) == func.lower(term_in.term),
                BrandGlossary.id != id
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Term already exists")
        glossary.term = term_in.term

    if term_in.replacement is not None:
        glossary.replacement = term_in.replacement
    if term_in.description is not None:
        glossary.description = term_in.description

    db.commit()
    db.refresh(glossary)
    return glossary

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_glossary_term(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    glossary = db.execute(
        select(BrandGlossary).where(BrandGlossary.id == id, BrandGlossary.workspace_id == workspace.id)
    ).scalar_one_or_none()

    if not glossary:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    db.delete(glossary)
    db.commit()
    return None

@router.post("/apply", response_model=ApplyGlossaryResponse)
async def apply_glossary(
    request: ApplyGlossaryRequest,
    db: DBSession,
    current_user: CurrentUser,
    workspace: CurrentWorkspace
):
    glossaries = GlossaryService.get_glossary_for_workspace(db, workspace.id)
    processed = GlossaryService.apply_glossary_rules(request.text, glossaries)
    
    return ApplyGlossaryResponse(
        original_text=request.text,
        processed_text=processed
    )
