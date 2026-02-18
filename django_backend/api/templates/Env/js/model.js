(() => {
    const app = document.getElementById("modelApp");
    if (!app) {
        return;
    }

    const urls = {
        cars: app.dataset.carsUrl,
        admin: app.dataset.adminUrl,
    };

    const state = {
        cars: [],
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

    function carDetailUrl(carId) {
        return `${urls.cars}${carId}/`;
    }

    function carImageUrl(carId) {
        return `${urls.cars}${carId}/images/`;
    }

    function carImageDetailUrl(carId, imageId) {
        return `${urls.cars}${carId}/images/${imageId}/`;
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("en-US")} THB/day`;
    }

    function resolveImageUrl(imageUrl) {
        const raw = String(imageUrl || "").trim();
        if (!raw) {
            return "";
        }
        if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("/")) {
            return raw;
        }
        if (raw.startsWith("static/")) {
            return `/${raw}`;
        }
        return `/api/${raw}`;
    }

    function resetCarForm() {
        document.getElementById("carId").value = "";
        document.getElementById("carName").value = "";
        document.getElementById("carPricePerDay").value = "";
        document.getElementById("carFuelType").value = "";
        document.getElementById("carFuelConsumption").value = "";
        document.getElementById("carType").value = "";
        document.getElementById("carSeatCapacity").value = "";
        document.getElementById("carEngineCC").value = "";
        document.getElementById("carHorsepower").value = "";
        document.getElementById("carIsActive").checked = true;
        document.getElementById("carImageUrl").value = "";
        document.getElementById("carImageCaption").value = "";
    }

    function fillCarForm(car) {
        document.getElementById("carId").value = car.id;
        document.getElementById("carName").value = car.name;
        document.getElementById("carPricePerDay").value = car.price_per_day;
        document.getElementById("carFuelType").value = car.fuel_type;
        document.getElementById("carFuelConsumption").value = car.fuel_consumption;
        document.getElementById("carType").value = car.car_type;
        document.getElementById("carSeatCapacity").value = car.seat_capacity;
        document.getElementById("carEngineCC").value = car.engine_cc;
        document.getElementById("carHorsepower").value = car.horsepower;
        document.getElementById("carIsActive").checked = Boolean(car.is_active);
        document.getElementById("carImageUrl").value = "";
        document.getElementById("carImageCaption").value = "";
    }

    function renderCars() {
        const container = document.getElementById("carsContainer");
        if (!state.cars.length) {
            container.innerHTML = `<div class="empty-state">ไม่พบข้อมูลรถ</div>`;
            return;
        }

        container.innerHTML = state.cars
            .map((car) => {
                const imagesHtml = car.images.length
                    ? car.images
                          .map((image) => {
                              const preview = resolveImageUrl(image.image_url);
                              return `
                                <div class="image-row">
                                    <img src="${preview}" alt="${image.caption || car.name}" loading="lazy">
                                    <div class="image-info">
                                        <strong>${image.caption || "-"}</strong>
                                        <small>${image.image_url}</small>
                                    </div>
                                    <div class="image-actions">
                                        <button type="button" class="btn-secondary" data-action="edit-image" data-car-id="${car.id}" data-image-id="${image.id}">Edit</button>
                                        <button type="button" class="btn-danger" data-action="delete-image" data-car-id="${car.id}" data-image-id="${image.id}">Delete</button>
                                    </div>
                                </div>
                            `;
                          })
                          .join("")
                    : `<div class="empty-state">ยังไม่มีรูปรถ</div>`;

                return `
                    <article class="car-card">
                        <div class="car-head">
                            <div>
                                <h3>${car.name}</h3>
                                <span class="status-badge ${car.is_active ? "active" : "inactive"}">${car.is_active ? "Active" : "Inactive"}</span>
                            </div>
                            <div class="car-actions">
                                <button type="button" class="btn-secondary" data-action="edit-car" data-car-id="${car.id}">Edit Car</button>
                                <button type="button" class="btn-danger" data-action="delete-car" data-car-id="${car.id}">Delete Car</button>
                            </div>
                        </div>

                        <div class="meta-grid">
                            <div class="meta-item"><span>Price</span><strong>${formatMoney(car.price_per_day)}</strong></div>
                            <div class="meta-item"><span>Fuel Type</span><strong>${car.fuel_type}</strong></div>
                            <div class="meta-item"><span>Consumption</span><strong>${car.fuel_consumption}</strong></div>
                            <div class="meta-item"><span>Type</span><strong>${car.car_type}</strong></div>
                            <div class="meta-item"><span>Seat</span><strong>${car.seat_capacity}</strong></div>
                            <div class="meta-item"><span>Engine CC</span><strong>${car.engine_cc}</strong></div>
                            <div class="meta-item"><span>Horsepower</span><strong>${car.horsepower} HP</strong></div>
                        </div>

                        <div class="images-block">
                            <h4>รูปภาพ (${car.images.length})</h4>
                            <div class="image-list">${imagesHtml}</div>
                            <form class="add-image-form" data-car-id="${car.id}">
                                <input type="text" name="image_url" placeholder="เพิ่มรูป: URL หรือ path" required>
                                <input type="text" name="caption" placeholder="คำอธิบายรูป">
                                <button type="submit" class="btn-primary">Add Image</button>
                            </form>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    async function loadCars(query = "") {
        const endpoint = query ? `${urls.cars}?q=${encodeURIComponent(query)}` : urls.cars;
        const data = await apiRequest(endpoint);
        state.cars = data;
        renderCars();
    }

    async function saveCar(event) {
        event.preventDefault();

        const carId = document.getElementById("carId").value;
        const payload = {
            name: document.getElementById("carName").value.trim(),
            price_per_day: document.getElementById("carPricePerDay").value.trim(),
            fuel_type: document.getElementById("carFuelType").value.trim(),
            fuel_consumption: document.getElementById("carFuelConsumption").value.trim(),
            car_type: document.getElementById("carType").value.trim(),
            seat_capacity: document.getElementById("carSeatCapacity").value.trim(),
            engine_cc: document.getElementById("carEngineCC").value.trim(),
            horsepower: document.getElementById("carHorsepower").value.trim(),
            is_active: document.getElementById("carIsActive").checked,
        };

        const initialImageUrl = document.getElementById("carImageUrl").value.trim();
        const initialImageCaption = document.getElementById("carImageCaption").value.trim();
        if (initialImageUrl) {
            payload.images = [{ image_url: initialImageUrl, caption: initialImageCaption }];
        }

        try {
            if (carId) {
                await apiRequest(carDetailUrl(carId), "PUT", payload);
            } else {
                await apiRequest(urls.cars, "POST", payload);
            }
            resetCarForm();
            await loadCars(document.getElementById("carSearchInput").value.trim());
        } catch (error) {
            alert(error.message);
        }
    }

    async function deleteCar(carId) {
        if (!window.confirm("ลบรถคันนี้ใช่หรือไม่?")) {
            return;
        }
        try {
            await apiRequest(carDetailUrl(carId), "DELETE");
            await loadCars(document.getElementById("carSearchInput").value.trim());
        } catch (error) {
            alert(error.message);
        }
    }

    async function addImage(formElement) {
        const carId = formElement.dataset.carId;
        const imageUrlField = formElement.querySelector("input[name='image_url']");
        const captionField = formElement.querySelector("input[name='caption']");

        const payload = {
            image_url: imageUrlField.value.trim(),
            caption: captionField.value.trim(),
        };

        if (!payload.image_url) {
            return;
        }

        try {
            await apiRequest(carImageUrl(carId), "POST", payload);
            imageUrlField.value = "";
            captionField.value = "";
            await loadCars(document.getElementById("carSearchInput").value.trim());
        } catch (error) {
            alert(error.message);
        }
    }

    async function editImage(carId, imageId) {
        const selectedCar = state.cars.find((car) => String(car.id) === String(carId));
        if (!selectedCar) {
            return;
        }
        const selectedImage = selectedCar.images.find((image) => String(image.id) === String(imageId));
        if (!selectedImage) {
            return;
        }

        const nextUrl = window.prompt("แก้ไข URL รูป", selectedImage.image_url);
        if (nextUrl === null) {
            return;
        }
        const nextCaption = window.prompt("แก้ไขคำอธิบายรูป", selectedImage.caption || "");
        if (nextCaption === null) {
            return;
        }

        try {
            await apiRequest(carImageDetailUrl(carId, imageId), "PUT", {
                image_url: nextUrl.trim(),
                caption: nextCaption.trim(),
            });
            await loadCars(document.getElementById("carSearchInput").value.trim());
        } catch (error) {
            alert(error.message);
        }
    }

    async function deleteImage(carId, imageId) {
        if (!window.confirm("ลบรูปนี้ใช่หรือไม่?")) {
            return;
        }

        try {
            await apiRequest(carImageDetailUrl(carId, imageId), "DELETE");
            await loadCars(document.getElementById("carSearchInput").value.trim());
        } catch (error) {
            alert(error.message);
        }
    }

    function bindEvents() {
        document.getElementById("backAdminBtn").addEventListener("click", () => {
            window.location.href = urls.admin;
        });

        document.getElementById("carForm").addEventListener("submit", saveCar);
        document.getElementById("resetCarFormBtn").addEventListener("click", resetCarForm);

        document.getElementById("searchCarsBtn").addEventListener("click", () => {
            loadCars(document.getElementById("carSearchInput").value.trim()).catch((error) => alert(error.message));
        });

        document.getElementById("carSearchInput").addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }
            event.preventDefault();
            loadCars(event.target.value.trim()).catch((error) => alert(error.message));
        });

        document.getElementById("carsContainer").addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            const carId = button.dataset.carId;
            const imageId = button.dataset.imageId;

            if (action === "edit-car") {
                const car = state.cars.find((item) => String(item.id) === String(carId));
                if (car) {
                    fillCarForm(car);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            } else if (action === "delete-car") {
                deleteCar(carId);
            } else if (action === "edit-image") {
                editImage(carId, imageId);
            } else if (action === "delete-image") {
                deleteImage(carId, imageId);
            }
        });

        document.getElementById("carsContainer").addEventListener("submit", (event) => {
            const form = event.target.closest("form.add-image-form");
            if (!form) {
                return;
            }
            event.preventDefault();
            addImage(form);
        });
    }

    async function init() {
        bindEvents();
        try {
            await loadCars();
        } catch (error) {
            alert(error.message);
        }
    }

    init();
})();
