"""
Celery configuration for Check_Site project.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('checksite')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat schedule
app.conf.beat_schedule = {
    'check-overdue-issues-every-hour': {
        'task': 'apps.issues.tasks.check_overdue_issues',
        'schedule': crontab(minute=0),  # Every hour
    },
    'send-daily-reports': {
        'task': 'apps.reports.tasks.send_daily_reports',
        'schedule': crontab(hour=9, minute=0),  # Every day at 9:00 AM
    },
    'send-deadline-reminders': {
        'task': 'apps.issues.tasks.send_deadline_reminders',
        'schedule': crontab(hour=10, minute=0),  # Every day at 10:00 AM
    },
}

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
