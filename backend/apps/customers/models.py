import uuid
from django.db import models
from apps.businesses.models import BaseModel, Business

class Customer(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='customers', db_index=True)
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=30, db_index=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('business', 'phone')

    def __str__(self):
        return f"{self.name} ({self.phone})"

class DeviceCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name='device_categories')
    name = models.CharField(max_length=80)
    icon = models.CharField(max_length=50, blank=True, default='Smartphone')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Device Categories'
        ordering = ['name']

    def __str__(self):
        return self.name

class Device(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='devices', db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='devices', db_index=True)
    category = models.ForeignKey(DeviceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    brand = models.CharField(max_length=100, db_index=True)
    model_name = models.CharField(max_length=120, db_index=True)
    serial_number = models.CharField(max_length=100, blank=True, db_index=True)
    imei = models.CharField(max_length=50, blank=True, db_index=True)
    passcode_pattern = models.CharField(max_length=100, blank=True)
    physical_condition = models.TextField(blank=True, help_text="e.g. Scratched screen, dented corner, missing screw")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.brand} {self.model_name} - {self.customer.name}"

class DeviceImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='device_photos/')
    caption = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.device.model_name} ({self.uploaded_at.strftime('%Y-%m-%d')})"
