from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('signup/', views.signup, name='signup'),
    path('admin/', views.admin_page, name='admin'),
    path('model/', views.model_page, name='model'),
    path('admin/api/dashboard/', views.admin_dashboard_api, name='admin_dashboard_api'),
    path('admin/api/users/', views.admin_users_api, name='admin_users_api'),
    path('admin/api/users/<int:user_id>/', views.admin_user_detail_api, name='admin_user_detail_api'),
    path('admin/api/admins/', views.admin_admins_api, name='admin_admins_api'),
    path('admin/api/admins/<int:user_id>/', views.admin_admin_detail_api, name='admin_admin_detail_api'),
    path('admin/api/cars/', views.admin_cars_api, name='admin_cars_api'),
    path('admin/api/cars/<int:car_id>/', views.admin_car_detail_api, name='admin_car_detail_api'),
    path('admin/api/cars/<int:car_id>/images/', views.admin_car_images_api, name='admin_car_images_api'),
    path('admin/api/cars/<int:car_id>/images/<int:image_id>/', views.admin_car_image_detail_api, name='admin_car_image_detail_api'),
    path('admin/api/orders/', views.admin_orders_api, name='admin_orders_api'),
    path('admin/api/history/', views.admin_history_api, name='admin_history_api'),
    path('cars/public/', views.public_cars_api, name='public_cars_api'),
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
