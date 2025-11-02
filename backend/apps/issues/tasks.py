from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta
from .models import Issue
from apps.notifications.tasks import send_telegram_notification
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_overdue_issues():
    """
    Check for overdue issues and update their status.
    Run every hour via Celery Beat.
    """
    now = timezone.now()

    # Find issues past deadline
    overdue_issues = Issue.objects.filter(
        deadline__lt=now,
        status__in=[Issue.Status.NEW, Issue.Status.IN_PROGRESS, Issue.Status.PENDING_REVIEW]
    )

    count = 0
    for issue in overdue_issues:
        issue.status = Issue.Status.OVERDUE
        issue.save()
        count += 1

        # Notify assigned user
        if issue.assigned_to and issue.assigned_to.telegram_id:
            message = f"""
⚠️ ПРОСРОЧЕНО!

📋 {issue.title}
🏗 {issue.project.name}
⏰ Срок был: {issue.deadline.strftime('%d.%m.%Y %H:%M')}
            """
            send_telegram_notification.delay(
                issue.assigned_to.telegram_id,
                message
            )

    return f"Updated {count} overdue issues"


@shared_task
def send_deadline_reminders():
    """
    Send reminders for issues with deadlines in next 24 hours.
    Run daily at 10:00 AM via Celery Beat.
    """
    now = timezone.now()
    tomorrow = now + timedelta(hours=24)

    # Find issues with deadline in next 24 hours
    upcoming_issues = Issue.objects.filter(
        deadline__gte=now,
        deadline__lte=tomorrow,
        status__in=[Issue.Status.NEW, Issue.Status.IN_PROGRESS]
    )

    count = 0
    for issue in upcoming_issues:
        if issue.assigned_to and issue.assigned_to.telegram_id:
            hours_left = (issue.deadline - now).total_seconds() / 3600

            message = f"""
⏰ НАПОМИНАНИЕ: Истекает срок!

📋 {issue.title}
🏗 {issue.project.name}
⏰ Срок: {issue.deadline.strftime('%d.%m.%Y %H:%M')}
⌛ Осталось: {int(hours_left)} часов

Пожалуйста, завершите работу в срок!
            """

            send_telegram_notification.delay(
                issue.assigned_to.telegram_id,
                message
            )
            count += 1

    return f"Sent {count} deadline reminders"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_new_issue_notification(self, issue_id):
    """
    Отправляет email уведомление подрядчику о новом замечании.

    Args:
        issue_id (int): ID созданного замечания

    Returns:
        dict: Результат отправки с информацией о статусе
    """
    try:
        # Получаем замечание с related данными
        issue = Issue.objects.select_related(
            'project', 'site', 'assigned_to', 'created_by'
        ).get(id=issue_id)

        # Проверяем, что есть назначенный исполнитель
        if not issue.assigned_to:
            logger.warning(f'Замечание #{issue_id} не имеет назначенного исполнителя')
            return {
                'status': 'skipped',
                'issue_id': issue_id,
                'message': 'Нет назначенного исполнителя'
            }

        # Проверяем наличие email у исполнителя
        if not issue.assigned_to.email:
            logger.warning(f'У исполнителя {issue.assigned_to.get_full_name()} нет email')
            return {
                'status': 'skipped',
                'issue_id': issue_id,
                'message': 'У исполнителя нет email'
            }

        # Формируем тему письма
        priority_label = {
            'CRITICAL': 'КРИТИЧНОЕ',
            'HIGH': 'ВЫСОКИЙ ПРИОРИТЕТ',
            'NORMAL': 'Новое'
        }.get(issue.priority, 'Новое')

        subject = f'{priority_label}: Замечание #{issue.id} - {issue.title}'

        # Формируем URL для перехода к замечанию
        issue_url = f"{settings.SITE_URL}/dashboard/issues?issue_id={issue.id}"

        # Формируем контекст для шаблона
        context = {
            'issue': issue,
            'contractor': issue.assigned_to,
            'created_by': issue.created_by,
            'site_name': settings.SITE_NAME or 'Система контроля качества строительства',
            'site_url': settings.SITE_URL or 'http://localhost:5174',
            'issue_url': issue_url,
        }

        # Рендерим HTML версию письма
        html_message = render_to_string('issues/emails/new_issue_assigned.html', context)

        # Рендерим текстовую версию письма
        text_message = render_to_string('issues/emails/new_issue_assigned.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[issue.assigned_to.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(
            f'Email о новом замечании #{issue.id} отправлен пользователю {issue.assigned_to.email} '
            f'({issue.assigned_to.get_full_name()})'
        )

        return {
            'status': 'success',
            'issue_id': issue_id,
            'contractor_email': issue.assigned_to.email,
            'message': 'Email успешно отправлен'
        }

    except Issue.DoesNotExist:
        logger.error(f'Замечание с ID {issue_id} не найдено при отправке уведомления')
        return {
            'status': 'error',
            'issue_id': issue_id,
            'message': f'Замечание с ID {issue_id} не найдено'
        }

    except Exception as exc:
        logger.error(
            f'Ошибка при отправке email уведомления для замечания #{issue_id}: {str(exc)}',
            exc_info=True
        )
        # Повторная попытка при ошибке (максимум 3 попытки с интервалом 60 секунд)
        raise self.retry(exc=exc)
