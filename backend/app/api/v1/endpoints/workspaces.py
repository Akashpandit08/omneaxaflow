from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, UTC, timedelta
import secrets
import hashlib

from app.core.deps import CurrentUser, CurrentWorkspace, DBSession, RequireRole
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceInvitation
from app.models.user import User

router = APIRouter()

@router.get("")
async def get_workspaces(current_user: CurrentUser, db: DBSession):
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.get("/current")
async def get_current_workspace_details(current_user: CurrentUser, workspace: CurrentWorkspace, db: DBSession):
    return workspace

@router.post("")
async def create_workspace(name: str, slug: str, current_user: CurrentUser, db: DBSession):
    new_workspace = Workspace(name=name, slug=slug, owner_id=current_user.id)
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    
    member = WorkspaceMember(workspace_id=new_workspace.id, user_id=current_user.id, role="owner")
    db.add(member)
    await db.commit()
    return new_workspace

@router.get("/{workspace_id}", dependencies=[RequireRole(["owner", "admin", "editor", "viewer"])])
async def get_workspace(workspace_id: int, workspace: CurrentWorkspace):
    return workspace

@router.patch("/{workspace_id}", dependencies=[RequireRole(["owner", "admin"])])
async def update_workspace(workspace_id: int, workspace: CurrentWorkspace, db: DBSession, name: Optional[str] = None, slug: Optional[str] = None):
    if name:
        workspace.name = name
    if slug:
        workspace.slug = slug
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.delete("/{workspace_id}", dependencies=[RequireRole(["owner"])])
async def delete_workspace(workspace_id: int, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete the workspace")
    
    await db.delete(workspace)
    await db.commit()
    return {"message": "Workspace deleted successfully"}

# Members
@router.get("/{workspace_id}/members", dependencies=[RequireRole(["owner", "admin", "editor", "viewer"])])
async def get_workspace_members(workspace_id: int, workspace: CurrentWorkspace, db: DBSession):
    stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id).options(selectinload(WorkspaceMember.user))
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.patch("/{workspace_id}/members/{member_id}", dependencies=[RequireRole(["owner", "admin"])])
async def update_workspace_member(workspace_id: int, member_id: int, role: str, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    stmt = select(WorkspaceMember).where(WorkspaceMember.id == member_id, WorkspaceMember.workspace_id == workspace.id)
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if member.user_id == workspace.owner_id:
        raise HTTPException(status_code=400, detail="Cannot modify owner role through this endpoint")
        
    if role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    member.role = role
    await db.commit()
    await db.refresh(member)
    return member

@router.delete("/{workspace_id}/members/{member_id}", dependencies=[RequireRole(["owner", "admin"])])
async def remove_workspace_member(workspace_id: int, member_id: int, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    stmt = select(WorkspaceMember).where(WorkspaceMember.id == member_id, WorkspaceMember.workspace_id == workspace.id)
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if member.user_id == workspace.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
        
    await db.delete(member)
    await db.commit()
    return {"message": "Member removed"}

# Invitations
@router.post("/{workspace_id}/invitations", dependencies=[RequireRole(["owner", "admin"])])
async def create_invitation(workspace_id: int, email: str, role: str, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    if role == "owner":
        raise HTTPException(status_code=400, detail="Cannot invite as owner")
    if role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    # Check if already a member
    user_stmt = select(User).where(User.email == email)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user:
        member_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == user.id)
        if (await db.execute(member_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="User is already a member")
            
    # Check for active invitation
    inv_stmt = select(WorkspaceInvitation).where(
        WorkspaceInvitation.workspace_id == workspace.id,
        WorkspaceInvitation.email == email,
        WorkspaceInvitation.expires_at > datetime.now(UTC),
        WorkspaceInvitation.accepted_at == None
    )
    if (await db.execute(inv_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Active invitation already exists for this email")

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    invitation = WorkspaceInvitation(
        workspace_id=workspace.id,
        email=email,
        role=role,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) + timedelta(days=7),
        invited_by=current_user.id
    )
    db.add(invitation)
    await db.commit()
    
    # Ideally send email here
    return {"message": "Invitation created", "token": token} # Only returned once

@router.get("/{workspace_id}/invitations", dependencies=[RequireRole(["owner", "admin"])])
async def get_invitations(workspace_id: int, workspace: CurrentWorkspace, db: DBSession):
    stmt = select(WorkspaceInvitation).where(WorkspaceInvitation.workspace_id == workspace.id, WorkspaceInvitation.accepted_at == None)
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.delete("/{workspace_id}/invitations/{invitation_id}", dependencies=[RequireRole(["owner", "admin"])])
async def revoke_invitation(workspace_id: int, invitation_id: int, workspace: CurrentWorkspace, db: DBSession):
    stmt = select(WorkspaceInvitation).where(WorkspaceInvitation.id == invitation_id, WorkspaceInvitation.workspace_id == workspace.id)
    invitation = (await db.execute(stmt)).scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    await db.delete(invitation)
    await db.commit()
    return {"message": "Invitation revoked"}

# Outside of {workspace_id} path so users can accept without header
@router.post("/invitations/accept")
async def accept_invitation(token: str, current_user: CurrentUser, db: DBSession):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    stmt = select(WorkspaceInvitation).where(
        WorkspaceInvitation.token_hash == token_hash,
        WorkspaceInvitation.accepted_at == None,
        WorkspaceInvitation.expires_at > datetime.now(UTC)
    )
    invitation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
        
    if invitation.email != current_user.email:
        raise HTTPException(status_code=400, detail="Invitation email does not match current user")
        
    invitation.accepted_at = datetime.now(UTC)
    
    member = WorkspaceMember(
        workspace_id=invitation.workspace_id,
        user_id=current_user.id,
        role=invitation.role,
        invited_by=invitation.invited_by,
        joined_at=datetime.now(UTC)
    )
    db.add(member)
    await db.commit()
    
    return {"message": "Invitation accepted", "workspace_id": invitation.workspace_id}

@router.post("/{workspace_id}/transfer-ownership", dependencies=[RequireRole(["owner"])])
async def transfer_ownership(workspace_id: int, new_owner_id: int, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    if current_user.id != workspace.owner_id:
        raise HTTPException(status_code=403, detail="Only the owner can transfer ownership")
        
    member_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == new_owner_id)
    new_owner_member = (await db.execute(member_stmt)).scalar_one_or_none()
    if not new_owner_member:
        raise HTTPException(status_code=400, detail="New owner must be a member of the workspace")
        
    old_owner_member_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == current_user.id)
    old_owner_member = (await db.execute(old_owner_member_stmt)).scalar_one_or_none()
    
    workspace.owner_id = new_owner_id
    new_owner_member.role = "owner"
    if old_owner_member:
        old_owner_member.role = "admin" # Demote old owner
        
    await db.commit()
    return {"message": "Ownership transferred successfully"}

@router.post("/{workspace_id}/leave")
async def leave_workspace(workspace_id: int, workspace: CurrentWorkspace, current_user: CurrentUser, db: DBSession):
    if workspace.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owner cannot leave without transferring ownership")
        
    stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == current_user.id)
    member = (await db.execute(stmt)).scalar_one_or_none()
    
    if member:
        await db.delete(member)
        await db.commit()
        
    return {"message": "Left workspace"}

