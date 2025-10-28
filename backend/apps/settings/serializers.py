from rest_framework import serializers
from .models import PageAccess, RoleTemplate
from apps.users.models import User


class PageAccessSerializer(serializers.ModelSerializer):
    """Сериализатор для модели PageAccess."""

    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = PageAccess
        fields = ['id', 'company', 'company_name', 'page', 'role', 'has_access', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AccessMatrixSerializer(serializers.Serializer):
    """
    Сериализатор для работы с матрицей доступа в формате:
    {
        'dashboard': {'DIRECTOR': true, 'ENGINEER': false, ...},
        'projects': {'DIRECTOR': true, ...},
        ...
    }
    """
    matrix = serializers.DictField(
        child=serializers.DictField(
            child=serializers.BooleanField()
        )
    )

    def validate_matrix(self, value):
        """Валидация матрицы доступа."""
        valid_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
        valid_roles = [choice[0] for choice in PageAccess.RoleChoices.choices]

        for page, roles in value.items():
            if page not in valid_pages:
                raise serializers.ValidationError(f"Неверная страница: {page}")

            for role, has_access in roles.items():
                if role not in valid_roles:
                    raise serializers.ValidationError(f"Неверная роль: {role}")

                if not isinstance(has_access, bool):
                    raise serializers.ValidationError(f"Значение доступа должно быть boolean")

        return value

    def create(self, validated_data):
        """Сохранение матрицы доступа в базу данных для компании пользователя."""
        matrix = validated_data['matrix']
        company = self.context.get('company')

        if not company:
            raise serializers.ValidationError("Компания не указана")

        # Обновляем или создаем записи для каждой комбинации страница-роль для конкретной компании
        for page, roles in matrix.items():
            for role, has_access in roles.items():
                PageAccess.objects.update_or_create(
                    company=company,
                    page=page,
                    role=role,
                    defaults={'has_access': has_access}
                )

        return validated_data

    def to_representation(self, instance):
        """Преобразование данных из БД в формат матрицы для компании пользователя."""
        company = self.context.get('company')

        if not company:
            raise serializers.ValidationError("Компания не указана")

        # Получаем записи доступа только для конкретной компании
        access_records = PageAccess.objects.filter(company=company)

        # Формируем матрицу
        matrix = {}
        for record in access_records:
            if record.page not in matrix:
                matrix[record.page] = {}
            matrix[record.page][record.role] = record.has_access

        return {'matrix': matrix}


class RoleTemplateSerializer(serializers.ModelSerializer):
    """Сериализатор для шаблонов ролей."""

    role_display = serializers.CharField(source='get_role_display', read_only=True)
    pages_count = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = RoleTemplate
        fields = [
            'id', 'company', 'company_name', 'name', 'role', 'role_display',
            'description', 'allowed_pages', 'is_default', 'pages_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_pages_count(self, obj):
        """Получить количество разрешенных страниц."""
        return len(obj.allowed_pages) if obj.allowed_pages else 0

    def validate_allowed_pages(self, value):
        """Валидация списка разрешенных страниц."""
        if not isinstance(value, list):
            raise serializers.ValidationError("allowed_pages должен быть списком")

        valid_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
        invalid_pages = [p for p in value if p not in valid_pages]

        if invalid_pages:
            raise serializers.ValidationError(
                f'Недопустимые страницы: {", ".join(invalid_pages)}'
            )

        return value

    def validate_role(self, value):
        """Валидация роли."""
        valid_roles = [choice[0] for choice in User.Role.choices]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Недопустимая роль: {value}")
        return value

    def create(self, validated_data):
        """Создание шаблона роли с автоматической привязкой к компании."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.company:
            validated_data['company'] = request.user.company
        return super().create(validated_data)


class UserAccessManagementSerializer(serializers.Serializer):
    """Сериализатор для управления доступом конкретного пользователя."""

    user_id = serializers.IntegerField()
    allowed_pages = serializers.ListField(
        child=serializers.CharField(),
        help_text='Список slug страниц, доступных пользователю'
    )

    def validate_user_id(self, value):
        """Валидация пользователя."""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Request не найден в контексте')

        try:
            user = User.objects.get(id=value, company=request.user.company)
        except User.DoesNotExist:
            raise serializers.ValidationError('Пользователь не найден в вашей компании')

        return value

    def validate_allowed_pages(self, value):
        """Валидация списка разрешенных страниц."""
        valid_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
        invalid_pages = [p for p in value if p not in valid_pages]

        if invalid_pages:
            raise serializers.ValidationError(
                f'Недопустимые страницы: {", ".join(invalid_pages)}'
            )

        return value

    def save(self):
        """Сохранение прав доступа для пользователя."""
        user_id = self.validated_data['user_id']
        allowed_pages = self.validated_data['allowed_pages']

        user = User.objects.get(id=user_id)

        # Удаляем существующие права доступа для роли пользователя
        PageAccess.objects.filter(
            company=user.company,
            role=user.role
        ).delete()

        # Создаем новые права доступа
        for page in allowed_pages:
            PageAccess.objects.create(
                company=user.company,
                role=user.role,
                page=page,
                has_access=True
            )

        return user


class UserAccessInfoSerializer(serializers.Serializer):
    """Сериализатор для отображения информации о доступе пользователя."""

    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    role_display = serializers.CharField()
    role_category = serializers.CharField()
    has_full_access = serializers.BooleanField()
    is_company_owner = serializers.BooleanField()
    allowed_pages = serializers.ListField(child=serializers.CharField())
