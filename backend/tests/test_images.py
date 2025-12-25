"""Tests for image endpoints with user ownership."""
import io
from unittest.mock import patch


class TestImageOwnership:
    """Tests for image ownership and isolation."""

    def test_get_images_requires_auth(self, client):
        """Test GET /images requires authentication."""
        response = client.get("/api/images")
        assert response.status_code == 401

    def test_upload_requires_auth(self, client):
        """Test POST /upload requires authentication."""
        files = {"file": ("test.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
        response = client.post("/api/upload", files=files)
        assert response.status_code == 401

    def test_get_images_empty_for_new_user(self, client, auth_headers):
        """Test new user has no images."""
        response = client.get("/api/images", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    @patch("src.app.routers.images.s3.upload_file_to_s3", return_value=True)
    @patch("src.app.routers.images.process_image", return_value=("key", "/uploads/img.jpg"))
    def test_upload_image_authenticated(self, mock_process, mock_s3, client, auth_headers):
        """Test authenticated user can upload image."""
        files = {"file": ("test.jpg", io.BytesIO(b"fake image data"), "image/jpeg")}
        response = client.post("/api/upload", files=files, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test.jpg"
        assert "id" in data

    @patch("src.app.routers.images.s3.upload_file_to_s3", return_value=True)
    @patch("src.app.routers.images.process_image", return_value=("key", "/uploads/img.jpg"))
    def test_user_can_only_see_own_images(
        self, mock_process, mock_s3, client, db_session
    ):
        """Test users can only see their own images."""
        # Create user 1 and upload image
        user1_data = {"username": "user1", "email": "user1@test.com", "password": "password123"}
        client.post("/api/auth/register", json=user1_data)
        login_resp1 = client.post("/api/auth/login", json={"username": "user1", "password": "password123"})
        token1 = login_resp1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        files = {"file": ("user1.jpg", io.BytesIO(b"user1 image"), "image/jpeg")}
        upload_resp = client.post("/api/upload", files=files, headers=headers1)
        user1_image_id = upload_resp.json()["id"]

        # Create user 2
        user2_data = {"username": "user2", "email": "user2@test.com", "password": "password123"}
        client.post("/api/auth/register", json=user2_data)
        login_resp2 = client.post("/api/auth/login", json={"username": "user2", "password": "password123"})
        token2 = login_resp2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 2 should not see User 1's images
        images_resp = client.get("/api/images", headers=headers2)
        assert images_resp.status_code == 200
        assert images_resp.json() == []

        # User 2 should get 404 for User 1's image
        image_resp = client.get(f"/api/images/{user1_image_id}", headers=headers2)
        assert image_resp.status_code == 404
