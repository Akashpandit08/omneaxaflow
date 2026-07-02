from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin

from sqlalchemy import Text

class VoiceClone(Base, TimestampMixin):
    __tablename__ = "voice_clones"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)  # 'cartesia', 'xtts', 'elevenlabs', 'polly'
    provider_voice_id = Column(String(255), nullable=True)
    provider_status = Column(String(50), nullable=True)
    provider_error = Column(Text, nullable=True)
    provider_metadata = Column(JSON, nullable=True)
    sample_audio_url = Column(String(1024), nullable=False)
    preview_url = Column(String(1024), nullable=True)
    status = Column(String(50), nullable=False, default="uploaded")  # uploaded, training, ready, failed

    workspace = relationship("Workspace")
    user = relationship("User")


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    video = relationship("Video")
    workspace = relationship("Workspace")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    question = Column(String(1024), nullable=False)
    options = Column(JSON, nullable=False)  # e.g., ["A", "B", "C"]
    correct_answer = Column(String(255), nullable=False)
    timestamp_seconds = Column(Float, nullable=False)
    points = Column(Integer, nullable=False, default=1)

    quiz = relationship("Quiz", back_populates="questions")


class SCORMPackage(Base, TimestampMixin):
    __tablename__ = "scorm_packages"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    package_version = Column(String(50), nullable=False)  # SCORM 1.2, SCORM 2004
    manifest_url = Column(String(1024), nullable=True)
    zip_url = Column(String(1024), nullable=True)
    status = Column(String(50), nullable=False, default="processing")

    video = relationship("Video")
    workspace = relationship("Workspace")
