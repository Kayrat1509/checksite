# apps/material_requests/apps.py
from django.apps import AppConfig


class MaterialRequestsConfig(AppConfig):
    """Конфигурация приложения для заявок на материалы."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.material_requests'
    verbose_name = 'Заявки на материалы'
