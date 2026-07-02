from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DBSession
from app.models.advanced import Quiz, QuizQuestion
from app.schemas.advanced import QuizCreate, QuizOut
from app.services.analytics import track_event

router = APIRouter()

@router.post("/videos/{id}/quizzes", response_model=QuizOut)
async def create_quiz(
    id: int,
    request: Request,
    body: QuizCreate,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    
    quiz = Quiz(
        video_id=id,
        workspace_id=workspace.id,
        title=body.title,
        created_by=current_user.id
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    
    for q in body.questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question=q.question,
            options=q.options,
            correct_answer=q.correct_answer,
            timestamp_seconds=q.timestamp_seconds,
            points=q.points
        )
        db.add(question)
    
    await db.commit()
    
    # Refresh with questions
    result = await db.execute(select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz.id))
    quiz_with_questions = result.scalar_one()
    
    await track_event(db, workspace.id, "QUIZ_CREATED")
    
    return quiz_with_questions

@router.get("/videos/{id}/quizzes", response_model=list[QuizOut])
async def list_quizzes(
    id: int,
    request: Request,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.video_id == id, Quiz.workspace_id == workspace.id)
    )
    return list(result.scalars().all())

@router.put("/quizzes/{id}", response_model=QuizOut)
async def update_quiz(
    id: int,
    request: Request,
    body: QuizCreate,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(select(Quiz).where(Quiz.id == id, Quiz.workspace_id == workspace.id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    quiz.title = body.title
    
    # Basic update logic: delete old questions, add new ones
    delete_result = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))
    old_questions = delete_result.scalars().all()
    for q in old_questions:
        await db.delete(q)
        
    for q in body.questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question=q.question,
            options=q.options,
            correct_answer=q.correct_answer,
            timestamp_seconds=q.timestamp_seconds,
            points=q.points
        )
        db.add(question)
        
    await db.commit()
    
    result = await db.execute(select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz.id))
    quiz_with_questions = result.scalar_one()
    return quiz_with_questions

@router.delete("/quizzes/{id}", status_code=204)
async def delete_quiz(
    id: int,
    request: Request,
    current_user: CurrentUser,
    db: DBSession
):
    workspace = request.state.workspace
    result = await db.execute(select(Quiz).where(Quiz.id == id, Quiz.workspace_id == workspace.id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    await db.delete(quiz)
    await db.commit()
    return None
