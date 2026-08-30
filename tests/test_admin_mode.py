from copy import deepcopy

from fastapi.testclient import TestClient

from src.app import activities, app


ORIGINAL_PARTICIPANTS = deepcopy(activities["Chess Club"]["participants"])


def reset_activity_state():
    activities["Chess Club"]["participants"] = ORIGINAL_PARTICIPANTS.copy()


def test_teacher_login_sets_auth_cookie():
    reset_activity_state()
    with TestClient(app) as client:
        response = client.post(
            "/login",
            json={"username": "admin", "password": "admin123"},
        )

        assert response.status_code == 200
        assert "teacher_session" in response.cookies
        assert response.json()["role"] == "teacher"


def test_guest_cannot_register_student():
    reset_activity_state()
    with TestClient(app) as client:
        response = client.post(
            "/activities/Chess Club/signup",
            params={"email": "newstudent@mergington.edu"},
        )

        assert response.status_code == 401
        assert "teacher" in response.json()["detail"].lower()


def test_teacher_can_register_student():
    reset_activity_state()
    with TestClient(app) as client:
        login = client.post(
            "/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login.status_code == 200

        student_email = "newstudent@mergington.edu"
        response = client.post(
            "/activities/Chess Club/signup",
            params={"email": student_email},
        )

        assert response.status_code == 200
        assert student_email in response.json()["participants"]
