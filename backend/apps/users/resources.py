"""
Ресурсы для импорта/экспорта пользователей через Excel.
"""

import secrets
import string
from import_export import resources, fields, widgets
from import_export.results import RowResult
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

User = get_user_model()


class RoleWidget(widgets.CharWidget):
    """
    Виджет для конвертации ролей между русским и английским языком.
    """
    # Маппинг ролей: русский -> английский
    ROLE_MAPPING = {
        'Суперадмин': 'SUPERADMIN',
        'Директор': 'DIRECTOR',
        'Главный инженер': 'CHIEF_ENGINEER',
        'Руководитель проекта': 'PROJECT_MANAGER',
        'Инженер ПТО': 'ENGINEER',
        'Начальник участка': 'SITE_MANAGER',
        'Прораб': 'FOREMAN',
        'Мастер': 'MASTER',
        'Технадзор': 'SUPERVISOR',
        'Подрядчик': 'CONTRACTOR',
        'Наблюдатель': 'OBSERVER',
        'Снабженец': 'SUPPLY_MANAGER',
        'Зав.Центрсклада': 'WAREHOUSE_HEAD',
        'Завсклад объекта': 'SITE_WAREHOUSE_MANAGER',
    }

    # Обратный маппинг: английский -> русский
    REVERSE_ROLE_MAPPING = {v: k for k, v in ROLE_MAPPING.items()}

    def clean(self, value, row=None, *args, **kwargs):
        """Конвертирует русское название роли в английское."""
        if not value:
            return User.Role.OBSERVER  # Роль по умолчанию

        # Убираем лишние пробелы
        value = value.strip()

        # Если уже на английском - возвращаем как есть
        if value in User.Role.values:
            return value

        # Конвертируем из русского
        role = self.ROLE_MAPPING.get(value)
        if not role:
            raise ValueError(f'Неизвестная роль: {value}. Доступные роли: {", ".join(self.ROLE_MAPPING.keys())}')

        return role

    def render(self, value, obj=None):
        """Конвертирует английское название роли в русское для экспорта."""
        if not value:
            return ''
        return self.REVERSE_ROLE_MAPPING.get(value, value)


class BooleanRussianWidget(widgets.BooleanWidget):
    """
    Виджет для конвертации булевых значений с русским языком.
    """
    TRUE_VALUES = ['да', 'yes', 'true', '1', 'True', 'Да', 'ДА']
    FALSE_VALUES = ['нет', 'no', 'false', '0', 'False', 'Нет', 'НЕТ']

    def clean(self, value, row=None, *args, **kwargs):
        """Конвертирует строку в булево значение."""
        if not value:
            return True  # По умолчанию активен

        value_str = str(value).strip().lower()

        if value_str in [v.lower() for v in self.TRUE_VALUES]:
            return True
        elif value_str in [v.lower() for v in self.FALSE_VALUES]:
            return False
        else:
            return True  # По умолчанию

    def render(self, value, obj=None):
        """Конвертирует булево значение в русскую строку."""
        if value is True:
            return 'Да'
        elif value is False:
            return 'Нет'
        return 'Да'


def generate_temporary_password(length=10):
    """
    Генерирует случайный временный пароль.

    Args:
        length: Длина пароля (по умолчанию 10 символов)

    Returns:
        Строка со случайным паролем
    """
    # Используем буквы (верхний и нижний регистр) и цифры
    alphabet = string.ascii_letters + string.digits
    # Генерируем безопасный случайный пароль
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


class UserResource(resources.ModelResource):
    """
    Ресурс для импорта/экспорта пользователей.
    """

    # Определяем поля для импорта/экспорта
    full_name = fields.Field(
        column_name='ФИО',
        attribute='full_name',
        readonly=True  # Только для экспорта, при импорте разбивается на составные части
    )

    last_name = fields.Field(
        column_name='Фамилия',
        attribute='last_name',
    )

    first_name = fields.Field(
        column_name='Имя',
        attribute='first_name',
    )

    middle_name = fields.Field(
        column_name='Отчество',
        attribute='middle_name',
    )

    email = fields.Field(
        column_name='Email *',
        attribute='email',
    )

    phone = fields.Field(
        column_name='Телефон',
        attribute='phone',
    )

    position = fields.Field(
        column_name='Должность',
        attribute='position',
    )

    role = fields.Field(
        column_name='Роль *',
        attribute='role',
        widget=RoleWidget(),
    )

    company_name = fields.Field(
        column_name='Компания',
        attribute='company',
        readonly=True  # Компания указывается отдельно
    )

    is_active = fields.Field(
        column_name='Активен',
        attribute='is_active',
        widget=BooleanRussianWidget(),
    )

    temp_password = fields.Field(
        column_name='Временный пароль',
        attribute='temp_password',
        readonly=True  # Только для экспорта
    )

    class Meta:
        model = User
        # Поля для импорта (без full_name, company_name, temp_password)
        import_id_fields = ('email',)
        fields = (
            'email', 'first_name', 'last_name', 'middle_name',
            'phone', 'position', 'role', 'is_active'
        )
        # Поля для экспорта (включая полное имя и временный пароль)
        export_order = (
            'full_name', 'email', 'phone', 'position',
            'role', 'company_name', 'is_active', 'temp_password'
        )
        skip_unchanged = True
        report_skipped = True

    def get_export_headers(self):
        """
        Возвращает заголовки для экспорта на русском языке.
        """
        return [field.column_name for field in self.get_export_fields()]

    def before_import_row(self, row, **kwargs):
        """
        Обработка строки перед импортом.
        Валидация и подготовка данных.
        """
        # Валидация email
        email = row.get('Email *', '').strip().lower()
        if not email:
            raise ValidationError('Email обязателен для заполнения')

        try:
            validate_email(email)
        except ValidationError:
            raise ValidationError(f'Некорректный email: {email}')

        # Нормализация email
        row['Email *'] = email

        # Проверка обязательных полей
        if not row.get('Имя', '').strip():
            raise ValidationError('Имя обязательно для заполнения')

        if not row.get('Фамилия', '').strip():
            raise ValidationError('Фамилия обязательна для заполнения')

        return row

    def after_import_row(self, row, row_result, **kwargs):
        """
        Обработка после импорта строки.
        Генерация временного пароля и отправка email.
        """
        if row_result.import_type == RowResult.IMPORT_TYPE_NEW:
            # Это новый пользователь - генерируем временный пароль
            user = row_result.object_id
            if user:
                try:
                    user_obj = User.objects.get(pk=user)

                    # Генерируем временный пароль
                    temp_password = generate_temporary_password()
                    user_obj.set_temporary_password(temp_password)
                    user_obj.add_to_password_history(
                        action='created',
                        details=f'Пользователь создан через импорт Excel'
                    )

                    # Отправляем email асинхронно через Celery
                    from apps.users.tasks import send_temp_password_email
                    send_temp_password_email.delay(
                        user_id=user_obj.id,
                        temp_password=temp_password
                    )

                except User.DoesNotExist:
                    pass

    def skip_row(self, instance, original, row, import_validation_errors=None):
        """
        Определяет, нужно ли пропустить строку при импорте.
        """
        # Пропускаем строки с ошибками валидации
        if import_validation_errors:
            return True

        return super().skip_row(instance, original, row, import_validation_errors)

    def dehydrate_full_name(self, user):
        """
        Формирует полное имя для экспорта.
        """
        return user.get_full_name()

    def dehydrate_company_name(self, user):
        """
        Возвращает название компании для экспорта.
        """
        if user.company:
            return user.company.name
        return user.external_company_name or ''
