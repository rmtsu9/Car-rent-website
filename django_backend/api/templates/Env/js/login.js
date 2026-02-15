document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        // Try API login first (from Python backend)
        const response = await authAPI.login(username, password);

        if (response.success) {
            // Store auth data from API
            if (response.data.token) {
                apiUtils.setToken(response.data.token);
            }
            if (response.data.userId) {
                apiUtils.setUserId(response.data.userId);
            }

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userRole", response.data.role || "user");
            localStorage.setItem("username", username);
            sessionStorage.setItem("role", response.data.role || "user");

            // Redirect based on role from API
            if (response.data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "Booking.html";
            }
        } else {
            // Fallback to local authentication if API fails
            console.warn("API not available, using local authentication");
            handleLocalLogin(username, password);
        }
    } catch (error) {
        console.error("Login error:", error);
        handleLocalLogin(username, password);
    }
});

// Fallback local authentication (when API is not available)
function handleLocalLogin(username, password) {
    // Login Admin
    if (username === "admin" && password === "1234") {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", "admin");
        sessionStorage.setItem("role", "admin");
        localStorage.setItem("username", username);
        window.location.href = "admin.html";
    }
    // Login User
    else if (username === "user" && password === "1234") {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", "user");
        sessionStorage.setItem("role", "user");
        localStorage.setItem("username", username);
        window.location.href = "Booking.html";
    }
    else {
        alert("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
    }
}

function goSignup() {
    window.location.href = "signup.html";
}
