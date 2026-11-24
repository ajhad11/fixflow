import uuid
import secrets
from django.db import models
from django.utils import timezone
from apps.businesses.models import BaseModel, Business
from apps.customers.models import Customer
from apps.repairs.models import RepairTicket
from apps.accounts.models import CustomUser

class Quotation(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent to Customer'
        ACCEPTED = 'ACCEPTED', 'Customer Approved'
        REJECTED = 'REJECTED', 'Customer Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='quotations', db_index=True)
    quotation_number = models.CharField(max_length=50, unique=True, db_index=True)
    repair_ticket = models.OneToOneField(RepairTicket, on_delete=models.CASCADE, related_name='quotation')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='quotations')
    
    labor_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    parts_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    customer_notes = models.TextField(blank=True)
    expiry_date = models.DateField()

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            prefix = timezone.now().strftime('%Y%m')
            self.quotation_number = f"QUO-{prefix}-{secrets.token_hex(3).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_number} - {self.customer.name} ({self.total_amount})"

class QuotationItem(models.Model):
    class ItemType(models.TextChoices):
        LABOR = 'LABOR', 'Labor'
        PART = 'PART', 'Spare Part'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.PART)
    description = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.description} ({self.total_price})"

class Invoice(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ISSUED = 'ISSUED', 'Issued'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid'
        VOID = 'VOID', 'Void'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='invoices', db_index=True)
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    repair_ticket = models.OneToOneField(RepairTicket, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices', db_index=True)
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    due_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            prefix = timezone.now().strftime('%Y%m')
            self.invoice_number = f"INV-{prefix}-{secrets.token_hex(3).upper()}"
        self.balance_due = self.total_amount - self.paid_amount
        if self.balance_due <= 0 and self.paid_amount > 0:
            self.status = self.Status.PAID
        elif self.paid_amount > 0:
            self.status = self.Status.PARTIALLY_PAID
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name} (Due: {self.balance_due})"

class InvoiceItem(models.Model):
    class ItemType(models.TextChoices):
        LABOR = 'LABOR', 'Labor'
        PART = 'PART', 'Spare Part'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.PART)
    description = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.description} ({self.total_price})"

class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CARD = 'CARD', 'Credit / Debit Card'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        UPI = 'UPI', 'UPI'
        ONLINE = 'ONLINE', 'Online Payment'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='payments', db_index=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.CharField(max_length=25, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment of {self.amount} for {self.invoice.invoice_number} via {self.payment_method}"

class Expense(BaseModel):
    class ExpenseCategory(models.TextChoices):
        RENT = 'RENT', 'Shop Rent'
        UTILITIES = 'UTILITIES', 'Electricity & Internet'
        SALARIES = 'SALARIES', 'Staff Salaries'
        TOOLS = 'TOOLS', 'Tools & Machinery'
        MARKETING = 'MARKETING', 'Advertising'
        OTHER = 'OTHER', 'Other'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='expenses', db_index=True)
    category = models.CharField(max_length=30, choices=ExpenseCategory.choices, default=ExpenseCategory.OTHER)
    title = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True)
    logged_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.title}: {self.amount} ({self.category})"
