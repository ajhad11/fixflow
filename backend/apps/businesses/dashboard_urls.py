from django.urls import path
from apps.businesses.views import DashboardMetricsView

urlpatterns = [
    path('', DashboardMetricsView.as_view(), name='dashboard_metrics_root'),
]
