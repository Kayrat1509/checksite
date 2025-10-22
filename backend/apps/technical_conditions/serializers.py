from rest_framework import serializers
from .models import TechnicalCondition
from apps.users.serializers import UserSerializer


class TechnicalConditionSerializer(serializers.ModelSerializer):
    """Сериализатор для технических условий."""

    # Информация о пользователе, который добавил техусловие
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_data = UserSerializer(source='created_by', read_only=True)

    # Информация о проекте
    project_name = serializers.CharField(source='project.name', read_only=True)

    # URL файла для скачивания
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TechnicalCondition
        fields = [
            'id',
            'file',
            'file_url',
            'project',
            'project_name',
            'received_from',
            'description',
            'created_by',
            'created_by_name',
            'created_by_data',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        """Возвращает полный URL файла."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def create(self, validated_data):
        """Создание нового техусловия с автоматическим указанием создателя."""
        # Получаем текущего пользователя из контекста
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        return super().create(validated_data)


class TechnicalConditionCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания технического условия."""

    class Meta:
        model = TechnicalCondition
        fields = ['file', 'project', 'received_from', 'description']

    def validate_file(self, value):
        """Валидация файла - должен быть PDF."""
        if value:
            # Проверяем расширение файла
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError('Разрешены только PDF файлы')

            # Проверяем размер файла (максимум 10 МБ)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError('Размер файла не должен превышать 10 МБ')

        return value


class TechnicalConditionUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления технического условия."""

    # Файл опционален при обновлении (можно заменить или оставить старый)
    file = serializers.FileField(required=False)

    class Meta:
        model = TechnicalCondition
        fields = ['file', 'project', 'received_from', 'description']

    def validate_file(self, value):
        """Валидация файла - должен быть PDF."""
        if value:
            # Проверяем расширение файла
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError('Разрешены только PDF файлы')

            # Проверяем размер файла (максимум 10 МБ)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError('Размер файла не должен превышать 10 МБ')

        return value
