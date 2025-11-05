"""
Скрипт для тестирования всех email уведомлений системы Check_Site.
Отправляет тестовые email на указанный адрес для проверки всех сценариев.

Тестируемые сценарии:
1. Загрузка чертежа
2. Добавление пользователя в проект
3. Удаление пользователя из проекта
4. Создание заявки (первый согласующий)
5. Согласование этапа (следующий согласующий)
6. Полное согласование заявки
7. Отклонение заявки
"""

import os
import django
from django.conf import settings

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from apps.users.models import User, Company
from apps.projects.models import Project, Drawing
from apps.material_requests.models import MaterialRequest
from apps.material_requests.approval_models import ApprovalFlowTemplate, ApprovalStep

# Email для тестирования
TEST_EMAIL = 'urazbek0202@gmail.com'
TEST_USER_NAME = 'Уразбек Тестовый'

print("=" * 80)
print("🧪 ТЕСТИРОВАНИЕ EMAIL УВЕДОМЛЕНИЙ Check_Site")
print("=" * 80)
print(f"📧 Тестовый email: {TEST_EMAIL}")
print(f"📤 Отправитель: {settings.DEFAULT_FROM_EMAIL}")
print(f"🌐 SITE_URL: {settings.SITE_URL}")
print("=" * 80)

# Счетчик отправленных писем
emails_sent = []

def send_test_email(subject, html_content, text_content, test_name):
    """Отправка тестового email"""
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[TEST_EMAIL]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        emails_sent.append({
            'test': test_name,
            'subject': subject,
            'status': '✅ Успешно'
        })
        print(f"✅ {test_name}: Отправлено")
        return True
    except Exception as e:
        emails_sent.append({
            'test': test_name,
            'subject': subject,
            'status': f'❌ Ошибка: {str(e)}'
        })
        print(f"❌ {test_name}: Ошибка - {str(e)}")
        return False

# =============================================================================
# ТЕСТ 1: Загрузка чертежа
# =============================================================================
print("\n📐 ТЕСТ 1: Уведомление о загрузке чертежа")
print("-" * 80)

