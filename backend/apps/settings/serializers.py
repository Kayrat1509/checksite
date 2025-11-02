from rest_framework import serializers
from .models import RoleTemplate
from apps.users.models import User

# PageAccessSerializer удалён - используйте ButtonAccess из apps.core
# AccessMatrixSerializer удалён - используйте ButtonAccess API
# UserAccessManagementSerializer удалён - используйте ButtonAccess API

# Все сериализаторы, связанные с PageAccess, удалены
# Теперь используется унифицированная модель ButtonAccess (apps.core.models)
#
# Для работы с доступом к страницам используйте:
# - API: /api/button-access/page_access/
# - Admin: /admin/core/buttonaccess/


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

        # Список допустимых страниц (аналог PageAccess.PageChoices)
        valid_pages = [
            'dashboard', 'projects', 'issues', 'users', 'contractors',
            'supervisions', 'material-requests', 'warehouse', 'tenders',
            'reports', 'profile', 'settings'
        ]
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
