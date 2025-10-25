from rest_framework import serializers
from .models import PageAccess


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
