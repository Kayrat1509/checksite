"""
Сериализаторы для публичного API тендеров
"""
from rest_framework import serializers
from .models import Tender, PublicTenderAccess
from django.contrib.auth.hashers import make_password


class PublicTenderSerializer(serializers.ModelSerializer):
    """Публичный сериализатор для просмотра тендеров внешними пользователями"""

    # Контакты руководителя проекта
    project_manager_name = serializers.CharField(source='project.project_manager.get_full_name', read_only=True)
    project_manager_phone = serializers.CharField(source='project.project_manager.phone', read_only=True)
    project_manager_email = serializers.EmailField(source='project.project_manager.email', read_only=True)

    class Meta:
        model = Tender
        fields = [
            'id', 'title', 'description', 'tender_type', 'company_name', 'city',
            'project_name', 'status', 'budget', 'execution_period',
            'start_date', 'end_date',
            'project_manager_name', 'project_manager_phone', 'project_manager_email',
            'created_at'
        ]

    # Добавляем project_name как read-only поле
    project_name = serializers.CharField(source='project.name', read_only=True)


class PublicTenderAccessRegisterSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации нового внешнего пользователя"""
    
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    class Meta:
        model = PublicTenderAccess
        fields = [
            'company_name', 'contact_person', 'email', 'phone', 'city',
            'password', 'password_confirm'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'style': {'input_type': 'password'}}
        }
    
    def validate(self, data):
        """Проверка совпадения паролей"""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают'
            })
        return data
    
    def create(self, validated_data):
        """Создание заявки с хэшированным паролем"""
        validated_data.pop('password_confirm')
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)


class PublicTenderAccessLoginSerializer(serializers.Serializer):
    """Сериализатор для входа внешнего пользователя"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})


class PublicTenderAccessSerializer(serializers.ModelSerializer):
    """Сериализатор для просмотра информации о доступе"""
    
    class Meta:
        model = PublicTenderAccess
        fields = [
            'id', 'company_name', 'contact_person', 'email', 'phone', 'city',
            'status', 'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'last_login']
