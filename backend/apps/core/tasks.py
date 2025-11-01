"""
Celery tasks для работы с корзиной (Recycle Bin).
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.apps import apps
import logging

logger = logging.getLogger(__name__)


@shared_task(name='core.clean_recycle_bin')
def clean_recycle_bin():
    """
    Периодическая задача для автоматической очистки корзины.

    Удаляет все объекты, которые находятся в корзине более 31 дня.
    Запускается ежедневно в 03:00 по расписанию Celery Beat.

    Returns:
        dict: Статистика удаления с количеством удаленных объектов по моделям
    """
    logger.info("[Recycle Bin] Начало автоматической очистки корзины")

    now = timezone.now()
    expiration_threshold = now - timedelta(days=31)

    # Модели с поддержкой soft delete
    models_with_soft_delete = [
        'projects.Project',
        'users.User',
        'material_requests.MaterialRequest',
        'tenders.Tender',
    ]

    deleted_count = 0
    details = {}

    # Удаляем просроченные объекты из всех моделей
    for model_path in models_with_soft_delete:
        app_label, model_name = model_path.split('.')

        try:
            Model = apps.get_model(app_label, model_name)

            # Получаем просроченные объекты (удаленные более 31 дня назад)
            expired_objects = Model.all_objects.filter(
                is_deleted=True,
                deleted_at__lte=expiration_threshold
            )

            count = expired_objects.count()

            if count > 0:
                logger.info(f"[Recycle Bin] Найдено {count} просроченных объектов модели {model_name}")

                # Физически удаляем из БД
                expired_objects.delete()

                deleted_count += count
                details[model_name] = count

                logger.info(f"[Recycle Bin] Удалено {count} объектов модели {model_name}")

        except Exception as e:
            logger.error(f"[Recycle Bin] Ошибка при очистке модели {model_name}: {str(e)}")
            continue

    logger.info(f"[Recycle Bin] Автоматическая очистка завершена. Всего удалено: {deleted_count} объектов")

    return {
        'status': 'success',
        'deleted_count': deleted_count,
        'details': details,
        'timestamp': now.isoformat(),
    }
