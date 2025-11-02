"""
Custom template tags для матрицы доступа к страницам.
"""

from django import template

register = template.Library()


@register.filter
def get_access(access_dict, key):
    """
    Получает вложенный словарь доступа.

    Usage:
        {{ access_matrix|get_access:page_key|get_access:role_key }}
    """
    if isinstance(access_dict, dict):
        return access_dict.get(key, {})
    return False


@register.filter
def multiply(value, arg):
    """
    Умножает value на arg.

    Usage:
        {{ total_pages|multiply:13 }}
    """
    try:
        return int(value) * int(arg)
    except (ValueError, TypeError):
        return 0
