import uuid
from django.db import models
from apps.businesses.models import Business
from apps.repairs.models import RepairTicket

class AIPromptTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    device_category = models.CharField(max_length=80, blank=True)
    system_prompt = models.TextField()
    user_prompt_template = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class AIDiagnosisLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        TIMEOUT = 'TIMEOUT', 'Timeout'
        FALLBACK = 'FALLBACK', 'Fallback Used'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='ai_diagnoses', db_index=True)
    repair_ticket = models.ForeignKey(RepairTicket, on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_diagnoses')
    
    device_category = models.CharField(max_length=80)
    brand = models.CharField(max_length=100)
    model_name = models.CharField(max_length=120)
    reported_problem = models.TextField()
    technician_notes = models.TextField(blank=True)
    
    raw_prompt = models.TextField(blank=True)
    raw_response = models.TextField(blank=True)
    structured_output = models.JSONField(default=dict)
    
    model_used = models.CharField(max_length=80, default='llama3:latest')
    latency_ms = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS, db_index=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AI Diagnosis ({self.brand} {self.model_name}) - {self.status}"
