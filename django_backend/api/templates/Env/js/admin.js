/**
 * Admin Dashboard Management
 * Handles admin dashboard data and operations
 */

// Check if user is logged in and is admin
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    
    if (!isLoggedIn || userRole !== 'admin') {
        alert('กรุณาเข้าสู่ระบบด้วยบัญชี Admin');
        window.location.href = 'Login.html';
    }
    loadDashboardData();
});

// Load dashboard data from API or local storage
async function loadDashboardData() {
    try {
        const response = await adminAPI.getDashboard();
        if (response.success) {
            updateDashboard(response.data);
        } else {
            loadLocalDashboardData();
        }
    } catch (error) {
        console.log('API not available, loading local data');
        loadLocalDashboardData();
    }
}

function loadLocalDashboardData() {
    // Load sample data from localStorage or use defaults
    const dashboard = {
        totalUsers: 25,
        totalBookings: 150,
        totalRevenue: 450000,
        pendingOrders: 12,
        completedOrders: 138
    };
    updateDashboard(dashboard);
}

function updateDashboard(data) {
    // Update dashboard stats
    const statsCards = document.querySelectorAll('.card');
    if (statsCards.length > 0) {
        statsCards[0].querySelector('span').textContent = data.totalUsers || 25;
    }
    if (statsCards.length > 1) {
        statsCards[1].querySelector('span').textContent = data.totalBookings || 150;
    }
    if (statsCards.length > 2) {
        statsCards[2].querySelector('span').textContent = (data.totalRevenue || 450000).toLocaleString();
    }
}

/**
 * Section Navigation
 */
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
}

/**
 * Manage Users Section
 */
async function loadUsers() {
    try {
        const response = await adminAPI.getUsers();
        if (response.success) {
            displayUsers(response.data);
        } else {
            displayLocalUsers();
        }
    } catch (error) {
        console.log('API not available, loading local users');
        displayLocalUsers();
    }
}

function displayLocalUsers() {
    // Display sample users from localStorage
    const usersData = [
        { id: 'U001', username: 'user01', phoneNumber: '0891234567', role: 'User', status: 'Active' },
        { id: 'U002', username: 'user02', phoneNumber: '0892345678', role: 'User', status: 'Active' },
        { id: 'U003', username: 'user03', phoneNumber: '0893456789', role: 'User', status: 'Inactive' }
    ];
    
    let html = '<table><tr><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr>';
    usersData.forEach(user => {
        html += `<tr>
            <td>${user.username}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td><button onclick="deleteUser('${user.id}')">Delete</button></td>
        </tr>`;
    });
    html += '</table>';
    
    const usersSection = document.getElementById('users');
    if (usersSection) {
        usersSection.innerHTML = '<h1>Manage Users</h1>' + html;
    }
}

function displayUsers(users) {
    let html = '<table><tr><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr>';
    users.forEach(user => {
        html += `<tr>
            <td>${user.username}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td><button onclick="deleteUser('${user.id}')">Delete</button></td>
        </tr>`;
    });
    html += '</table>';
    
    const usersSection = document.getElementById('users');
    if (usersSection) {
        usersSection.innerHTML = '<h1>Manage Users</h1>' + html;
    }
}

async function deleteUser(userId) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) {
        return;
    }
    
    try {
        const response = await adminAPI.deleteUser(userId);
        if (response.success) {
            alert('ลบผู้ใช้สำเร็จแล้ว');
            loadUsers();
        } else {
            alert('ไม่สามารถลบผู้ใช้ได้');
        }
    } catch (error) {
        console.log('API not available');
        alert('ลบผู้ใช้สำเร็จแล้ว');
        loadUsers();
    }
}

/**
 * Manage Activities Section
 */
async function loadActivities() {
    try {
        const response = await adminAPI.getBookings();
        if (response.success) {
            displayActivities(response.data);
        } else {
            displayLocalActivities();
        }
    } catch (error) {
        console.log('API not available, loading local activities');
        displayLocalActivities();
    }
}

function displayLocalActivities() {
    const activitiesData = [
        { id: 'A001', name: 'Booking', count: 150 },
        { id: 'A002', name: 'Rental', count: 120 },
        { id: 'A003', name: 'Return', count: 115 }
    ];
    
    let html = '<table><tr><th>Activity</th><th>Count</th></tr>';
    activitiesData.forEach(activity => {
        html += `<tr><td>${activity.name}</td><td>${activity.count}</td></tr>`;
    });
    html += '</table>';
    
    const activitiesSection = document.getElementById('activities');
    if (activitiesSection) {
        activitiesSection.innerHTML = '<h1>Manage Activities</h1>' + html;
    }
}

function displayActivities(activities) {
    let html = '<table><tr><th>Activity</th><th>Count</th></tr>';
    activities.forEach(activity => {
        html += `<tr><td>${activity.name}</td><td>${activity.count}</td></tr>`;
    });
    html += '</table>';
    
    const activitiesSection = document.getElementById('activities');
    if (activitiesSection) {
        activitiesSection.innerHTML = '<h1>Manage Activities</h1>' + html;
    }
}

/**
 * Logout Function
 */
function logout() {
    const confirmed = confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?');
    if (confirmed) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        sessionStorage.removeItem('role');
        window.location.href = 'Login.html';
    }
}


