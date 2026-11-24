import uuid
import secrets
from django.db import models
from django.utils import timezone
from apps.businesses.models import BaseModel, Business
from apps.repairs.models import RepairTicket
from apps.accounts.models import CustomUser

class Warranty(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        VOID = 'VOID', 'Voided'
        CLAIMED = 'CLAIMED', 'Claim In Progress'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='warranties', db_index=True)
    repair_ticket = models.OneToOneField(RepairTicket, on_delete=models.CASCADE, related_name='warranty')
    warranty_code = models.CharField(max_length=50, unique=True, db_index=True)
    duration_days = models.PositiveIntegerField(default=30)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    covered_components = models.TextField(help_text="e.g. Replaced battery, Screen digitizer, Charging IC")
    terms_conditions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    class Meta:
        verbose_name_plural = 'Warranties'
        ordering = ['-start_date']

    def save(self, *args, **kwargs):
        if not self.warranty_code:
            prefix = timezone.now().strftime('%Y%m')
            self.warranty_code = f"WAR-{prefix}-{secrets.token_hex(3).upper()}"
        if not self.end_date:
            self.end_date = self.start_date + timezone.timedelta(days=self.duration_days)
        if self.end_date < timezone.now().date() and self.status == self.Status.ACTIVE:
            self.status = self.Status.EXPIRED
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.warranty_code} ({self.repair_ticket.device.model_name})"

class WarrantyClaim(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Inspection'
        APPROVED = 'APPROVED', 'Approved for Free Repair'
        REJECTED = 'REJECTED', 'Claim Rejected'
        RESOLVED = 'RESOLVED', 'Resolved & Returned'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='warranty_claims')
    warranty = models.ForeignKey(Warranty, on_delete=models.CASCADE, related_name='claims')
    claim_number = models.CharField(max_length=50, unique=True, db_index=True)
    claim_date = models.DateField(default=timezone.now)
    issue_reported = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    resolution_notes = models.TextField(blank=True)
    handled_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-claim_date']

    def save(self, *args, **kwargs):
        if not self.claim_number:
            self.claim_number = f"CLM-{timezone.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_number} for {self.warranty.warranty_code}"
