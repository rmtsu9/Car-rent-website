/**
 * User Profile Management
 * Handles profile updates, password changes, and data persistence
 */

// Check if user is logged in
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        window.location.href = 'Login.html';
    }
    loadUserProfile();
});

// Load user profile data
async function loadUserProfile() {
    const username = localStorage.getItem('username') || localStorage.getItem('userRole');
    const userRole = localStorage.getItem('userRole');

    // Set username field
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.value = username || (userRole === 'admin' ? 'admin' : 'user');
        usernameField.disabled = true;
    }

    // Try to load profile from API
    try {
        const response = await userAPI.getProfile();
        if (response.success && response.data) {
            const phoneField = document.getElementById('phoneNumber');
            if (phoneField && response.data.phoneNumber) {
                phoneField.value = response.data.phoneNumber;
            }
        } else {
            // Load from localStorage
            const savedPhone = localStorage.getItem('userPhoneNumber');
            if (savedPhone && document.getElementById('phoneNumber')) {
                document.getElementById('phoneNumber').value = savedPhone;
            }
        }
    } catch (error) {
        console.log('API not available, loading from localStorage');
        const savedPhone = localStorage.getItem('userPhoneNumber');
        if (savedPhone && document.getElementById('phoneNumber')) {
            document.getElementById('phoneNumber').value = savedPhone;
        }
    }
}

// Handle form submission
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const phoneNumber = document.getElementById('phoneNumber').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');

    // Reset messages
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    // Validate phone number
    if (!phoneNumber || phoneNumber.length !== 10 || isNaN(phoneNumber)) {
        showError('เบอร์โทรศัพท์ต้องเป็น 10 หลัก');
        return;
    }

    // Validate password change if user entered password fields
    if (newPassword || currentPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('กรุณากรอกรหัสผ่านให้ครบทั้งหมด');
            return;
        }

        if (newPassword.length < 4) {
            showError('รหัสผ่านใหม่ต้องมากกว่า 4 ตัวอักษร');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        // Update password via API
        try {
            const response = await userAPI.changePassword(currentPassword, newPassword);
            if (response.success) {
                localStorage.setItem('userPassword', newPassword);
                showSuccess('รหัสผ่านเปลี่ยนแปลงสำเร็จแล้ว!');
            } else {
                showError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
                return;
            }
        } catch (error) {
            console.log('API not available, using local password change');
            const savedPassword = localStorage.getItem('userPassword') || '1234';
            if (currentPassword !== savedPassword) {
                showError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
                return;
            }
            localStorage.setItem('userPassword', newPassword);
            showSuccess('รหัสผ่านเปลี่ยนแปลงสำเร็จแล้ว!');
        }
    }

    // Update profile via API
    try {
        const response = await userAPI.updateProfile(phoneNumber);
        if (response.success) {
            localStorage.setItem('userPhoneNumber', phoneNumber);
            if (!newPassword) {
                showSuccess('ข้อมูลของคุณบันทึกสำเร็จแล้ว!');
            }
        } else {
            // Fallback to local storage
            localStorage.setItem('userPhoneNumber', phoneNumber);
            if (!newPassword) {
                showSuccess('ข้อมูลของคุณบันทึกสำเร็จแล้ว!');
            }
        }
    } catch (error) {
        console.log('API not available, saving locally');
        localStorage.setItem('userPhoneNumber', phoneNumber);
        if (!newPassword) {
            showSuccess('ข้อมูลของคุณบันทึกสำเร็จแล้ว!');
        }
    }

    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    // Reset after 3 seconds
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
});

function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.textContent = '❌ ' + message;
    errorMsg.style.display = 'block';
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    successMsg.textContent = '✅ ' + message;
    successMsg.style.display = 'block';
}

function resetForm() {
    document.getElementById('profileForm').reset();
    loadUserProfile();
}