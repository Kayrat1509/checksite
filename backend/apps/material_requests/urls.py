from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaterialRequestViewSet,
    MaterialRequestItemViewSet,
    MaterialRequestDocumentViewSet,
    MaterialRequestCommentViewSet
)

# !>7405< @>CB5@ 4;O 02B><0B8G5A:>9 35=5@0F88 URL
router = DefaultRouter()
router.register(r'material-requests', MaterialRequestViewSet, basename='material-request')
router.register(r'material-request-items', MaterialRequestItemViewSet, basename='material-request-item')
router.register(r'material-request-documents', MaterialRequestDocumentViewSet, basename='material-request-document')
router.register(r'material-request-comments', MaterialRequestCommentViewSet, basename='material-request-comment')

urlpatterns = [
    path('', include(router.urls)),
]
