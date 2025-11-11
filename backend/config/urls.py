"""
URL configuration for Check_Site project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/issues/', include('apps.issues.urls')),
    path('api/', include('apps.tasks.urls')),  # Задачи
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reports/', include('apps.reports.urls')),
    # УДАЛЕНО: path('api/', include('apps.technical_conditions.urls')) - функционал удален
    path('api/material-requests/', include('apps.material_requests.urls')),  # Заявки на материалы
    path('api/', include('apps.tenders.urls')),  # Тендеры
    path('api/public-tenders/', include('apps.tenders.public_urls')),  # Публичные тендеры
    # УДАЛЕНО: path('api/warehouse/', include('apps.warehouse.urls')) - функционал удален
    path('api/settings/', include('apps.settings.urls')),  # Настройки системы
    path('api/', include('apps.core.urls')),  # Корзина (Recycle Bin)
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
