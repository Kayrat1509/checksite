from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from .models import User
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for post-save events on User model.
    """
    if created:
        # Additional logic when user is created
        # For example, create user profile, send notifications, etc.
        pass


@receiver(post_save, sender=User)
def set_first_user_as_owner(sender, instance, created, **kwargs):
    """
    Сигнал: Автоматически назначить первого пользователя компании владельцем.

    Логика:
    1. Если это новый пользователь (created=True)
    2. И у него есть компания
    3. И в его компании нет других пользователей
    4. То назначить его владельцем с полным доступом
    """
    if created and instance.company:
        # Проверяем, есть ли другие пользователи в компании
        # Исключаем текущего пользователя и суперадминов
        other_users = User.objects.filter(
            company=instance.company
        ).exclude(id=instance.id).exclude(is_superuser=True).exists()

        if not other_users:
            # Это первый пользователь компании
            logger.info(f'Назначение первого пользователя {instance.email} владельцем компании {instance.company.name}')

            instance.role = User.Role.DIRECTOR
            instance.is_company_owner = True
            instance.has_full_access = True
            instance.role_category = 'MANAGEMENT'
            instance.approved = True
            instance.is_verified = True
            instance.save(update_fields=[
                'role', 'is_company_owner', 'has_full_access',
                'role_category', 'approved', 'is_verified'
            ])

            # Создаем дефолтную матрицу доступа для всех ролей компании
            create_default_page_access_for_company(instance.company)


@receiver(post_save, sender=User)
def update_full_access_for_management(sender, instance, created, **kwargs):
    """
    Сигнал: Автоматически установить полный доступ для руководства.

    Логика:
    1. Если роль относится к категории Руководство
    2. То установить has_full_access=True и role_category='MANAGEMENT'
    3. Создать права доступа ко всем страницам
    """
    # Пропускаем, если это создание нового пользователя (обработает другой сигнал)
    if created:
        return

    # Проверяем, изменилась ли роль на руководящую
    if instance.is_management_category:
        if not instance.has_full_access or instance.role_category != 'MANAGEMENT':
            logger.info(f'Установка полного доступа для {instance.email} (роль: {instance.role})')

            instance.has_full_access = True
            instance.role_category = 'MANAGEMENT'
            instance.save(update_fields=['has_full_access', 'role_category'])

            # Создаем права доступа ко всем страницам
            if instance.company:
                from apps.settings.models import PageAccess
                all_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
                for page in all_pages:
                    PageAccess.objects.get_or_create(
                        company=instance.company,
                        role=instance.role,
                        page=page,
                        defaults={'has_access': True}
                    )
    elif instance.is_itr_supply_category:
        # Если роль относится к ИТР и снабжению
        if instance.has_full_access or instance.role_category != 'ITR_SUPPLY':
            logger.info(f'Установка ограниченного доступа для {instance.email} (роль: {instance.role})')

            instance.has_full_access = False
            instance.role_category = 'ITR_SUPPLY'
            instance.save(update_fields=['has_full_access', 'role_category'])


def create_default_page_access_for_company(company):
    """
    Создать дефолтную матрицу доступа для всех ролей компании.

    Для категории Руководство - полный доступ ко всем страницам.
    Для категории ИТР и снабжение - минимальный доступ (дашборд и профиль).
    """
    from apps.settings.models import PageAccess

    logger.info(f'Создание дефолтной матрицы доступа для компании {company.name}')

    # Дефолтные права для категории "Руководство"
    # ОБНОВЛЕНО: Удален 'technical-conditions' из списка доступных страниц
    management_pages = [
        'dashboard', 'projects', 'issues', 'users', 'contractors',
        'supervisions', 'material-requests', 'warehouse',
        'tenders', 'reports', 'profile', 'settings'
    ]

    management_roles = [
        'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
        'SITE_MANAGER', 'FOREMAN'
    ]

    created_count = 0
    for role in management_roles:
        for page in management_pages:
            _, created = PageAccess.objects.get_or_create(
                company=company,
                role=role,
                page=page,
                defaults={'has_access': True}
            )
            if created:
                created_count += 1

    # Дефолтные права для категории "ИТР и снабжение"
    # Минимальный доступ: только дашборд и профиль
    itr_pages = ['dashboard', 'profile']

    itr_roles = [
        'ENGINEER', 'MASTER', 'SUPPLY_MANAGER',
        'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER'
    ]

    for role in itr_roles:
        for page in itr_pages:
            _, created = PageAccess.objects.get_or_create(
                company=company,
                role=role,
                page=page,
                defaults={'has_access': True}
            )
            if created:
                created_count += 1

    logger.info(f'Создано {created_count} записей PageAccess для компании {company.name}')


@receiver(user_logged_in)
def track_temp_password_login(sender, request, user, **kwargs):
    """
    Отслеживание входа пользователя с временным паролем.
    Увеличивает счетчик попыток входа и блокирует после 3-й попытки.
    """
    if not hasattr(user, 'password_change_required'):
        return

    # Проверяем, требуется ли смена пароля
    if user.password_change_required:
        # Увеличиваем счетчик
        limit_reached = user.increment_temp_password_login()

        if limit_reached:
            logger.warning(
                f'Пользователь {user.email} достиг лимита входов с временным паролем'
            )

            # Отправляем напоминание о смене пароля
            from apps.users.tasks import send_password_change_reminder
            send_password_change_reminder.delay(user_id=user.id)
        else:
            logger.info(
                f'Пользователь {user.email} вошел с временным паролем. '
                f'Попыток: {user.login_attempts_with_temp_password}/3'
            )
