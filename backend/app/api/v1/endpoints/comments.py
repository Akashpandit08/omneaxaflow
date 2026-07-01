from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.core.deps import CurrentUserAnyAuth, CurrentWorkspace, DBSession
from app.models.collaboration import Comment
from app.models.video import Video
from app.schemas.collaboration import CommentCreate, CommentOut, CommentUpdate
from app.services.audit import write_audit_log

router = APIRouter()


async def _workspace_role(request: Request) -> str | None:
    return getattr(request.state, "workspace_role", None)


@router.post("/videos/{video_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_video_comment(
    video_id: int,
    body: CommentCreate,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    video = await db.get(Video, video_id)
    if not video or video.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Video not found")

    comment = Comment(
        video_id=video.id,
        user_id=current_user.id,
        workspace_id=workspace.id,
        timestamp_seconds=body.timestamp_seconds,
        content=body.content.strip(),
    )
    db.add(comment)
    await write_audit_log(
        db,
        "COMMENT_CREATE",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type="comment",
        resource_id=None,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(comment)
    return comment


@router.get("/videos/{video_id}/comments", response_model=list[CommentOut])
async def list_video_comments(
    video_id: int,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    video = await db.get(Video, video_id)
    if not video or video.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Video not found")

    result = await db.execute(
        select(Comment)
        .where(Comment.video_id == video_id, Comment.workspace_id == workspace.id)
        .order_by(Comment.timestamp_seconds.asc(), Comment.created_at.asc())
    )
    return list(result.scalars().all())


@router.put("/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    comment_id: int,
    body: CommentUpdate,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    comment = await db.get(Comment, comment_id)
    if not comment or comment.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Comment not found")

    role = await _workspace_role(request)
    if comment.user_id != current_user.id and role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only comment author, admin, or owner can edit")

    data = body.model_dump(exclude_unset=True)
    if "content" in data and data["content"] is not None:
        comment.content = data["content"].strip()
    if "timestamp_seconds" in data and data["timestamp_seconds"] is not None:
        comment.timestamp_seconds = data["timestamp_seconds"]

    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    request: Request,
    current_user: CurrentUserAnyAuth,
    workspace: CurrentWorkspace,
    db: DBSession,
):
    comment = await db.get(Comment, comment_id)
    if not comment or comment.workspace_id != workspace.id:
        raise HTTPException(status_code=404, detail="Comment not found")

    role = await _workspace_role(request)
    if comment.user_id != current_user.id and role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Only comment author, admin, or owner can delete")

    await write_audit_log(
        db,
        "COMMENT_DELETE",
        workspace_id=workspace.id,
        user_id=current_user.id,
        resource_type="comment",
        resource_id=comment.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(comment)
    await db.commit()
