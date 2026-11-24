import uuid
from django.db import models
from django.core.exceptions import ValidationError
from apps.businesses.models import BaseModel, Business
from apps.accounts.models import CustomUser

class InventoryCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='inventory_categories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Inventory Categories'
        unique_together = ('business', 'name')

    def __str__(self):
        return self.name

class Supplier(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='suppliers')
    name = models.CharField(max_length=150, db_index=True)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class InventoryItem(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='inventory_items', db_index=True)
    category = models.ForeignKey(InventoryCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    sku = models.CharField(max_length=60, db_index=True)
    name = models.CharField(max_length=150, db_index=True)
    description = models.TextField(blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    quantity_in_stock = models.IntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    compatible_devices = models.TextField(blank=True, help_text="e.g. iPhone 13, iPhone 14 Pro, Samsung S23")

    class Meta:
        ordering = ['name']
        unique_together = ('business', 'sku')

    @property
    def is_low_stock(self):
        return self.quantity_in_stock <= self.low_stock_threshold

    def __str__(self):
        return f"{self.name} [{self.sku}] (Stock: {self.quantity_in_stock})"

class PurchaseOrder(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ORDERED = 'ORDERED', 'Ordered'
        RECEIVED = 'RECEIVED', 'Received'
        CANCELLED = 'CANCELLED', 'Cancelled'

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='purchase_orders')
    po_number = models.CharField(max_length=50, unique=True, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    order_date = models.DateField()
    received_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name}"

class PurchaseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='po_items')
    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def total_cost(self):
        return self.unit_cost * self.quantity_ordered

    def __str__(self):
        return f"{self.inventory_item.name} x {self.quantity_ordered}"

class InventoryTransaction(models.Model):
    class TransactionType(models.TextChoices):
        STOCK_IN = 'STOCK_IN', 'Stock In'
        STOCK_OUT = 'STOCK_OUT', 'Stock Out'
        REPAIR_USAGE = 'REPAIR_USAGE', 'Repair Usage'
        ADJUSTMENT = 'ADJUSTMENT', 'Stock Adjustment'
        RETURN = 'RETURN', 'Return'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='inventory_transactions', db_index=True)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions', db_index=True)
    transaction_type = models.CharField(max_length=25, choices=TransactionType.choices, db_index=True)
    quantity = models.IntegerField(help_text="Positive for additions, negative for deductions.")
    balance_after = models.IntegerField()
    reference_ticket = models.ForeignKey('repairs.RepairTicket', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    reference_po = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type}: {self.item.name} ({self.quantity}) on {self.created_at.strftime('%Y-%m-%d')}"
