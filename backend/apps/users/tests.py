import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user():
    def make_user(**kwargs):
        defaults = {
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123'
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)
    return make_user


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self, create_user):
        user = create_user()
        assert user.email == 'test@example.com'
        assert user.get_full_name() == 'User Test'
        assert user.check_password('testpass123')

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
        assert admin.is_superuser
        assert admin.is_staff
        assert admin.role == User.Role.SUPERADMIN


@pytest.mark.django_db
class TestAuthAPI:
    def test_login(self, api_client, create_user):
        user = create_user()
        response = api_client.post('/api/auth/token/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_credentials(self, api_client):
        response = api_client.post('/api/auth/token/', {
            'email': 'test@example.com',
            'password': 'wrongpass'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user(self, api_client, create_user):
        user = create_user()
        api_client.force_authenticate(user=user)
        response = api_client.get('/api/auth/users/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
