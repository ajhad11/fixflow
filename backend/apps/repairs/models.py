import uuid
import secrets
from django.db import models
from django.utils import timezone
from apps.businesses.models import BaseModel, Business, Branch
from apps.accounts.models import CustomUser
from apps.customers.models import Customer, Device

class RepairTicket(BaseModel):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class Status(models.TextChoices):
        RECEIVED = 'RECEIVED', 'Received'
        UNDER_DIAGNOSIS = 'UNDER_DIAGNOSIS', 'Under Diagnosis'
        WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL', 'Waiting for Approval'
        WAITING_FOR_PARTS = 'WAITING_FOR_PARTS', 'Waiting for Parts'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        QUALITY_CHECK = 'QUALITY_CHECK', 'Quality Check'
        READY_FOR_DELIVERY = 'READY_FOR_DELIVERY', 'Ready for Delivery'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'
        UNREPAIRABLE = 'UNREPAIRABLE', 'Unrepairable'

    ticket_number = models.CharField(max_length=40, unique=True, db_index=True)
    tracking_token = models.CharField(max_length=64, unique=True, db_index=True)
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='repairs', db_index=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='repairs')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='repairs', db_index=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='repairs', db_index=True)
    
    assigned_technician = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_repairs', db_index=True
    )
    created_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_repairs'
    )

    reported_problem = models.TextField()
    accessories_received = models.CharField(max_length=255, blank=True, help_text="e.g. Charger, Case, SIM Tray")
    physical_condition = models.TextField(blank=True)
    
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    final_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    expected_delivery_date = models.DateField(null=True, blank=True)
    
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    is_approved_by_customer = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.tracking_token:
            self.tracking_token = f"ff-{secrets.token_urlsafe(16)}"
        if not self.ticket_number:
            year_month = timezone.now().strftime('%Y%m')
            random_suffix = secrets.token_hex(2).upper()
            count = RepairTicket.objects.filter(business=self.business).count() + 1
            self.ticket_number = f"FIX-{year_month}-{count:04d}-{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number} - {self.device.brand} {self.device.model_name}"

class RepairStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(RepairTicket, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket.ticket_number}: {self.old_status} -> {self.new_status}"

class RepairDiagnosis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.OneToOneField(RepairTicket, on_delete=models.CASCADE, related_name='diagnosis')
    technician = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='diagnoses')
    technical_findings = models.TextField()
    recommended_action = models.TextField()
    estimated_labor_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Diagnosis for {self.ticket.ticket_number}"

class RepairNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(RepairTicket, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    note = models.TextField()
    is_internal = models.BooleanField(default=True, help_text="Internal notes are never exposed in customer QR tracking.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Note on {self.ticket.ticket_number} by {self.author}"

class RepairAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(RepairTicket, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='repair_docs/')
    description = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.ticket.ticket_number}"

class RepairPart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(RepairTicket, on_delete=models.CASCADE, related_name='parts_used')
    inventory_item = models.ForeignKey('inventory.InventoryItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='repair_usages')
    part_name = models.CharField(max_length=150)
    quantity = models.PositiveIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    added_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_cost(self):
        return self.unit_cost * self.quantity

    @property
    def total_price(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.part_name} x {self.quantity} ({self.ticket.ticket_number})"
