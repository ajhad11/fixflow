from rest_framework import serializers
from apps.businesses.models import Business, Branch, ShopSettings, Subscription

class ShopSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopSettings
        fields = ['id', 'currency_symbol', 'tax_rate', 'invoice_footer_notes', 'warranty_terms', 'logo']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'phone', 'address', 'is_main', 'created_at']

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['id', 'plan_name', 'status', 'start_date', 'end_date', 'max_technicians', 'max_branches']

class BusinessSerializer(serializers.ModelSerializer):
    settings = ShopSettingsSerializer(read_only=True)
    subscription = SubscriptionSerializer(read_only=True)
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Business
        fields = ['id', 'name', 'slug', 'email', 'phone', 'address', 'is_active', 'settings', 'subscription', 'branches', 'created_at']
