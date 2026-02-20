document.addEventListener("DOMContentLoaded", () => {
    bindAdvanceStageConfirm();
    bindCancelOrderConfirm();
    bindDeliveryMapButtons();
    initNotifications();
});

function parseCoordinate(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildDeliveryMapUrl(lat, lng) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
}

function bindDeliveryMapButtons() {
    document.querySelectorAll(".open-delivery-map-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const lat = parseCoordinate(button.dataset.deliveryLat);
            const lng = parseCoordinate(button.dataset.deliveryLng);

            if (lat === null || lng === null) {
                window.alert("Map location is unavailable for this order.");
                return;
            }

            const mapUrl = buildDeliveryMapUrl(lat, lng);
            window.open(mapUrl, "_blank", "noopener,noreferrer");
        });
    });
}

function bindAdvanceStageConfirm() {
    const advanceButton = document.querySelector(".advance-stage-btn");
    if (!advanceButton) {
        return;
    }

    advanceButton.addEventListener("click", (event) => {
        const actionLabel = advanceButton.dataset.actionLabel || "Update order stage";
        const isFinalPayment = advanceButton.dataset.finalPayment === "true";

        let confirmMessage = `Confirm action: ${actionLabel}?`;
        if (isFinalPayment) {
            confirmMessage = "Confirm full payment now? This order will be moved to your History.";
        }

        if (!window.confirm(confirmMessage)) {
            event.preventDefault();
        }
    });
}

function bindCancelOrderConfirm() {
    const cancelButton = document.querySelector(".cancel-order-btn");
    if (!cancelButton) {
        return;
    }

    cancelButton.addEventListener("click", (event) => {
        const ok = window.confirm("Cancel this order? This action cannot be undone.");
        if (!ok) {
            event.preventDefault();
        }
    });
}

