# apps/projects/tasks.py
"""
Celery задачи для проектов.
"""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_drawing_upload_notification(self, drawing_id):
    """
    Отправляет email уведомление о загрузке нового чертежа всем участникам проекта.

    Args:
        drawing_id: ID загруженного чертежа

    Retry: 3 попытки с интервалом 60 секунд
    """
    try:
        from apps.projects.models import Drawing

        # Получаем чертеж с related данными
        drawing = Drawing.objects.select_related(
            'project',
            'uploaded_by',
            'uploaded_by__company'
        ).get(id=drawing_id)

        # Получаем всех участников проекта
        team_members = drawing.project.team_members.filter(
            is_deleted=False,
            is_active=True
        ).exclude(
            email=''
        ).exclude(
            email__isnull=True
        )

        if not team_members.exists():
            logger.warning(f'Нет активных участников проекта {drawing.project.name} для отправки уведомления о чертеже {drawing.id}')
            return

        # Собираем список email
        recipient_emails = list(team_members.values_list('email', flat=True))

        # Подготавливаем контекст для шаблона
        context = {
            'drawing': drawing,
            'project': drawing.project,
            'uploaded_by': drawing.uploaded_by,
            'file_name': drawing.file_name,
            'file_size': drawing.file_size,
            'uploaded_at': drawing.created_at,
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
        }

        # Формируем тему письма
        subject = f'📐 Новый чертеж загружен в проект "{drawing.project.name}" - {settings.SITE_NAME}'

        # Рендерим HTML и текстовую версии
        html_message = render_to_string('projects/emails/drawing_uploaded.html', context)
        text_message = render_to_string('projects/emails/drawing_uploaded.txt', context)

        # Отправляем email всем участникам проекта
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_emails,
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f'Email уведомление о загрузке чертежа {drawing.file_name} отправлено {len(recipient_emails)} участникам проекта {drawing.project.name}')

    except Drawing.DoesNotExist:
        logger.error(f'Чертеж с ID {drawing_id} не найден')
        raise

    except Exception as exc:
        logger.error(f'Ошибка при отправке email уведомления о чертеже {drawing_id}: {str(exc)}')
        # Retry задачи при ошибке
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_project_assignment_notification(self, user_id, project_id, action='added', assigned_by_id=None):
    """
    Отправляет email уведомление пользователю о привязке/отвязке от проекта.

    Args:
        user_id: ID пользователя
        project_id: ID проекта
        action: 'added' или 'removed'
        assigned_by_id: ID пользователя, который выполнил действие (опционально)

    Retry: 3 попытки с интервалом 60 секунд
    """
    try:
        from apps.users.models import User
        from apps.projects.models import Project

        # Получаем пользователя и проект
        user = User.objects.select_related('company').get(id=user_id)
        project = Project.objects.get(id=project_id)

        # Получаем того, кто выполнил действие (если указано)
        assigned_by = None
        if assigned_by_id:
            try:
                assigned_by = User.objects.get(id=assigned_by_id)
            except User.DoesNotExist:
                pass

        # Проверяем наличие email
        if not user.email:
            logger.warning(f'У пользователя {user.get_full_name()} (ID: {user_id}) нет email для отправки уведомления')
            return

        # Подготавливаем контекст для шаблона
        context = {
            'user': user,
            'project': project,
            'assigned_by': assigned_by,
            'action': action,
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
        }

        # Выбираем шаблон и тему в зависимости от действия
        if action == 'added':
            template_name = 'user_added_to_project'
            subject = f'🎯 Вы назначены на проект "{project.name}" - {settings.SITE_NAME}'
        else:  # removed
            template_name = 'user_removed_from_project'
            subject = f'📤 Вы удалены из проекта "{project.name}" - {settings.SITE_NAME}'

        # Рендерим HTML и текстовую версии
        html_message = render_to_string(f'projects/emails/{template_name}.html', context)
        text_message = render_to_string(f'projects/emails/{template_name}.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        action_text = 'добавлен в' if action == 'added' else 'удален из'
        logger.info(f'Email уведомление о том, что пользователь {user.get_full_name()} {action_text} проект {project.name} отправлено на {user.email}')

    except User.DoesNotExist:
        logger.error(f'Пользователь с ID {user_id} не найден')
        raise

    except Project.DoesNotExist:
        logger.error(f'Проект с ID {project_id} не найден')
        raise

    except Exception as exc:
        logger.error(f'Ошибка при отправке email уведомления о назначении на проект: {str(exc)}')
        # Retry задачи при ошибке
        raise self.retry(exc=exc)
