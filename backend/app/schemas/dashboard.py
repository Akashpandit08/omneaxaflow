from pydantic import BaseModel

class VideoStatusCounts(BaseModel):
    queued: int = 0
    processing: int = 0
    completed: int = 0
    failed: int = 0

class DashboardStatsOut(BaseModel):
    total_videos: int
    credits_remaining: int
    total_credits: int
    video_statuses: VideoStatusCounts
