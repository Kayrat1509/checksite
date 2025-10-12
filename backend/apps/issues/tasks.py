from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Issue
from apps.notifications.tasks import send_telegram_notification


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
