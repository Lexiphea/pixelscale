"""Tests for authentication endpoints."""


class TestRegistration:
    """Tests for user registration."""

    def test_register_success(self, client, test_user_data):
        """Test successful user registration."""
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == test_user_data["username"]
        assert "password" not in data
        assert "hashed_password" not in data

    def test_register_duplicate_username(self, client, test_user_data, registered_user):
        """Test registration fails with duplicate username."""
        duplicate = test_user_data.copy()
        response = client.post("/api/auth/register", json=duplicate)
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]

    def test_register_short_password(self, client, test_user_data):
        """Test registration fails with password less than 8 characters."""
        invalid = test_user_data.copy()
        invalid["password"] = "short"
        response = client.post("/api/auth/register", json=invalid)
        assert response.status_code == 422


class TestLogin:
    """Tests for user login."""

    def test_login_success(self, client, test_user_data, registered_user):
        """Test successful login returns token."""
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"],
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user_data, registered_user):
        """Test login fails with wrong password."""
        login_data = {
            "username": test_user_data["username"],
            "password": "wrongpassword",
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        """Test login fails for non-existent user."""
        login_data = {
            "username": "doesnotexist",
            "password": "somepassword",
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401


class TestProtectedRoutes:
    """Tests for protected endpoints."""

    def test_get_me_authenticated(self, client, auth_headers, test_user_data):
        """Test /me endpoint returns current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user_data["username"]

    def test_get_me_unauthenticated(self, client):
        """Test /me endpoint requires authentication."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client):
        """Test /me endpoint rejects invalid token."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
