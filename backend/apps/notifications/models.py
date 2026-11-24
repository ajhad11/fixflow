import uuid
from django.db import models
from apps.businesses.models import Business
from apps.accounts.models import CustomUser

class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = 'INFO', 'Info'
        SUCCESS = 'SUCCESS', 'Success'
        WARNING = 'WARNING', 'Warning'
        DANGER = 'DANGER', 'Danger'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='notifications', db_index=True)
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.level}] {self.title}"
