(() => {
    const app = document.getElementById("modelApp");
    if (!app) {
        return;
    }

    const isAdmin = app.dataset.isAdmin === "true";
    const urls = {
        adminCars: app.dataset.adminCarsUrl,
        publicCars: app.dataset.publicCarsUrl,
        admin: app.dataset.adminUrl,
    };

    const state = {
        cars: [],
        visibleCars: [],
        searchQuery: "",
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

    async function uploadFileRequest(url, formData) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            credentials: "same-origin",
            body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `Upload failed (${response.status})`);
        }
        return payload.data ?? payload;
    }

    function carsCollectionUrl(query = "") {
        const base = isAdmin ? urls.adminCars : urls.publicCars;
        return query ? `${base}?q=${encodeURIComponent(query)}` : base;
    }

    function carDetailUrl(carId) {
        return `${urls.adminCars}${carId}/`;
    }

    function carImageUrl(carId) {
        return `${urls.adminCars}${carId}/images/`;
    }

    function carImageDetailUrl(carId, imageId) {
        return `${urls.adminCars}${carId}/images/${imageId}/`;
    }

    function carImageUploadUrl(carId) {
        return `${urls.adminCars}${carId}/images/upload/`;
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
        if (raw.startsWith("Image/") || raw.startsWith("Env/")) {
            return `/static/${raw}`;
        }
        return `/api/${raw}`;
    }

    function normalizeText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function sortTextValues(values) {
        return Array.from(new Set(values.filter((value) => normalizeText(value) !== ""))).sort(
            (left, right) => String(left).localeCompare(String(right), undefined, { sensitivity: "base" })
        );
    }

    function sortNumberValues(values) {
        return Array.from(
            new Set(
                values
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value))
            )
        ).sort((left, right) => left - right);
    }

    function setSelectOptions(selectElement, values, emptyLabel) {
        if (!selectElement) {
            return;
        }

        const previousValue = String(selectElement.value || "");
        selectElement.innerHTML = "";

        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = emptyLabel;
        selectElement.appendChild(emptyOption);

        values.forEach((value) => {
            const option = document.createElement("option");
            option.value = String(value);
            option.textContent = String(value);
            selectElement.appendChild(option);
        });

        if (values.some((value) => String(value) === previousValue)) {
            selectElement.value = previousValue;
        }
    }

    function refreshFilterOptions() {
        const fuelValues = sortTextValues(state.cars.map((car) => car.fuel_type || ""));
        const typeValues = sortTextValues(state.cars.map((car) => car.car_type || ""));
        const seatValues = sortNumberValues(state.cars.map((car) => car.seat_capacity));

        setSelectOptions(document.getElementById("filterFuelType"), fuelValues, "All Fuel Types");
        setSelectOptions(document.getElementById("filterCarType"), typeValues, "All Types");
        setSelectOptions(document.getElementById("filterSeatCapacity"), seatValues, "All Seats");
    }

    function resetCarForm() {
        if (!isAdmin) {
            return;
        }

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
        if (!isAdmin) {
            return;
        }

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

    function renderImages(car) {
        if (!car.images.length) {
            return `<div class="empty-state">No images</div>`;
        }

        return car.images
            .map((image) => {
                const preview = resolveImageUrl(image.image_url);
                const actions = isAdmin
                    ? `
                        <div class="image-actions">
                            <button type="button" class="btn-secondary" data-action="edit-image" data-car-id="${car.id}" data-image-id="${image.id}">Edit</button>
                            <button type="button" class="btn-danger" data-action="delete-image" data-car-id="${car.id}" data-image-id="${image.id}">Delete</button>
                        </div>
                    `
                    : "";

                return `
                    <div class="image-row">
                        <img src="${preview}" alt="${image.caption || car.name}" loading="lazy">
                        <div class="image-info">
                            <strong>${image.caption || "-"}</strong>
                            <small>${image.image_url}</small>
                        </div>
                        ${actions}
                    </div>
                `;
            })
            .join("");
    }

    function applyFiltersAndSort() {
        const fuelFilter = normalizeText(document.getElementById("filterFuelType")?.value);
        const typeFilter = normalizeText(document.getElementById("filterCarType")?.value);
        const seatFilter = document.getElementById("filterSeatCapacity")?.value || "";
        const sortBy = document.getElementById("sortBy")?.value || "price_per_day";
        const sortOrder = document.getElementById("sortOrder")?.value === "desc" ? "desc" : "asc";

        const filteredCars = state.cars.filter((car) => {
            if (fuelFilter && normalizeText(car.fuel_type) !== fuelFilter) {
                return false;
            }

            if (typeFilter && normalizeText(car.car_type) !== typeFilter) {
                return false;
            }

            if (seatFilter && String(car.seat_capacity) !== String(seatFilter)) {
                return false;
            }

            return true;
        });

        const numericSortFields = new Set(["price_per_day", "seat_capacity"]);
        filteredCars.sort((left, right) => {
            let compareResult = 0;

            if (numericSortFields.has(sortBy)) {
                compareResult = Number(left[sortBy] || 0) - Number(right[sortBy] || 0);
            } else {
                compareResult = String(left[sortBy] || "").localeCompare(String(right[sortBy] || ""), undefined, {
                    sensitivity: "base",
                });
            }

            if (compareResult === 0) {
                compareResult = String(left.name || "").localeCompare(String(right.name || ""), undefined, {
                    sensitivity: "base",
                });
            }

            return sortOrder === "desc" ? compareResult * -1 : compareResult;
        });

        state.visibleCars = filteredCars;
        renderCars();
    }

    function renderCars() {
        const container = document.getElementById("carsContainer");
        if (!state.visibleCars.length) {
            container.innerHTML = `<div class="empty-state">No cars found with current filters</div>`;
            return;
        }

        container.innerHTML = state.visibleCars
            .map((car) => {
                const adminActions = isAdmin
                    ? `
                        <div class="car-actions">
                            <button type="button" class="btn-secondary" data-action="edit-car" data-car-id="${car.id}">Edit Car</button>
                            <button type="button" class="btn-danger" data-action="delete-car" data-car-id="${car.id}">Delete Car</button>
                        </div>
                    `
                    : "";

                const adminImageForm = isAdmin
                    ? `
                        <form class="add-image-form" data-car-id="${car.id}">
                            <input type="text" name="image_url" placeholder="Add image URL or path" required>
                            <input type="text" name="caption" placeholder="Image caption">
                            <button type="submit" class="btn-primary">Add Image</button>
                        </form>
                        <form class="import-image-form" data-car-id="${car.id}" enctype="multipart/form-data">
                            <input type="file" name="image_file" accept="image/*" required>
                            <input type="text" name="caption" placeholder="Image caption">
                            <button type="submit" class="btn-secondary">Import from Device</button>
                        </form>
                    `
                    : "";

                return `
                    <article class="car-card">
                        <div class="car-head">
                            <div>
                                <h3>${car.name}</h3>
                                <span class="status-badge ${car.is_active ? "active" : "inactive"}">${car.is_active ? "Active" : "Inactive"}</span>
                            </div>
                            ${adminActions}
                        </div>

                        <div class="meta-grid">
                            <div class="meta-item"><span>Price</span><strong>${formatMoney(car.price_per_day)}</strong></div>
                            <div class="meta-item"><span>Fuel Type</span><strong>${car.fuel_type || "-"}</strong></div>
                            <div class="meta-item"><span>Consumption</span><strong>${car.fuel_consumption || "-"}</strong></div>
                            <div class="meta-item"><span>Type</span><strong>${car.car_type || "-"}</strong></div>
                            <div class="meta-item"><span>Seat</span><strong>${car.seat_capacity || "-"}</strong></div>
                            <div class="meta-item"><span>Engine CC</span><strong>${car.engine_cc || "-"}</strong></div>
                            <div class="meta-item"><span>Horsepower</span><strong>${car.horsepower || "-"} HP</strong></div>
                        </div>

                        <div class="images-block">
                            <h4>Images (${car.images.length})</h4>
                            <div class="image-list">${renderImages(car)}</div>
                            ${adminImageForm}
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    async function loadCars(query = "") {
        const safeQuery = String(query || "").trim();
        const data = await apiRequest(carsCollectionUrl(safeQuery));
        state.searchQuery = safeQuery;
        state.cars = Array.isArray(data) ? data : [];
        refreshFilterOptions();
        applyFiltersAndSort();
    }

    async function saveCar(event) {
        event.preventDefault();
        if (!isAdmin) {
            return;
        }

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
                await apiRequest(urls.adminCars, "POST", payload);
            }
            resetCarForm();
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    async function deleteCar(carId) {
        if (!isAdmin) {
            return;
        }

        if (!window.confirm("Delete this car?")) {
            return;
        }

        try {
            await apiRequest(carDetailUrl(carId), "DELETE");
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    async function addImage(formElement) {
        if (!isAdmin) {
            return;
        }

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
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    async function importImageFromDevice(formElement) {
        if (!isAdmin) {
            return;
        }

        const carId = formElement.dataset.carId;
        const fileField = formElement.querySelector("input[name='image_file']");
        const captionField = formElement.querySelector("input[name='caption']");
        const file = fileField && fileField.files ? fileField.files[0] : null;

        if (!file) {
            alert("Please select an image file");
            return;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("caption", (captionField.value || "").trim());

        try {
            await uploadFileRequest(carImageUploadUrl(carId), formData);
            fileField.value = "";
            captionField.value = "";
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    async function editImage(carId, imageId) {
        if (!isAdmin) {
            return;
        }

        const selectedCar = state.cars.find((car) => String(car.id) === String(carId));
        if (!selectedCar) {
            return;
        }
        const selectedImage = selectedCar.images.find((image) => String(image.id) === String(imageId));
        if (!selectedImage) {
            return;
        }

        const nextUrl = window.prompt("Edit image URL", selectedImage.image_url);
        if (nextUrl === null) {
            return;
        }
        const nextCaption = window.prompt("Edit image caption", selectedImage.caption || "");
        if (nextCaption === null) {
            return;
        }

        try {
            await apiRequest(carImageDetailUrl(carId, imageId), "PUT", {
                image_url: nextUrl.trim(),
                caption: nextCaption.trim(),
            });
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    async function deleteImage(carId, imageId) {
        if (!isAdmin) {
            return;
        }

        if (!window.confirm("Delete this image?")) {
            return;
        }

        try {
            await apiRequest(carImageDetailUrl(carId, imageId), "DELETE");
            await loadCars(state.searchQuery);
        } catch (error) {
            alert(error.message);
        }
    }

    function bindEvents() {
        const searchInput = document.getElementById("carSearchInput");
        const fuelFilterSelect = document.getElementById("filterFuelType");
        const typeFilterSelect = document.getElementById("filterCarType");
        const seatFilterSelect = document.getElementById("filterSeatCapacity");
        const sortBySelect = document.getElementById("sortBy");
        const sortOrderSelect = document.getElementById("sortOrder");
        const clearFiltersBtn = document.getElementById("clearFiltersBtn");

        document.getElementById("searchCarsBtn").addEventListener("click", () => {
            state.searchQuery = searchInput.value.trim();
            loadCars(state.searchQuery).catch((error) => alert(error.message));
        });

        searchInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }
            event.preventDefault();
            state.searchQuery = event.target.value.trim();
            loadCars(state.searchQuery).catch((error) => alert(error.message));
        });

        [fuelFilterSelect, typeFilterSelect, seatFilterSelect, sortBySelect, sortOrderSelect]
            .filter(Boolean)
            .forEach((element) => {
                element.addEventListener("change", applyFiltersAndSort);
            });

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener("click", () => {
                searchInput.value = "";
                state.searchQuery = "";

                if (fuelFilterSelect) {
                    fuelFilterSelect.value = "";
                }
                if (typeFilterSelect) {
                    typeFilterSelect.value = "";
                }
                if (seatFilterSelect) {
                    seatFilterSelect.value = "";
                }
                if (sortBySelect) {
                    sortBySelect.value = "price_per_day";
                }
                if (sortOrderSelect) {
                    sortOrderSelect.value = "asc";
                }

                loadCars("").catch((error) => alert(error.message));
            });
        }

        if (!isAdmin) {
            return;
        }

        const backAdminBtn = document.getElementById("backAdminBtn");
        if (backAdminBtn) {
            backAdminBtn.addEventListener("click", () => {
                window.location.href = urls.admin;
            });
        }

        document.getElementById("carForm").addEventListener("submit", saveCar);
        document.getElementById("resetCarFormBtn").addEventListener("click", resetCarForm);

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
            if (form) {
                event.preventDefault();
                addImage(form);
                return;
            }

            const importForm = event.target.closest("form.import-image-form");
            if (importForm) {
                event.preventDefault();
                importImageFromDevice(importForm);
            }
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
