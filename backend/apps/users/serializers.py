from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from .models import User, Company


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""

    class Meta:
        model = Company
        fields = ['id', 'name', 'country', 'address', 'phone', 'email', 'is_active']
        read_only_fields = ['id']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)
    short_name = serializers.CharField(source='get_short_name', read_only=True)
    # Название компании заказчика (ForeignKey)
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    # Список проектов пользователя
    user_projects = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'secondary_email', 'first_name', 'last_name',
            'middle_name', 'full_name', 'short_name', 'role', 'position',
            'phone', 'telegram_id', 'avatar', 'company', 'company_name', 'external_company_name', 'work_type', 'supervision_company',
            'is_active', 'is_verified', 'is_superuser', 'approved', 'archived', 'temp_password',
            'is_company_owner', 'has_full_access', 'role_category',  # НОВЫЕ ПОЛЯ
            'user_projects', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_verified', 'is_superuser', 'is_company_owner', 'has_full_access', 'role_category']

    def get_user_projects(self, obj):
        """Получить список проектов пользователя."""
        return [{'id': p.id, 'name': p.name} for p in obj.projects.all()]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users with auto-generated password."""

    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='Список ID проектов, к которым будет привязан пользователь'
    )

    class Meta:
        model = User
        fields = [
            'email', 'secondary_email', 'first_name', 'last_name',
            'middle_name', 'role', 'position', 'phone', 'telegram_id',
            'company', 'external_company_name', 'work_type', 'supervision_company', 'project_ids'
        ]

    def validate(self, attrs):
        """Normalize email to lowercase."""
        # Приводим email к нижнему регистру для case-insensitive входа
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()
        if 'secondary_email' in attrs and attrs['secondary_email']:
            attrs['secondary_email'] = attrs['secondary_email'].lower()
        return attrs

    def create(self, validated_data):
        """Create user with auto-generated password and assign to projects."""
        import secrets
        import string

        project_ids = validated_data.pop('project_ids', [])

        # Автоматическая генерация безопасного пароля (12 символов: буквы, цифры, спецсимволы)
        alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
        password = ''.join(secrets.choice(alphabet) for i in range(12))

        # Убеждаемся что пароль содержит как минимум одну букву, одну цифру и один спецсимвол
        while not (any(c.isalpha() for c in password) and
                   any(c.isdigit() for c in password) and
                   any(c in '!@#$%^&*' for c in password)):
            password = ''.join(secrets.choice(alphabet) for i in range(12))

        # Если компания не указана, используем компанию текущего пользователя
        if 'company' not in validated_data or validated_data.get('company') is None:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.company:
                validated_data['company'] = request.user.company

        # Создаем пользователя с указанным паролем
        user = User.objects.create_user(password=password, **validated_data)

        # Сохраняем временный пароль для отображения администратору
        user.temp_password = password
        user.save(update_fields=['temp_password'])

        # Привязываем пользователя к проектам
        if project_ids:
            from apps.projects.models import Project
            projects = Project.objects.filter(id__in=project_ids, company=user.company)
            for project in projects:
                project.team_members.add(user)

        # Send credentials via email (optional, don't fail if email sending fails)
        try:
            self.send_credentials_email(user, password)
        except Exception as e:
            # Log error but don't fail user creation
            print(f"Failed to send credentials email: {e}")

        return user

    def send_credentials_email(self, user, password):
        """Send login credentials to user's email."""
        subject = 'Доступ к системе Check Site'
        message = f"""
        Здравствуйте, {user.get_full_name()}!

        Для вас создана учетная запись в системе Check Site.

        Данные для входа:
        Email: {user.email}
        Пароль: {password}

        Ссылка для входа: {settings.ALLOWED_HOSTS[0]}/login

        Рекомендуем сменить пароль после первого входа.

        С уважением,
        Команда Check Site
        """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,  # Don't fail if email sending fails
        )


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration (management only)."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    # Company fields
    company_name = serializers.CharField(
        write_only=True,
        required=True,
        max_length=255,
        help_text='Укажите полное название компании с организационно-правовой формой (например: ТОО "СтройКомпани", LLC "BuildCorp")'
    )
    company_country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'secondary_email', 'first_name', 'last_name',
            'middle_name', 'position', 'password', 'password_confirm',
            'company_name', 'company_country',
            'company_address', 'company_phone', 'company_email'
        ]

    def validate(self, attrs):
        """Validate passwords match and normalize email."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают'
            })
        attrs.pop('password_confirm')

        # Приводим email к нижнему регистру для case-insensitive входа
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()
        if 'secondary_email' in attrs and attrs['secondary_email']:
            attrs['secondary_email'] = attrs['secondary_email'].lower()

        return attrs

    def create(self, validated_data):
        """Create user with management role and company."""
        # Сохраняем пароль перед удалением из validated_data
        password = validated_data.get('password')

        # Extract company data
        company_data = {
            'name': validated_data.pop('company_name'),
            'country': validated_data.pop('company_country', ''),
            'address': validated_data.pop('company_address', ''),
            'phone': validated_data.pop('company_phone', ''),
            'email': validated_data.pop('company_email', ''),
        }

        # Create company
        company = Company.objects.create(**company_data)

        # Default role for self-registration
        validated_data['role'] = User.Role.DIRECTOR
        validated_data['is_verified'] = True  # Auto-verify management
        validated_data['company'] = company

        # Создаем пользователя
        user = User.objects.create_user(**validated_data)

        # Сохраняем временный пароль для отображения в админке
        user.temp_password = password
        user.save(update_fields=['temp_password'])

        # Send welcome email (optional, don't fail if email sending fails)
        try:
            self.send_welcome_email(user)
        except Exception as e:
            # Log error but don't fail registration
            print(f"Failed to send welcome email: {e}")

        return user

    def send_welcome_email(self, user):
        """Send welcome email after registration."""
        subject = 'Добро пожаловать в Check Site'
        message = f"""
        Здравствуйте, {user.get_full_name()}!

        Спасибо за регистрацию в системе Check Site.

        Вы успешно зарегистрированы и можете начать работу.

        Email: {user.email}

        С уважением,
        Команда Check Site
        """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,  # Don't fail if email sending fails
        )


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing users."""

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text='Оставьте пустым, если не хотите менять пароль'
    )
    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='Список ID проектов, к которым будет привязан пользователь'
    )

    class Meta:
        model = User
        fields = [
            'email', 'secondary_email', 'first_name', 'last_name',
            'middle_name', 'role', 'position', 'phone', 'telegram_id',
            'company', 'external_company_name', 'supervision_company', 'password', 'project_ids', 'approved'
        ]

    def validate(self, attrs):
        """Normalize email to lowercase."""
        # Приводим email к нижнему регистру для case-insensitive входа
        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()
        if 'secondary_email' in attrs and attrs['secondary_email']:
            attrs['secondary_email'] = attrs['secondary_email'].lower()
        return attrs

    def validate_password(self, value):
        """Validate password if provided."""
        if value:  # Если пароль указан, валидируем его
            try:
                validate_password(value)
            except ValidationError as e:
                raise serializers.ValidationError(list(e.messages))
        return value

    def update(self, instance, validated_data):
        """Update user with optional password change and project assignments."""
        password = validated_data.pop('password', None)
        project_ids = validated_data.pop('project_ids', None)

        # Обновляем поля пользователя
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Обновляем пароль если он был указан
        if password:
            instance.set_password(password)
            # Сохраняем временный пароль для отображения администратору
            instance.temp_password = password

        instance.save()

        # Обновляем привязку к проектам если указаны project_ids
        if project_ids is not None:
            from apps.projects.models import Project
            # Удаляем пользователя из всех проектов
            for project in instance.projects.all():
                project.team_members.remove(instance)

            # Добавляем к новым проектам
            projects = Project.objects.filter(id__in=project_ids, company=instance.company)
            for project in projects:
                project.team_members.add(instance)

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Validate old password and new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Пароли не совпадают'
            })
        return attrs

    def validate_old_password(self, value):
        """Validate old password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль')
        return value
