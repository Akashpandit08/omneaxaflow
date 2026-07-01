import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_voice_clone(client: AsyncClient, token_headers: dict, test_workspace: dict):
    response = await client.post(
        "/api/v1/voices/clone",
        headers=token_headers,
        json={"name": "My Clone", "provider": "elevenlabs"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Clone"
    assert data["provider"] == "elevenlabs"
    assert data["status"] == "uploaded"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_voice_clones(client: AsyncClient, token_headers: dict, test_workspace: dict):
    response = await client.get("/api/v1/voices/clones", headers=token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_create_quiz(client: AsyncClient, token_headers: dict, test_workspace: dict, test_video: dict):
    response = await client.post(
        f"/api/v1/videos/{test_video['id']}/quizzes",
        headers=token_headers,
        json={
            "title": "Interactive Test",
            "questions": [
                {
                    "question": "What color is the sky?",
                    "options": ["Blue", "Red"],
                    "correct_answer": "Blue",
                    "timestamp_seconds": 10.5,
                    "points": 1
                }
            ]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Interactive Test"
    assert len(data["questions"]) == 1
    assert data["questions"][0]["question"] == "What color is the sky?"

@pytest.mark.asyncio
async def test_create_scorm_package(client: AsyncClient, token_headers: dict, test_workspace: dict, test_video: dict):
    response = await client.post(
        f"/api/v1/videos/{test_video['id']}/scorm",
        headers=token_headers,
        json={"package_version": "SCORM 1.2"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["package_version"] == "SCORM 1.2"
    assert data["status"] == "processing"
