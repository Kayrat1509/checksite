from celery import shared_task
from django.core.mail import EmailMessage
from django.utils import timezone
from datetime import timedelta
from apps.projects.models import Project
from apps.issues.models import Issue
from .utils import generate_excel_report


@shared_task
def send_daily_reports():
    """
    Send daily reports to project managers.
    Run every day at 9:00 AM via Celery Beat.
    """
    projects = Project.objects.filter(is_active=True)

    for project in projects:
        if not project.project_manager or not project.project_manager.email:
            continue

        # Get yesterday's issues
        yesterday = timezone.now() - timedelta(days=1)
        issues = Issue.objects.filter(
            project=project,
            created_at__gte=yesterday
        )

        if not issues.exists():
            continue

        # Generate report data
        data = {
            'project': project,
            'issues': issues,
            'total_issues': issues.count(),
            'completed': issues.filter(status=Issue.Status.COMPLETED).count(),
            'in_progress': issues.filter(status=Issue.Status.IN_PROGRESS).count(),
            'overdue': issues.filter(status=Issue.Status.OVERDUE).count(),
            'generated_at': timezone.now(),
        }

        # Generate Excel report
        report_content = generate_excel_report(data, 'project_summary')

        # Send email
        email = EmailMessage(
            subject=f'Ежедневный отчет: {project.name}',
            body=f"""
Добрый день!

Ежедневный отчет по проекту "{project.name}".

Статистика за последние 24 часа:
- Новых замечаний: {issues.count()}
- Выполнено: {data['completed']}
- В процессе: {data['in_progress']}
- Просрочено: {data['overdue']}

С уважением,
Система Check Site
            """,
            from_email='noreply@checksite.com',
            to=[project.project_manager.email],
        )

        email.attach(
            f'daily_report_{project.id}_{timezone.now().strftime("%Y%m%d")}.xlsx',
            report_content,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        email.send()

    return f"Sent daily reports for {projects.count()} projects"
