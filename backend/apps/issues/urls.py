from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IssueViewSet, IssuePhotoViewSet, IssueCommentViewSet

router = DefaultRouter()
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'photos', IssuePhotoViewSet, basename='issuephoto')
router.register(r'comments', IssueCommentViewSet, basename='issuecomment')

urlpatterns = [
    path('', include(router.urls)),
]
