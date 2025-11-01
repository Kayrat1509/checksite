from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Конфигурация приложения core для базовых миксинов и утилит."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Базовые компоненты"
