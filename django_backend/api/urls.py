from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('signup/', views.signup, name='signup'),
    path('admin/', views.admin_page, name='admin'),
    path('booking/availability/', views.booking_availability, name='booking_availability'),
    path('booking/', views.booking, name='booking'),
    path('order/', views.order, name='order'),
    path('order/<int:booking_id>/advance/', views.advance_order_stage, name='advance_order_stage'),
    path('history/', views.history, name='history'),
    path('profile/', views.profile, name='profile'),
    path('profile/update-phone/', views.profile_update_phone, name='profile_update_phone'),
    path('profile/change-password/', views.profile_change_password, name='profile_change_password'),
    path('approve-booking/<int:booking_id>/', views.approve_booking, name='approve_booking'),
    path('reject-booking/<int:booking_id>/', views.reject_booking, name='reject_booking'),
    path('logout/', views.logout, name='logout')
]
