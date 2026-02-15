/**
 * API Integration Helper
 * Handles all HTTP requests to Python backend
 */

const API_CONFIG = {
    // Change this to your Python backend URL
    BASE_URL: 'http://localhost:5000/api',
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * Generic API Request Handler
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    try {
        const options = {
            method: method,
            headers: API_CONFIG.HEADERS,
            timeout: API_CONFIG.TIMEOUT
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return {
            success: true,
            data: result,
            status: response.status
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

/**
 * AUTH ENDPOINTS
 */
const authAPI = {
    // POST /auth/login
    login: async (username, password) => {
        return apiRequest('/auth/login', 'POST', { username, password });
    },

    // POST /auth/signup
    signup: async (fullName, phoneNumber, username, password) => {
        return apiRequest('/auth/signup', 'POST', { 
            fullName, 
            phoneNumber, 
            username, 
            password 
        });
    },

    // POST /auth/logout
    logout: async () => {
        return apiRequest('/auth/logout', 'POST', {});
    },

    // GET /auth/verify-token
    verifyToken: async (token) => {
        return apiRequest('/auth/verify-token', 'GET');
    }
};

/**
 * USER PROFILE ENDPOINTS
 */
const userAPI = {
    // GET /user/profile
    getProfile: async () => {
        return apiRequest('/user/profile', 'GET');
    },

    // PUT /user/profile
    updateProfile: async (phoneNumber) => {
        return apiRequest('/user/profile', 'PUT', { phoneNumber });
    },

    // PUT /user/password
    changePassword: async (currentPassword, newPassword) => {
        return apiRequest('/user/password', 'PUT', { 
            currentPassword, 
            newPassword 
        });
    }
};

/**
 * VEHICLE/BOOKING ENDPOINTS
 */
const vehicleAPI = {
    // GET /vehicles
    getAll: async () => {
        return apiRequest('/vehicles', 'GET');
    },

    // GET /vehicles/available?date=YYYY-MM-DD
    getAvailable: async (date) => {
        return apiRequest(`/vehicles/available?date=${date}`, 'GET');
    },

    // GET /vehicles/:id
    getById: async (id) => {
        return apiRequest(`/vehicles/${id}`, 'GET');
    }
};

/**
 * BOOKING ENDPOINTS
 */
const bookingAPI = {
    // POST /bookings
    create: async (bookingData) => {
        return apiRequest('/bookings', 'POST', bookingData);
    },

    // GET /bookings/:id
    getById: async (id) => {
        return apiRequest(`/bookings/${id}`, 'GET');
    },

    // GET /bookings
    getAll: async () => {
        return apiRequest('/bookings', 'GET');
    },

    // GET /bookings/user/:userId
    getUserBookings: async (userId) => {
        return apiRequest(`/bookings/user/${userId}`, 'GET');
    },

    // PUT /bookings/:id
    update: async (id, bookingData) => {
        return apiRequest(`/bookings/${id}`, 'PUT', bookingData);
    },

    // PUT /bookings/:id/step
    updateStep: async (id, step) => {
        return apiRequest(`/bookings/${id}/step`, 'PUT', { step });
    }
};

/**
 * ORDER ENDPOINTS
 */
const orderAPI = {
    // GET /orders/user/:userId
    getUserOrders: async (userId) => {
        return apiRequest(`/orders/user/${userId}`, 'GET');
    },

    // GET /orders/:id
    getById: async (id) => {
        return apiRequest(`/orders/${id}`, 'GET');
    },

    // POST /orders
    create: async (orderData) => {
        return apiRequest('/orders', 'POST', orderData);
    },

    // PUT /orders/:id/step
    updateStep: async (id, step) => {
        return apiRequest(`/orders/${id}/step`, 'PUT', { step });
    },

    // GET /orders/:id/timeline
    getTimeline: async (id) => {
        return apiRequest(`/orders/${id}/timeline`, 'GET');
    }
};

/**
 * HISTORY ENDPOINTS
 */
const historyAPI = {
    // GET /history/user/:userId
    getUserHistory: async (userId) => {
        return apiRequest(`/history/user/${userId}`, 'GET');
    },

    // GET /history/:id
    getById: async (id) => {
        return apiRequest(`/history/${id}`, 'GET');
    },

    // POST /history (when order is completed)
    addHistory: async (historyData) => {
        return apiRequest('/history', 'POST', historyData);
    }
};

/**
 * ADMIN ENDPOINTS
 */
const adminAPI = {
    // GET /admin/users
    getUsers: async () => {
        return apiRequest('/admin/users', 'GET');
    },

    // GET /admin/bookings
    getBookings: async () => {
        return apiRequest('/admin/bookings', 'GET');
    },

    // GET /admin/orders
    getOrders: async () => {
        return apiRequest('/admin/orders', 'GET');
    },

    // GET /admin/dashboard
    getDashboard: async () => {
        return apiRequest('/admin/dashboard', 'GET');
    },

    // POST /admin/users
    addUser: async (userData) => {
        return apiRequest('/admin/users', 'POST', userData);
    },

    // DELETE /admin/users/:id
    deleteUser: async (id) => {
        return apiRequest(`/admin/users/${id}`, 'DELETE');
    }
};

/**
 * UTILITY FUNCTIONS
 */
const apiUtils = {
    // Check if API is available
    checkHealth: async () => {
        return apiRequest('/health', 'GET');
    },

    // Get auth token from localStorage
    getToken: () => {
        return localStorage.getItem('authToken');
    },

    // Set auth token in localStorage
    setToken: (token) => {
        localStorage.setItem('authToken', token);
    },

    // Remove auth token
    removeToken: () => {
        localStorage.removeItem('authToken');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('authToken');
    },

    // Get user ID from localStorage
    getUserId: () => {
        return localStorage.getItem('userId');
    },

    // Set user ID in localStorage
    setUserId: (userId) => {
        localStorage.setItem('userId', userId);
    },

    // Handle API errors
    handleError: (error) => {
        console.error('API Error:', error);
        if (error.includes('401') || error.includes('Unauthorized')) {
            // Redirect to login
            window.location.href = 'Login.html';
        }
        return error;
    }
};

/**
 * Export all APIs for use in other files
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiRequest,
        authAPI,
        userAPI,
        vehicleAPI,
        bookingAPI,
        orderAPI,
        historyAPI,
        adminAPI,
        apiUtils
    };
}
