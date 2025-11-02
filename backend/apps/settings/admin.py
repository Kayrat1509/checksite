from django.contrib import admin
from apps.users.models import Company

# PageAccess удалён - теперь используется унифицированная модель ButtonAccess
# из приложения core (apps/core/models.py)
#
# Для управления доступом к страницам и кнопкам используйте:
# /admin/core/buttonaccess/
