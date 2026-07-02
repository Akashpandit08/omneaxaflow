import asyncio
import os
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend dir to python path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.core.database import async_session_maker
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

async def main():
    async with async_session_maker() as db:
        # get first user
        result = await db.execute(select(User).order_by(User.id))
        user = result.scalars().first()
        
        if not user:
            print("No users found in database.")
            return

        # check if workspace exists
        result = await db.execute(select(Workspace).where(Workspace.owner_id == user.id))
        ws = result.scalars().first()
        
        if ws:
            print(f"Workspace already exists: {ws.name}")
            # Ensure they are an active member
            mem_res = await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == user.id))
            member = mem_res.scalars().first()
            if not member:
                member = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner", status="active")
                db.add(member)
                await db.commit()
                print("Added user as active member to existing workspace.")
            else:
                member.status = "active"
                await db.commit()
                print("Activated membership.")
        else:
            print(f"Creating default workspace for user {user.email}")
            ws = Workspace(
                name="My Workspace",
                slug="my-workspace",
                owner_id=user.id,
                plan="free",
                is_active=True
            )
            db.add(ws)
            await db.commit()
            await db.refresh(ws)
            
            member = WorkspaceMember(
                workspace_id=ws.id,
                user_id=user.id,
                role="owner",
                status="active"
            )
            db.add(member)
            await db.commit()
            print("Created workspace and added user as owner!")

if __name__ == "__main__":
    asyncio.run(main())
