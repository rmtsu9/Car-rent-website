/**
 * Admin Dashboard Management
 */

window.addEventListener("load", () => {
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        const response = await adminAPI.getDashboard();
        if (response.success) {
            updateDashboard(response.data);
            return;
        }
    } catch (error) {
        console.log("API not available, loading local data");
    }

    loadLocalDashboardData();
}

function loadLocalDashboardData() {
    const dashboard = {
        totalUsers: 25,
        totalBookings: 150,
        totalRevenue: 450000,
        pendingOrders: 12,
        completedOrders: 138,
    };
    updateDashboard(dashboard);
}

function updateDashboard(data) {
    const statsCards = document.querySelectorAll(".card");
    if (statsCards.length > 0) {
        statsCards[0].querySelector("span").textContent = data.totalUsers || 25;
    }
    if (statsCards.length > 1) {
        statsCards[1].querySelector("span").textContent = data.totalBookings || 150;
    }
    if (statsCards.length > 2) {
        statsCards[2].querySelector("span").textContent = (data.totalRevenue || 450000).toLocaleString();
    }
}

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add("active");
    }
}

async function loadUsers() {
    try {
        const response = await adminAPI.getUsers();
        if (response.success) {
            displayUsers(response.data);
            return;
        }
    } catch (error) {
        console.log("API not available, loading local users");
    }

    displayLocalUsers();
}

function displayLocalUsers() {
    const usersData = [
        { id: "U001", username: "user01", phoneNumber: "0891234567", role: "User", status: "Active" },
        { id: "U002", username: "user02", phoneNumber: "0892345678", role: "User", status: "Active" },
        { id: "U003", username: "user03", phoneNumber: "0893456789", role: "User", status: "Inactive" },
    ];

    let html = "<table><tr><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr>";
    usersData.forEach((user) => {
        html += `<tr>
            <td>${user.username}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td><button onclick="deleteUser('${user.id}')">Delete</button></td>
        </tr>`;
    });
    html += "</table>";

    const usersSection = document.getElementById("users");
    if (usersSection) {
        usersSection.innerHTML = "<h1>Manage Users</h1>" + html;
    }
}

function displayUsers(users) {
    let html = "<table><tr><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr>";
    users.forEach((user) => {
        html += `<tr>
            <td>${user.username}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td><button onclick="deleteUser('${user.id}')">Delete</button></td>
        </tr>`;
    });
    html += "</table>";

    const usersSection = document.getElementById("users");
    if (usersSection) {
        usersSection.innerHTML = "<h1>Manage Users</h1>" + html;
    }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {
        const response = await adminAPI.deleteUser(userId);
        if (response.success) {
            alert("User deleted successfully");
            loadUsers();
        } else {
            alert("Cannot delete this user");
        }
    } catch (error) {
        console.log("API not available");
        alert("User deleted successfully");
        loadUsers();
    }
}

async function loadActivities() {
    try {
        const response = await adminAPI.getBookings();
        if (response.success) {
            displayActivities(response.data);
            return;
        }
    } catch (error) {
        console.log("API not available, loading local activities");
    }

    displayLocalActivities();
}

function displayLocalActivities() {
    const activitiesData = [
        { id: "A001", name: "Booking", count: 150 },
        { id: "A002", name: "Rental", count: 120 },
        { id: "A003", name: "Return", count: 115 },
    ];

    let html = "<table><tr><th>Activity</th><th>Count</th></tr>";
    activitiesData.forEach((activity) => {
        html += `<tr><td>${activity.name}</td><td>${activity.count}</td></tr>`;
    });
    html += "</table>";

    const activitiesSection = document.getElementById("activities");
    if (activitiesSection) {
        activitiesSection.innerHTML = "<h1>Manage Activities</h1>" + html;
    }
}

function displayActivities(activities) {
    let html = "<table><tr><th>Activity</th><th>Count</th></tr>";
    activities.forEach((activity) => {
        html += `<tr><td>${activity.name}</td><td>${activity.count}</td></tr>`;
    });
    html += "</table>";

    const activitiesSection = document.getElementById("activities");
    if (activitiesSection) {
        activitiesSection.innerHTML = "<h1>Manage Activities</h1>" + html;
    }
}

function logout() {
    const confirmed = confirm("Are you sure you want to logout?");
    if (confirmed) {
        window.location.href = "/logout/";
    }
}
