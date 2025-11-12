"""
Сигналы для материальных заявок
"""
# ОТКЛЮЧЕНО: Дублирование логики - цепочка строится в методе submit_for_approval()
# from django.db.models.signals import post_save, pre_save
# from django.dispatch import receiver
# from .models import MaterialRequest


# @receiver(pre_save, sender=MaterialRequest)
# def set_approval_chain_on_submit(sender, instance, **kwargs):
#     """
#     Автоматически строит цепочку согласования при переходе из DRAFT в другой статус.
#
#     Вызывается перед сохранением заявки.
#     """
#     # Если заявка только создаётся, пропускаем
#     if not instance.pk:
#         return
#
#     # Если заявка уже имеет цепочку, не перестраиваем
#     if instance.approval_chain:
#         return
#
#     # Если статус переходит из DRAFT в стадию согласования
#     if instance.status != MaterialRequest.Status.DRAFT:
#         # Строим цепочку согласования
#         instance.build_approval_chain()
