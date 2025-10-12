import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import Project, Site, Category
from apps.issues.models import Issue

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
            'password': 'testpass123',
            'role': User.Role.ENGINEER
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)
    return make_user


@pytest.fixture
def create_project(create_user):
    def make_project(**kwargs):
        manager = create_user(email='manager@example.com')
        defaults = {
            'name': 'Test Project',
            'address': 'Test Address',
            'project_manager': manager
        }
        defaults.update(kwargs)
        return Project.objects.create(**defaults)
    return make_project


@pytest.fixture
def create_site(create_project):
    def make_site(**kwargs):
        project = create_project()
        defaults = {
            'project': project,
            'name': 'Test Site'
        }
        defaults.update(kwargs)
        return Site.objects.create(**defaults)
    return make_site


@pytest.mark.django_db
class TestIssueModel:
    def test_create_issue(self, create_user, create_site):
        creator = create_user()
        site = create_site()

        issue = Issue.objects.create(
            title='Test Issue',
            description='Test Description',
            project=site.project,
            site=site,
            created_by=creator,
            status=Issue.Status.NEW,
            priority=Issue.Priority.NORMAL
        )

        assert issue.title == 'Test Issue'
        assert issue.status == Issue.Status.NEW
        assert issue.created_by == creator


@pytest.mark.django_db
class TestIssueAPI:
    def test_list_issues(self, api_client, create_user, create_site):
        user = create_user()
        site = create_site()

        Issue.objects.create(
            title='Issue 1',
            description='Description 1',
            project=site.project,
            site=site,
            created_by=user
        )

        api_client.force_authenticate(user=user)
        response = api_client.get('/api/issues/issues/')

        assert response.status_code == status.HTTP_200_OK

    def test_create_issue(self, api_client, create_user, create_site):
        user = create_user()
        site = create_site()

        api_client.force_authenticate(user=user)
        response = api_client.post('/api/issues/issues/', {
            'title': 'New Issue',
            'description': 'New Description',
            'project': site.project.id,
            'site': site.id,
            'priority': 'NORMAL'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert Issue.objects.filter(title='New Issue').exists()
