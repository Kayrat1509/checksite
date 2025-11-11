"""
Конфигурация приложения material_requests
"""
from django.apps import AppConfig


class MaterialRequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.material_requests'
    verbose_name = 'Заявки на материалы'

    def ready(self):
        """Импорт сигналов при запуске приложения"""
        import apps.material_requests.signals  # noqa
