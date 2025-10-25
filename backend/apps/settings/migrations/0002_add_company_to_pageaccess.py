# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('settings', '0001_initial'),
    ]

    operations = [
        # Удаляем старую таблицу полностью
        migrations.DeleteModel(
            name='PageAccess',
        ),
        # Создаем новую таблицу с полем company
        migrations.CreateModel(
            name='PageAccess',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page', models.CharField(choices=[('dashboard', 'Дашборд'), ('projects', 'Проекты'), ('issues', 'Замечания'), ('users', 'Сотрудники'), ('contractors', 'Подрядчики'), ('supervisions', 'Надзоры'), ('technical-conditions', 'Техусловия'), ('material-requests', 'Заявки'), ('warehouse', 'Склад'), ('tenders', 'Тендеры'), ('reports', 'Отчеты'), ('profile', 'Профиль'), ('settings', 'Настройки')], max_length=50, verbose_name='Страница')),
                ('role', models.CharField(choices=[('DIRECTOR', 'Директор'), ('CHIEF_ENGINEER', 'Гл.инженер'), ('PROJECT_MANAGER', 'Рук.проекта'), ('ENGINEER', 'Инженер ПТО'), ('SITE_MANAGER', 'Нач.участка'), ('FOREMAN', 'Прораб'), ('MASTER', 'Мастер'), ('SUPERVISOR', 'Технадзор'), ('CONTRACTOR', 'Подрядчик'), ('OBSERVER', 'Наблюдатель'), ('SUPPLY_MANAGER', 'Снабженец'), ('WAREHOUSE_HEAD', 'Зав.склада'), ('SITE_WAREHOUSE_MANAGER', 'Завсклад объекта')], max_length=50, verbose_name='Роль')),
                ('has_access', models.BooleanField(default=False, verbose_name='Есть доступ')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('company', models.ForeignKey(help_text='Компания, для которой настраивается доступ', on_delete=django.db.models.deletion.CASCADE, related_name='page_access_settings', to='users.company', verbose_name='Компания')),
            ],
            options={
                'verbose_name': 'Доступ к странице',
                'verbose_name_plural': 'Матрица доступа',
                'ordering': ['company', 'page', 'role'],
            },
        ),
        migrations.AddIndex(
            model_name='pageaccess',
            index=models.Index(fields=['company', 'page', 'role'], name='settings_pa_company_bb9a2c_idx'),
        ),
        migrations.AddIndex(
            model_name='pageaccess',
            index=models.Index(fields=['company'], name='settings_pa_company_b4cf68_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='pageaccess',
            unique_together={('company', 'page', 'role')},
        ),
    ]
