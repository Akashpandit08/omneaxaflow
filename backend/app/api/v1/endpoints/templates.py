from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUserAnyAuth, CurrentWorkspace, DBSession, RequireRole
from app.models.collaboration import Template
from app.models.project import Project
from app.schemas.collaboration import TemplateCreate, TemplateListOut, TemplateOut
from app.schemas.project import ProjectOut
from app.services.audit import write_audit_log

router = APIRouter()


def _snapshot_project(project: Project) -> dict:
    return {
        "title": project.title,
        "description": project.description,
        "script": project.script,
        "scenes": project.scenes,
        "avatar_id": project.avatar_id,
        "voice_id": project.voice_id,
    }


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireRole(["owner", "admin", "member"])])
async def create_template(
    body: TemplateCreate,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    project = await db.get(Project, body.project_id)
    if not project or project.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Project not found")

    template = Template(
        workspace_id=workspace.id,
        creator_id=current_user.id,
        name=body.name.strip(),
        description=body.description,
        thumbnail_url=body.thumbnail_url,
        is_shared=body.is_shared,
        project_snapshot_json=_snapshot_project(project),
    )
    db.add(template)
    await write_audit_log(
        db,
        "UPDATE_TEMPLATE",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type="template",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(template)
    return template


@router.get("", response_model=TemplateListOut)
async def list_templates(
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    search: str | None = None,
):
    query = select(Template).where(
        Template.workspace_id == workspace.id,
        or_(Template.is_shared == True, Template.creator_id == current_user.id),  # noqa: E712
    )
    if search:
        query = query.where(Template.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(Template.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return TemplateListOut(items=list(result.scalars().all()), total=total, page=page, page_size=page_size)


@router.get("/{template_id}", response_model=TemplateOut)
async def get_template(template_id: int, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    template = await db.get(Template, template_id)
    if (
        not template
        or template.workspace_id != workspace.id
        or (not template.is_shared and template.creator_id != current_user.id)
    ):
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    template = await db.get(Template, template_id)
    if not template or template.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Template not found")
    role = getattr(request.state, "workspace_role", None)
    if template.creator_id != current_user.id and role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only template creator, admin, or owner can delete")

    await write_audit_log(
        db,
        "DELETE_TEMPLATE",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type="template",
        resource_id=template.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(template)
    await db.commit()


@router.post("/{template_id}/use", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireRole(["owner", "admin", "member"])])
async def use_template(template_id: int, current_user: CurrentUserAnyAuth, workspace: CurrentWorkspace, db: DBSession):
    template = await db.get(Template, template_id)
    if (
        not template
        or template.workspace_id != workspace.id
        or (not template.is_shared and template.creator_id != current_user.id)
    ):
        raise HTTPException(status_code=404, detail="Template not found")

    snapshot = template.project_snapshot_json
    project = Project(
        workspace_id=workspace.id,
        owner_id=current_user.id,
        title=f"{snapshot.get('title', template.name)} copy",
        description=snapshot.get("description"),
        script=snapshot.get("script"),
        scenes=snapshot.get("scenes"),
        avatar_id=snapshot.get("avatar_id"),
        voice_id=snapshot.get("voice_id"),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