try:
    # Получаем или создаем тестовые данные
    company = Company.objects.first()
    project = Project.objects.filter(company=company).first()
    uploader = User.objects.filter(email=TEST_EMAIL).first()

    if not uploader:
        uploader = User.objects.filter(company=company).first()

    context = {
        'project_name': project.name if project else 'Тестовый проект',
        'file_name': 'План первого этажа.pdf',
        'file_size': '2.5 MB',
        'uploaded_by': uploader.get_full_name() if uploader else 'Главный инженер',
        'uploaded_at': timezone.now(),
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('projects/emails/drawing_uploaded.html', context)
    text_content = render_to_string('projects/emails/drawing_uploaded.txt', context)

    send_test_email(
        subject=f'📐 Новый чертеж загружен: {context["project_name"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Загрузка чертежа'
    )
except Exception as e:
    print(f"❌ Ошибка при подготовке данных: {str(e)}")

# =============================================================================
# ТЕСТ 2: Добавление пользователя в проект
# =============================================================================
print("\n🎯 ТЕСТ 2: Уведомление о добавлении в проект")
print("-" * 80)

try:
    context = {
        'user_name': TEST_USER_NAME,
        'project': {
            'name': project.name if project else 'ЖК "Восточный"',
            'address': project.address if project else 'г. Алматы, ул. Абая 100',
        },
        'assigned_by': uploader.get_full_name() if uploader else 'Руководитель проекта',
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('projects/emails/user_added_to_project.html', context)
    text_content = render_to_string('projects/emails/user_added_to_project.txt', context)

    send_test_email(
        subject=f'🎯 Вы добавлены в проект: {context["project"]["name"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Добавление в проект'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ТЕСТ 3: Удаление пользователя из проекта
# =============================================================================
print("\n📤 ТЕСТ 3: Уведомление об удалении из проекта")
print("-" * 80)

try:
    context = {
        'user_name': TEST_USER_NAME,
        'project': {
            'name': project.name if project else 'ЖК "Восточный"',
        },
        'removed_by': uploader.get_full_name() if uploader else 'Руководитель проекта',
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('projects/emails/user_removed_from_project.html', context)
    text_content = render_to_string('projects/emails/user_removed_from_project.txt', context)

    send_test_email(
        subject=f'📤 Вы удалены из проекта: {context["project"]["name"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Удаление из проекта'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ТЕСТ 4: Создание заявки (уведомление первому согласующему)
# =============================================================================
print("\n📋 ТЕСТ 4: Уведомление о новой заявке на согласование")
print("-" * 80)

try:
    # Получаем первый этап согласования
    flow = ApprovalFlowTemplate.objects.filter(is_active=True).first()
    first_step = flow.steps.order_by('order').first() if flow else None

    context = {
        'recipient_name': TEST_USER_NAME,
        'request_number': 'З-1-001/25',
        'title': 'Материалы для отделки 1-го этажа',
        'created_by': uploader if uploader else {'get_full_name': lambda: 'Прораб Иванов'},
        'project': project if project else {'name': 'ЖК "Восточный"'},
        'current_step': first_step if first_step else {
            'step_order': 1,
            'step_name': 'Снабженец'
        },
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('material_requests/emails/request_created.html', context)
    text_content = render_to_string('material_requests/emails/request_created.txt', context)

    send_test_email(
        subject=f'📋 Новая заявка на согласование: {context["request_number"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Новая заявка (первый согласующий)'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ТЕСТ 5: Согласование этапа (уведомление следующему согласующему)
# =============================================================================
print("\n✅ ТЕСТ 5: Уведомление о переходе к следующему этапу")
print("-" * 80)

try:
    second_step = flow.steps.order_by('order')[1] if flow and flow.steps.count() > 1 else None

    context = {
        'recipient_name': TEST_USER_NAME,
        'request_number': 'З-1-001/25',
        'title': 'Материалы для отделки 1-го этажа',
        'created_by': uploader if uploader else {'get_full_name': lambda: 'Прораб Иванов'},
        'project': project if project else {'name': 'ЖК "Восточный"'},
        'current_step': second_step if second_step else {
            'step_order': 2,
            'step_name': 'Завсклад'
        },
        'comment': 'Материалы проверены, все в порядке',
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('material_requests/emails/step_approved.html', context)
    text_content = render_to_string('material_requests/emails/step_approved.txt', context)

    send_test_email(
        subject=f'📋 Заявка ожидает вашего согласования: {context["request_number"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Согласование этапа (следующий согласующий)'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ТЕСТ 6: Полное согласование заявки
# =============================================================================
print("\n🎉 ТЕСТ 6: Уведомление о полном согласовании заявки")
print("-" * 80)

try:
    context = {
        'created_by': {'get_full_name': lambda: TEST_USER_NAME},
        'request_number': 'З-1-001/25',
        'title': 'Материалы для отделки 1-го этажа',
        'project': project if project else {'name': 'ЖК "Восточный"'},
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('material_requests/emails/fully_approved.html', context)
    text_content = render_to_string('material_requests/emails/fully_approved.txt', context)

    send_test_email(
        subject=f'🎉 Ваша заявка согласована: {context["request_number"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Полное согласование заявки'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ТЕСТ 7: Отклонение заявки
# =============================================================================
print("\n❌ ТЕСТ 7: Уведомление об отклонении заявки")
print("-" * 80)

try:
    context = {
        'created_by': {'get_full_name': lambda: TEST_USER_NAME},
        'request_number': 'З-1-001/25',
        'title': 'Материалы для отделки 1-го этажа',
        'project': project if project else {'name': 'ЖК "Восточный"'},
        'rejection_reason': 'Необходимо пересмотреть количество материалов. Завышенный объем арматуры на 20%.',
        'comment': None,
        'site_url': settings.SITE_URL,
        'site_name': settings.SITE_NAME,
    }

    html_content = render_to_string('material_requests/emails/request_rejected.html', context)
    text_content = render_to_string('material_requests/emails/request_rejected.txt', context)

    send_test_email(
        subject=f'❌ Ваша заявка отклонена: {context["request_number"]}',
        html_content=html_content,
        text_content=text_content,
        test_name='Отклонение заявки'
    )
except Exception as e:
    print(f"❌ Ошибка: {str(e)}")

# =============================================================================
# ИТОГОВЫЙ ОТЧЕТ
# =============================================================================
print("\n" + "=" * 80)
print("📊 ИТОГОВЫЙ ОТЧЕТ О ТЕСТИРОВАНИИ")
print("=" * 80)
print(f"\n📧 Получатель: {TEST_EMAIL}")
print(f"📤 Отправитель: {settings.DEFAULT_FROM_EMAIL}")
print(f"\n🔢 Всего тестов: {len(emails_sent)}")
print(f"✅ Успешно отправлено: {sum(1 for e in emails_sent if '✅' in e['status'])}")
print(f"❌ Ошибок: {sum(1 for e in emails_sent if '❌' in e['status'])}")

print("\n" + "-" * 80)
print("ДЕТАЛИ ОТПРАВЛЕННЫХ ПИСЕМ:")
print("-" * 80)

for i, email in enumerate(emails_sent, 1):
    print(f"\n{i}. {email['test']}")
    print(f"   Тема: {email['subject']}")
    print(f"   Статус: {email['status']}")

print("\n" + "=" * 80)
print("✨ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
print("=" * 80)
print("\nПроверьте почтовый ящик urazbek0202@gmail.com")
print("Также проверьте папку СПАМ, если письма не пришли во входящие.")
print("=" * 80)
