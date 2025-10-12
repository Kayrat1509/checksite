from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for post-save events on User model.
    """
    if created:
        # Additional logic when user is created
        # For example, create user profile, send notifications, etc.
        pass