function initNotifications() {
    const orderPage = document.getElementById("orderPage");
    if (!orderPage) {
        return;
    }

    const notificationsUrl = orderPage.dataset.notificationsUrl;
    const markReadUrl = orderPage.dataset.markNotificationsReadUrl;
    const notificationList = document.getElementById("notificationList");
    const unreadBadge = document.getElementById("notificationUnreadBadge");

    if (!notificationsUrl || !markReadUrl || !notificationList || !unreadBadge) {
        return;
    }

    const announcedNotificationIds = new Set();

    function getCSRFToken() {
        const cookie = document.cookie
            .split(";")
            .map((item) => item.trim())
            .find((item) => item.startsWith("csrftoken="));
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
    }

    async function requestJson(url, method = "GET", payload = null) {
        const options = {
            method,
            headers: {
                Accept: "application/json",
            },
            credentials: "same-origin",
        };

        if (method !== "GET") {
            options.headers["Content-Type"] = "application/json";
            options.headers["X-CSRFToken"] = getCSRFToken();
        }

        if (payload && method !== "GET") {
            options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json.success === false) {
            throw new Error(json.message || `Request failed (${response.status})`);
        }

        return json.data || {};
    }

    function ensureToastWrapper() {
        let wrapper = document.getElementById("notificationToastWrap");
        if (wrapper) {
            return wrapper;
        }

        wrapper = document.createElement("div");
        wrapper.id = "notificationToastWrap";
        wrapper.className = "notification-toast-wrap";
        document.body.appendChild(wrapper);
        return wrapper;
    }

    function ensurePopupHost() {
        let host = document.getElementById("notificationPopupHost");
        if (host) {
            return host;
        }

        host = document.createElement("div");
        host.id = "notificationPopupHost";
        host.className = "notification-popup-host";
        document.body.appendChild(host);
        return host;
    }

    const popupQueue = [];
    let popupIsShowing = false;

    function showPopupNotification(item) {
        popupQueue.push(item);
        flushPopupQueue();
    }

    function flushPopupQueue() {
        if (popupIsShowing || !popupQueue.length) {
            return;
        }

        popupIsShowing = true;
        const host = ensurePopupHost();
        const item = popupQueue.shift();

        const card = document.createElement("div");
        card.className = "notification-popup-card";

        const head = document.createElement("div");
        head.className = "notification-popup-head";

        const title = document.createElement("strong");
        title.className = "notification-popup-title";
        title.textContent = item.title || "Notification";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "notification-popup-close";
        closeButton.setAttribute("aria-label", "Close notification");
        closeButton.textContent = "Close";

        const message = document.createElement("p");
        message.className = "notification-popup-message";
        message.textContent = item.message || "";

        const time = document.createElement("small");
        time.className = "notification-popup-time";
        time.textContent = item.created_at || "";

        head.appendChild(title);
        head.appendChild(closeButton);
        card.appendChild(head);
        card.appendChild(message);
        card.appendChild(time);

        let closed = false;
        let autoCloseTimer = null;
        let removeTimer = null;

        const onEscape = (event) => {
            if (event.key === "Escape") {
                closePopup();
            }
        };

        const closePopup = () => {
            if (closed) {
                return;
            }
            closed = true;

            if (autoCloseTimer) {
                window.clearTimeout(autoCloseTimer);
            }
            if (removeTimer) {
                window.clearTimeout(removeTimer);
            }

            document.removeEventListener("keydown", onEscape);
            host.classList.remove("show");
            card.classList.remove("show");

            removeTimer = window.setTimeout(() => {
                card.remove();
                if (!host.children.length) {
                    host.classList.remove("show");
                }
                popupIsShowing = false;
                flushPopupQueue();
            }, 220);
        };

        closeButton.addEventListener("click", closePopup);
        host.onclick = (event) => {
            if (event.target === host) {
                closePopup();
            }
        };
        document.addEventListener("keydown", onEscape);

        host.classList.add("show");
        host.appendChild(card);
        window.requestAnimationFrame(() => {
            card.classList.add("show");
        });

        autoCloseTimer = window.setTimeout(closePopup, 5500);
    }

    function showToast(title, message) {
        const wrapper = ensureToastWrapper();
        const toast = document.createElement("div");
        toast.className = "notification-toast";

        const titleNode = document.createElement("strong");
        titleNode.textContent = title;
        const messageNode = document.createElement("span");
        messageNode.textContent = message;

        toast.appendChild(titleNode);
        toast.appendChild(messageNode);
        wrapper.appendChild(toast);

        window.setTimeout(() => {
            toast.classList.add("show");
        }, 10);

        window.setTimeout(() => {
            toast.classList.remove("show");
            window.setTimeout(() => {
                toast.remove();
            }, 250);
        }, 4500);
    }

    function renderNotifications(items) {
        notificationList.innerHTML = "";

        if (!items.length) {
            const empty = document.createElement("p");
            empty.className = "notification-empty";
            empty.textContent = "No notifications yet.";
            notificationList.appendChild(empty);
            return;
        }

        items.slice(0, 6).forEach((item) => {
            const row = document.createElement("div");
            row.className = `notification-item ${item.is_read ? "read" : "unread"}`;

            const head = document.createElement("div");
            head.className = "notification-item-head";

            const title = document.createElement("strong");
            title.textContent = item.title || "Notification";

            const createdAt = document.createElement("small");
            createdAt.textContent = item.created_at || "";

            const message = document.createElement("p");
            message.textContent = item.message || "";

            head.appendChild(title);
            head.appendChild(createdAt);
            row.appendChild(head);
            row.appendChild(message);
            notificationList.appendChild(row);
        });
    }

    function setUnreadBadge(count) {
        unreadBadge.textContent = `${count} unread`;
    }

    async function refreshNotifications() {
        try {
            const data = await requestJson(notificationsUrl);
            const notifications = Array.isArray(data.notifications) ? data.notifications : [];
            const unreadCount = Number(data.unread_count || 0);

            renderNotifications(notifications);
            setUnreadBadge(unreadCount);

            const newItems = notifications.filter(
                (item) => !item.is_read && !announcedNotificationIds.has(item.id)
            );

            if (!newItems.length) {
                return;
            }

            newItems.forEach((item) => {
                announcedNotificationIds.add(item.id);
                showToast(item.title || "Notification", item.message || "");
                showPopupNotification(item);
            });

            await requestJson(markReadUrl, "POST", {
                ids: newItems.map((item) => item.id),
            });

            setUnreadBadge(Math.max(0, unreadCount - newItems.length));
        } catch (error) {
            // Keep the page usable even if notification polling fails.
            console.error("Notification polling failed:", error);
        }
    }

    refreshNotifications();
    const pollTimer = window.setInterval(refreshNotifications, 8000);
    window.addEventListener("beforeunload", () => window.clearInterval(pollTimer));
}
