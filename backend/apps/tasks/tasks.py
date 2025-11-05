# apps/tasks/tasks.py
"""
Celery задачи для управления уведомлениями о задачах.

Все уведомления отправляются МОМЕНТАЛЬНО (не отложенно).
"""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_task_notification(self, task_id, notification_type, **kwargs):
    """
    Отправляет email уведомление о задаче МОМЕНТАЛЬНО.

    Args:
        task_id (int): ID задачи
        notification_type (str): Тип уведомления
            - 'created': Новая задача создана
            - 'updated': Задача изменена
            - 'completed': Задача выполнена
            - 'rejected': Задача отклонена
            - 'overdue': Задача просрочена
        **kwargs: Дополнительные параметры (например, completed_by_user_id)

    Returns:
        dict: Результат отправки
    """
    from .models import Task
    from apps.users.models import User

    try:
        task = Task.objects.select_related(
            'created_by',
            'assigned_to_user',
            'assigned_to_contractor',
            'company',
            'project'
        ).get(id=task_id)

        # Определяем получателя в зависимости от типа уведомления
        if notification_type == 'completed':
            # Уведомление создателю о том, что задача выполнена
            recipient_email = task.created_by.email
            recipient_name = task.created_by.get_full_name()
        else:
            # Уведомление исполнителю (created, updated, rejected, overdue)
            if not task.assigned_to_email:
                logger.warning(f'Задача {task.task_number} не имеет исполнителя для отправки уведомления')
                return {'status': 'skipped', 'reason': 'no_assignee'}

            recipient_email = task.assigned_to_email
            recipient_name = task.assigned_to.get_full_name()

        # Формируем тему письма в зависимости от типа
        subject_prefix = {
            'created': '🎯 Новая задача',
            'updated': '✏️ Задача изменена',
            'completed': '✅ Задача выполнена',
            'rejected': '❌ Задача отменена',
            'overdue': '⚠️ Задача просрочена',
        }.get(notification_type, '📋 Уведомление о задаче')

        subject = f'{subject_prefix}: {task.title}'

        # Подготавливаем контекст для шаблона
        context = {
            'task': task,
            'notification_type': notification_type,
            'recipient_name': recipient_name,
            'site_url': settings.SITE_URL or 'http://localhost:5174',
            'site_name': settings.SITE_NAME or 'Check_Site',
            'task_url': f"{settings.SITE_URL or 'http://localhost:5174'}/dashboard/tasks/{task.id}",
            'created_by_name': task.created_by.get_full_name(),
            'assignee_name': task.assigned_to.get_full_name() if task.assigned_to else 'Не назначен',
            'company_name': task.company.name,
            'project_name': task.project.name if task.project else 'Без проекта',
        }

        # Для уведомления о выполнении задачи добавляем информацию о том, кто выполнил
        if notification_type == 'completed' and 'completed_by_user_id' in kwargs:
            completed_by = User.objects.get(id=kwargs['completed_by_user_id'])
            context['completed_by_name'] = completed_by.get_full_name()

        # Рендерим HTML и текстовую версии письма
        html_message = render_to_string(f'tasks/emails/{notification_type}.html', context)
        text_message = render_to_string(f'tasks/emails/{notification_type}.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(
            f'Email уведомление "{notification_type}" отправлено для задачи {task.task_number} '
            f'на адрес {recipient_email}'
        )

        return {
            'status': 'success',
            'task_id': task_id,
            'task_number': task.task_number,
            'notification_type': notification_type,
            'recipient_email': recipient_email,
        }

    except Task.DoesNotExist:
        logger.error(f'Задача с ID {task_id} не найдена при отправке уведомления')
        return {
            'status': 'error',
            'task_id': task_id,
            'message': f'Задача с ID {task_id} не найдена'
        }

    except Exception as exc:
        logger.error(
            f'Ошибка при отправке email уведомления для задачи {task_id}: {str(exc)}',
            exc_info=True
        )
        # Повторная попытка при ошибке (максимум 3 попытки с интервалом 60 секунд)
        raise self.retry(exc=exc)


@shared_task
def check_overdue_tasks():
    """
    Проверяет все задачи на просрочку и отправляет уведомления.

    Запускается автоматически каждый час через Celery Beat.

    Returns:
        str: Сообщение о количестве обработанных задач
    """
    from .models import Task

    # Находим все задачи в исполнении, у которых истек дедлайн
    now = timezone.now()
    overdue_tasks = Task.objects.filter(
        status=Task.STATUS_IN_PROGRESS,
        deadline__lt=now,
        is_deleted=False
    ).select_related('created_by', 'assigned_to_user', 'assigned_to_contractor')

    overdue_count = overdue_tasks.count()

    if overdue_count == 0:
        logger.info('Просроченных задач не найдено')
        return 'Просроченных задач не найдено'

    # Обновляем статус и отправляем уведомления
    updated_count = 0
    for task in overdue_tasks:
        try:
            # Обновляем статус на "Просрочено"
            task.status = Task.STATUS_OVERDUE
            task.save(update_fields=['status'])

            # Отправляем уведомление исполнителю МОМЕНТАЛЬНО
            send_task_notification.delay(
                task_id=task.id,
                notification_type='overdue'
            )

            updated_count += 1
            logger.info(f'Задача {task.task_number} отмечена как просроченная')

        except Exception as e:
            logger.error(f'Ошибка при обработке просроченной задачи {task.id}: {str(e)}')

    result = f'Обновлено {updated_count} просроченных задач из {overdue_count}'
    logger.info(result)
    return result
