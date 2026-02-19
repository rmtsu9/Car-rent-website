(() => {
    const app = document.getElementById("adminApp");
    if (!app) {
        return;
    }

    const urls = {
        dashboard: app.dataset.dashboardUrl,
        users: app.dataset.usersUrl,
        admins: app.dataset.adminsUrl,
        orders: app.dataset.ordersUrl,
        orderApproveTemplate: app.dataset.orderApproveUrlTemplate,
        history: app.dataset.historyUrl,
        model: app.dataset.modelUrl,
    };

    const state = {
        users: [],
        admins: [],
        orders: [],
        history: [],
    };

    function getCSRFToken() {
        const cookie = document.cookie
            .split(";")
            .map((item) => item.trim())
            .find((item) => item.startsWith("csrftoken="));
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
    }

    async function apiRequest(url, method = "GET", body = null) {
        const options = {
            method,
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        };

        if (method !== "GET") {
            options.headers["X-CSRFToken"] = getCSRFToken();
            options.headers["Content-Type"] = "application/json";
        }

        if (body && method !== "GET") {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `Request failed (${response.status})`);
        }
        return payload.data ?? payload;
    }

    function formatMoney(value) {
        const parsed = Number(value || 0);
        return `${parsed.toLocaleString("en-US")} THB`;
    }

    function orderApproveUrl(bookingId) {
        return urls.orderApproveTemplate.replace("/0/", `/${bookingId}/`);
    }

    function parseCoordinate(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function hasDeliveryCoordinates(order) {
        return (
            order.pickup_type === "delivery"
            && parseCoordinate(order.delivery_lat) !== null
            && parseCoordinate(order.delivery_lng) !== null
        );
    }

    function buildDeliveryMapUrl(lat, lng) {
        return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
    }

    function openDeliveryMap(lat, lng) {
        const parsedLat = parseCoordinate(lat);
        const parsedLng = parseCoordinate(lng);
        if (parsedLat === null || parsedLng === null) {
            alert("This order does not have a valid delivery pin.");
            return;
        }

        const mapUrl = buildDeliveryMapUrl(parsedLat, parsedLng);
        window.open(mapUrl, "_blank", "noopener,noreferrer");
    }

    function sectionButton(sectionId) {
        return document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    }

    function showSection(sectionId) {
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.remove("active");
        });
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("active");
        });

        const targetSection = document.getElementById(sectionId);
        const targetButton = sectionButton(sectionId);
        if (targetSection) {
            targetSection.classList.add("active");
        }
        if (targetButton) {
            targetButton.classList.add("active");
        }
    }

    function setDashboard(data) {
        document.getElementById("statTotalUsers").textContent = data.total_users ?? 0;
        document.getElementById("statTotalAdmins").textContent = data.total_admins ?? 0;
        document.getElementById("statTotalCars").textContent = data.total_cars ?? 0;
        document.getElementById("statActiveCars").textContent = data.active_cars ?? 0;
        document.getElementById("statIncomingOrders").textContent = data.incoming_orders ?? 0;
        document.getElementById("statPendingOrders").textContent = data.pending_orders ?? 0;
        document.getElementById("statCompletedOrders").textContent = data.completed_orders ?? 0;
        document.getElementById("statRevenue").textContent = formatMoney(data.completed_revenue ?? 0);
    }

    function renderUsers() {
        const tbody = document.getElementById("usersTableBody");
        if (!state.users.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No users found</td></tr>`;
            return;
        }

        tbody.innerHTML = state.users
            .map(
                (user) => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.fullName}</td>
                    <td>${user.username}</td>
                    <td>${user.phoneNumber}</td>
                    <td>
                        <div class="inline-actions">
                            <button type="button" class="inline-btn" data-action="edit-user" data-id="${user.id}">Edit</button>
                            <button type="button" class="inline-btn danger" data-action="delete-user" data-id="${user.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `
            )
            .join("");
    }

    function renderAdmins() {
        const tbody = document.getElementById("adminsTableBody");
        if (!state.admins.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No admins found</td></tr>`;
            return;
        }

        tbody.innerHTML = state.admins
            .map(
                (admin) => `
                <tr>
                    <td>${admin.id}</td>
                    <td>${admin.fullName}</td>
                    <td>${admin.username}</td>
                    <td>${admin.phoneNumber}</td>
                    <td>
                        <div class="inline-actions">
                            <button type="button" class="inline-btn" data-action="edit-admin" data-id="${admin.id}">Edit</button>
                            <button type="button" class="inline-btn danger" data-action="delete-admin" data-id="${admin.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `
            )
            .join("");
    }

    function renderOrders() {
        const tbody = document.getElementById("ordersTableBody");
        if (!state.orders.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No incoming orders found</td></tr>`;
            return;
        }

        tbody.innerHTML = state.orders
            .map((order) => {
                const actionButtons = [];
                if (order.order_stage === "awaiting_contact") {
                    actionButtons.push(
                        `<button type="button" class="inline-btn" data-action="approve-order-stage" data-id="${order.id}">Approve Callback</button>`
                    );
                } else if (order.order_stage === "awaiting_handover") {
                    actionButtons.push(
                        `<button type="button" class="inline-btn" data-action="approve-order-stage" data-id="${order.id}">Approve Handover</button>`
                    );
                }

                if (hasDeliveryCoordinates(order)) {
                    actionButtons.push(
                        `<button type="button" class="inline-btn map-btn" data-action="open-delivery-map" data-id="${order.id}">เปิดแผนที่จุดส่ง</button>`
                    );
                }

                const actionHtml = actionButtons.length
                    ? `<div class="inline-actions">${actionButtons.join("")}</div>`
                    : "-";

                return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.customer.fullName} (${order.customer.username})</td>
                    <td>${order.car.name}</td>
                    <td>${order.start_date} - ${order.end_date}</td>
                    <td>${order.status}</td>
                    <td>${order.order_stage_display}</td>
                    <td>${formatMoney(order.total_price)}</td>
                    <td>${order.created_at || "-"}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
            })
            .join("");
    }

    function renderHistory() {
        const tbody = document.getElementById("historyTableBody");
        if (!state.history.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No completed history found</td></tr>`;
            return;
        }

        tbody.innerHTML = state.history
            .map(
                (item) => `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.customer.fullName} (${item.customer.username})</td>
                    <td>${item.car.name}</td>
                    <td>${item.start_date} - ${item.end_date}</td>
                    <td>${item.status}</td>
                    <td>${item.order_stage_display}</td>
                    <td>${formatMoney(item.total_price)}</td>
                    <td>${item.completed_at || "-"}</td>
                </tr>
            `
            )
            .join("");
    }

    async function loadDashboard() {
        try {
            const data = await apiRequest(urls.dashboard);
            setDashboard(data);
        } catch (error) {
            alert(error.message);
        }
    }

    async function loadUsers(query = "") {
        const endpoint = query ? `${urls.users}?q=${encodeURIComponent(query)}` : urls.users;
        const data = await apiRequest(endpoint);
        state.users = data;
        renderUsers();
    }

    async function loadAdmins(query = "") {
        const endpoint = query ? `${urls.admins}?q=${encodeURIComponent(query)}` : urls.admins;
        const data = await apiRequest(endpoint);
        state.admins = data;
        renderAdmins();
    }

    async function loadOrders(query = "") {
        const endpoint = query ? `${urls.orders}?q=${encodeURIComponent(query)}` : urls.orders;
        const data = await apiRequest(endpoint);
        state.orders = data;
        renderOrders();
    }

    async function loadHistory(query = "") {
        const endpoint = query ? `${urls.history}?q=${encodeURIComponent(query)}` : urls.history;
        const data = await apiRequest(endpoint);
        state.history = data;
        renderHistory();
    }

    function resetUserForm() {
        document.getElementById("userId").value = "";
        document.getElementById("userFullName").value = "";
        document.getElementById("userPhoneNumber").value = "";
        document.getElementById("userUsername").value = "";
        document.getElementById("userPassword").value = "";
    }

    function resetAdminForm() {
        document.getElementById("adminId").value = "";
        document.getElementById("adminFullName").value = "";
        document.getElementById("adminPhoneNumber").value = "";
        document.getElementById("adminUsername").value = "";
        document.getElementById("adminPassword").value = "";
    }

    async function saveUser(event) {
        event.preventDefault();

        const userId = document.getElementById("userId").value;
        const payload = {
            fullName: document.getElementById("userFullName").value.trim(),
            phoneNumber: document.getElementById("userPhoneNumber").value.trim(),
            username: document.getElementById("userUsername").value.trim(),
            password: document.getElementById("userPassword").value.trim(),
        };

        try {
            if (userId) {
                if (!payload.password) {
                    delete payload.password;
                }
                await apiRequest(`${urls.users}${userId}/`, "PUT", payload);
            } else {
                if (!payload.password) {
                    alert("Password is required when creating a new user");
                    return;
                }
                await apiRequest(urls.users, "POST", payload);
            }

            resetUserForm();
            await loadUsers(document.getElementById("userSearchInput").value.trim());
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    }

    async function saveAdmin(event) {
        event.preventDefault();

        const adminId = document.getElementById("adminId").value;
        const payload = {
            fullName: document.getElementById("adminFullName").value.trim(),
            phoneNumber: document.getElementById("adminPhoneNumber").value.trim(),
            username: document.getElementById("adminUsername").value.trim(),
            password: document.getElementById("adminPassword").value.trim(),
        };

        try {
            if (adminId) {
                if (!payload.password) {
                    delete payload.password;
                }
                await apiRequest(`${urls.admins}${adminId}/`, "PUT", payload);
            } else {
                if (!payload.password) {
                    alert("Password is required when creating a new admin");
                    return;
                }
                await apiRequest(urls.admins, "POST", payload);
            }

            resetAdminForm();
            await loadAdmins(document.getElementById("adminSearchInput").value.trim());
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleUserAction(action, id) {
        const selected = state.users.find((user) => String(user.id) === String(id));
        if (!selected) {
            return;
        }

        if (action === "edit-user") {
            document.getElementById("userId").value = selected.id;
            document.getElementById("userFullName").value = selected.fullName;
            document.getElementById("userPhoneNumber").value = selected.phoneNumber;
            document.getElementById("userUsername").value = selected.username;
            document.getElementById("userPassword").value = "";
            return;
        }

        if (action === "delete-user") {
            if (!window.confirm(`Delete user "${selected.username}"?`)) {
                return;
            }
            try {
                await apiRequest(`${urls.users}${selected.id}/`, "DELETE");
                await loadUsers(document.getElementById("userSearchInput").value.trim());
                await loadDashboard();
            } catch (error) {
                alert(error.message);
            }
        }
    }

    async function handleAdminAction(action, id) {
        const selected = state.admins.find((admin) => String(admin.id) === String(id));
        if (!selected) {
            return;
        }

        if (action === "edit-admin") {
            document.getElementById("adminId").value = selected.id;
            document.getElementById("adminFullName").value = selected.fullName;
            document.getElementById("adminPhoneNumber").value = selected.phoneNumber;
            document.getElementById("adminUsername").value = selected.username;
            document.getElementById("adminPassword").value = "";
            return;
        }

        if (action === "delete-admin") {
            if (!window.confirm(`Delete admin "${selected.username}"?`)) {
                return;
            }
            try {
                await apiRequest(`${urls.admins}${selected.id}/`, "DELETE");
                await loadAdmins(document.getElementById("adminSearchInput").value.trim());
                await loadDashboard();
            } catch (error) {
                alert(error.message);
            }
        }
    }

    async function handleOrderAction(action, id) {
        const selected = state.orders.find((order) => String(order.id) === String(id));
        if (!selected) {
            return;
        }

        if (action === "open-delivery-map") {
            openDeliveryMap(selected.delivery_lat, selected.delivery_lng);
            return;
        }

        if (action !== "approve-order-stage") {
            return;
        }

        let confirmMessage = "Approve this order stage?";
        if (selected.order_stage === "awaiting_contact") {
            confirmMessage = `Approve callback for Order #${selected.id}?`;
        } else if (selected.order_stage === "awaiting_handover") {
            confirmMessage = `Approve pickup/delivery for Order #${selected.id}?`;
        }

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await apiRequest(orderApproveUrl(selected.id), "POST", {});
            await loadOrders(document.getElementById("orderSearchInput").value.trim());
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    }

    function bindEvents() {
        document.querySelectorAll(".nav-btn").forEach((button) => {
            button.addEventListener("click", () => {
                showSection(button.dataset.target);
            });
        });

        document.getElementById("goModelBtn").addEventListener("click", () => {
            window.location.href = urls.model;
        });

        document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboard);

        document.getElementById("userForm").addEventListener("submit", saveUser);
        document.getElementById("adminForm").addEventListener("submit", saveAdmin);
        document.getElementById("resetUserFormBtn").addEventListener("click", resetUserForm);
        document.getElementById("resetAdminFormBtn").addEventListener("click", resetAdminForm);

        document.getElementById("searchUsersBtn").addEventListener("click", () => {
            loadUsers(document.getElementById("userSearchInput").value.trim()).catch((error) => alert(error.message));
        });
        document.getElementById("searchAdminsBtn").addEventListener("click", () => {
            loadAdmins(document.getElementById("adminSearchInput").value.trim()).catch((error) => alert(error.message));
        });
        document.getElementById("searchOrdersBtn").addEventListener("click", () => {
            loadOrders(document.getElementById("orderSearchInput").value.trim()).catch((error) => alert(error.message));
        });
        document.getElementById("searchHistoryBtn").addEventListener("click", () => {
            loadHistory(document.getElementById("historySearchInput").value.trim()).catch((error) => alert(error.message));
        });

        document.getElementById("usersTableBody").addEventListener("click", (event) => {
            const target = event.target.closest("button[data-action]");
            if (!target) {
                return;
            }
            handleUserAction(target.dataset.action, target.dataset.id);
        });

        document.getElementById("adminsTableBody").addEventListener("click", (event) => {
            const target = event.target.closest("button[data-action]");
            if (!target) {
                return;
            }
            handleAdminAction(target.dataset.action, target.dataset.id);
        });

        document.getElementById("ordersTableBody").addEventListener("click", (event) => {
            const target = event.target.closest("button[data-action]");
            if (!target) {
                return;
            }
            handleOrderAction(target.dataset.action, target.dataset.id);
        });

        ["userSearchInput", "adminSearchInput", "orderSearchInput", "historySearchInput"].forEach((id) => {
            const input = document.getElementById(id);
            input.addEventListener("keydown", (event) => {
                if (event.key !== "Enter") {
                    return;
                }
                event.preventDefault();
                if (id === "userSearchInput") {
                    loadUsers(input.value.trim()).catch((error) => alert(error.message));
                } else if (id === "adminSearchInput") {
                    loadAdmins(input.value.trim()).catch((error) => alert(error.message));
                } else if (id === "orderSearchInput") {
                    loadOrders(input.value.trim()).catch((error) => alert(error.message));
                } else {
                    loadHistory(input.value.trim()).catch((error) => alert(error.message));
                }
            });
        });
    }

    async function init() {
        bindEvents();
        try {
            await Promise.all([
                loadDashboard(),
                loadUsers(),
                loadAdmins(),
                loadOrders(),
                loadHistory(),
            ]);
        } catch (error) {
            alert(error.message);
        }
    }

    init();
})();
