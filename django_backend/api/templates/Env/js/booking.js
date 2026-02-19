const state = {
    currentStep: 1,
    startDate: "",
    endDate: "",
    selectedCar: null,
    currentProvince: "",
    destinationProvince: "",
    pickupType: "self",
    deliveryLat: "",
    deliveryLng: "",
    deliveryAddress: "",
    contactNumber: "",
};

let availabilityFetchId = 0;
let mapLoaded = false;
let mapLoadError = "";
let leafletMap = null;
let mapMarker = null;

const elements = {
    form: document.getElementById("bookingForm"),
    startDateInput: document.getElementById("start_date"),
    endDateInput: document.getElementById("end_date"),
    selectedDateInfo: document.getElementById("selectedDateInfo"),
    dateValidationMessage: document.getElementById("dateValidationMessage"),
    locationValidationMessage: document.getElementById("locationValidationMessage"),
    confirmValidationMessage: document.getElementById("confirmValidationMessage"),
    carsGrid: document.getElementById("carsGrid"),
    carCards: Array.from(document.querySelectorAll(".car-card")),
    currentProvince: document.getElementById("currentProvince"),
    destinationProvince: document.getElementById("destinationProvince"),
    pickupOptions: Array.from(document.querySelectorAll('input[name="pickup_option"]')),
    contactNumber: document.getElementById("contactNumber"),
    step1NextBtn: document.getElementById("step1NextBtn"),
    step2BackBtn: document.getElementById("step2BackBtn"),
    step2NextBtn: document.getElementById("step2NextBtn"),
    step3BackBtn: document.getElementById("step3BackBtn"),
    confirmBookingBtn: document.getElementById("confirmBookingBtn"),
    stepIndicators: Array.from(document.querySelectorAll(".step-indicator")),
    wizardSteps: Array.from(document.querySelectorAll(".wizard-step")),
    formCarId: document.getElementById("form_car_id"),
    formStartDate: document.getElementById("form_start_date"),
    formEndDate: document.getElementById("form_end_date"),
    formPickupType: document.getElementById("form_pickup_type"),
    formCurrentProvince: document.getElementById("form_current_province"),
    formDestinationProvince: document.getElementById("form_destination_province"),
    formContactNumber: document.getElementById("form_contact_number"),
    formDeliveryLat: document.getElementById("form_delivery_lat"),
    formDeliveryLng: document.getElementById("form_delivery_lng"),
    formDeliveryAddress: document.getElementById("form_delivery_address"),
    summaryCar: document.getElementById("summaryCar"),
    summaryDate: document.getElementById("summaryDate"),
    summaryDays: document.getElementById("summaryDays"),
    summaryCurrentProvince: document.getElementById("summaryCurrentProvince"),
    summaryDestinationProvince: document.getElementById("summaryDestinationProvince"),
    summaryPickupType: document.getElementById("summaryPickupType"),
    summaryMapLocation: document.getElementById("summaryMapLocation"),
    summaryPricePerDay: document.getElementById("summaryPricePerDay"),
    summaryTotalPrice: document.getElementById("summaryTotalPrice"),
    summaryDeposit: document.getElementById("summaryDeposit"),
    summaryRemaining: document.getElementById("summaryRemaining"),
    pickupMap: document.getElementById("pickupMap"),
    pickupMapTitle: document.getElementById("pickupMapTitle"),
    pickupMapHelp: document.getElementById("pickupMapHelp"),
    pickupMapStatus: document.getElementById("pickupMapStatus"),
    clearDeliveryPinBtn: document.getElementById("clearDeliveryPinBtn"),
};

const provinceCenters = {
    Bangkok: { lat: 13.7563, lng: 100.5018 },
    "Chiang Mai": { lat: 18.7883, lng: 98.9853 },
    "Chiang Rai": { lat: 19.9072, lng: 99.8309 },
    Phuket: { lat: 7.8804, lng: 98.3923 },
    Krabi: { lat: 8.0863, lng: 98.9063 },
    Pattaya: { lat: 12.9236, lng: 100.8825 },
    Rayong: { lat: 12.6823, lng: 101.2812 },
};

const mapConfig = {
    shopName: (elements.form?.dataset.shopName || "TripCraft Car Rent Pickup Center").trim(),
    shopAddress: (elements.form?.dataset.shopAddress || "").trim(),
    shopLat: Number(elements.form?.dataset.shopLat || 13.7466),
    shopLng: Number(elements.form?.dataset.shopLng || 100.5393),
};

if (!Number.isFinite(mapConfig.shopLat)) {
    mapConfig.shopLat = 13.7466;
}
if (!Number.isFinite(mapConfig.shopLng)) {
    mapConfig.shopLng = 100.5393;
}

function toYmd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseYmd(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function calculateDays(startYmd, endYmd) {
    const start = parseYmd(startYmd);
    const end = parseYmd(endYmd);
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function formatMoney(value) {
    return `${Number(value).toLocaleString("en-US")} THB`;
}

function setMessage(element, text, isError = true) {
    if (!element) return;
    element.textContent = text || "";
    element.classList.toggle("error", Boolean(text) && isError);
    element.classList.toggle("success", Boolean(text) && !isError);
}

function setMapStatus(text, isError = false) {
    if (!elements.pickupMapStatus) {
        return;
    }
    elements.pickupMapStatus.textContent = text || "";
    elements.pickupMapStatus.classList.toggle("error", Boolean(text) && isError);
}

function ensureMapSize() {
    if (!leafletMap) {
        return;
    }
    window.setTimeout(() => {
        leafletMap.invalidateSize();
    }, 80);
}

function setStep(step) {
    state.currentStep = step;

    elements.wizardSteps.forEach((section) => {
        section.classList.toggle("active", Number(section.dataset.step) === step);
    });

    elements.stepIndicators.forEach((indicator) => {
        const indicatorStep = Number(indicator.dataset.step);
        indicator.classList.toggle("active", indicatorStep === step);
        indicator.classList.toggle("completed", indicatorStep < step);
    });

    if (step === 2) {
        ensureMapSize();
    }
}

function getDateValidationError() {
    const startDate = elements.startDateInput.value;
    const endDate = elements.endDateInput.value;

    if (!startDate || !endDate) {
        return "Please select pickup and return dates";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = parseYmd(startDate);
    const end = parseYmd(endDate);

    if (start <= today) {
        return "Booking must be at least 1 day in advance";
    }

    if (end < start) {
        return "Return date must be greater than or equal to pickup date";
    }

    return "";
}

function updateSelectedDateInfo() {
    const startDate = elements.startDateInput.value;
    const endDate = elements.endDateInput.value;
    const dateError = getDateValidationError();

    if (dateError) {
        elements.selectedDateInfo.textContent = "Please choose pickup and return dates first";
        return;
    }

    const days = calculateDays(startDate, endDate);
    if (state.selectedCar) {
        elements.selectedDateInfo.textContent = `Selected dates: ${startDate} - ${endDate} (${days} days) | Car: ${state.selectedCar.name}`;
        return;
    }

    elements.selectedDateInfo.textContent = `Selected dates: ${startDate} - ${endDate} (${days} days)`;
}

function clearCarSelection() {
    state.selectedCar = null;
    elements.carCards.forEach((card) => card.classList.remove("selected"));
}

function renderCars(cars) {
    const availabilityMap = new Map(cars.map((car) => [String(car.id), car]));

    elements.carCards.forEach((card) => {
        const carId = card.dataset.carId;
        const statusTag = card.querySelector(".car-status");
        const availability = availabilityMap.get(carId);

        card.classList.remove("loading", "available", "full", "selected");

        if (!availability) {
            card.disabled = true;
            card.classList.add("full");
            if (statusTag) statusTag.textContent = "Unavailable";
            return;
        }

        if (availability.is_available) {
            card.disabled = false;
            card.classList.add("available");
            if (statusTag) statusTag.textContent = "Available";
        } else {
            card.disabled = true;
            card.classList.add("full");
            if (statusTag) statusTag.textContent = "Full";
        }
    });

    if (state.selectedCar) {
        const selectedCard = elements.carCards.find(
            (card) => Number(card.dataset.carId) === state.selectedCar.id
        );
        if (!selectedCard || selectedCard.disabled) {
            clearCarSelection();
            setMessage(elements.dateValidationMessage, "Previously selected car is no longer available for these dates");
        } else {
            selectedCard.classList.add("selected");
        }
    }
}

function setCarsLoadingState(message) {
    elements.carCards.forEach((card) => {
        const statusTag = card.querySelector(".car-status");
        card.classList.remove("available", "full", "selected");
        card.classList.add("loading");
        card.disabled = true;
        if (statusTag) statusTag.textContent = message;
    });
}

async function refreshAvailability() {
    const dateError = getDateValidationError();

    if (dateError) {
        clearCarSelection();
        setCarsLoadingState("Waiting for dates");
        setMessage(elements.dateValidationMessage, dateError);
        updateSelectedDateInfo();
        return;
    }

    setMessage(elements.dateValidationMessage, "");
    updateSelectedDateInfo();

    const availabilityUrl = elements.form.dataset.availabilityUrl;
    const startDate = elements.startDateInput.value;
    const endDate = elements.endDateInput.value;

    const requestId = ++availabilityFetchId;
    setCarsLoadingState("Checking...");

    try {
        const query = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
        });
        const response = await fetch(`${availabilityUrl}?${query.toString()}`);

        if (requestId !== availabilityFetchId) {
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Cannot load car availability");
        }

        renderCars(data.cars || []);
    } catch (error) {
        clearCarSelection();
        setCarsLoadingState("Load failed");
        setMessage(elements.dateValidationMessage, error.message || "Failed to load car data");
    }

    updateSelectedDateInfo();
}

function selectCar(card) {
    if (card.disabled || card.classList.contains("full")) {
        return;
    }

    const carId = Number(card.dataset.carId);
    const carName = card.dataset.carName;
    const carPrice = Number(card.dataset.carPrice);

    elements.carCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");

    state.selectedCar = {
        id: carId,
        name: carName,
        pricePerDay: carPrice,
    };

    setMessage(elements.dateValidationMessage, "");
    updateSelectedDateInfo();
}

function validateStep1() {
    const dateError = getDateValidationError();
    if (dateError) {
        setMessage(elements.dateValidationMessage, dateError);
        return false;
    }

    if (!state.selectedCar) {
        setMessage(elements.dateValidationMessage, "Please select an available car before continuing");
        return false;
    }

    state.startDate = elements.startDateInput.value;
    state.endDate = elements.endDateInput.value;
    return true;
}

function getSelectedPickupType() {
    return document.querySelector('input[name="pickup_option"]:checked')?.value || "self";
}

function getProvinceCenter(provinceName) {
    return provinceCenters[provinceName] || { lat: mapConfig.shopLat, lng: mapConfig.shopLng };
}

function escapeHtml(text) {
    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function setClearPinButtonVisible(isVisible) {
    if (!elements.clearDeliveryPinBtn) {
        return;
    }
    elements.clearDeliveryPinBtn.classList.toggle("show", Boolean(isVisible));
}

function clearDeliveryPin(resetStatus = true) {
    state.deliveryLat = "";
    state.deliveryLng = "";
    state.deliveryAddress = "";

    if (state.pickupType === "delivery" && mapMarker) {
        mapMarker.remove();
        mapMarker = null;
    }

    if (resetStatus) {
        setMapStatus("Delivery mode: click on the map to pin the customer delivery location.");
    }
}

function setMapMarker(lat, lng, draggable, popupContent, openPopup = false) {
    if (!leafletMap) {
        return;
    }

    if (mapMarker) {
        mapMarker.remove();
        mapMarker = null;
    }

    mapMarker = L.marker([lat, lng], { draggable }).addTo(leafletMap);

    if (draggable) {
        mapMarker.on("dragend", (event) => {
            if (state.pickupType !== "delivery") {
                return;
            }
            const point = event.target.getLatLng();
            setDeliveryPin(point.lat, point.lng);
        });
    }

    if (popupContent) {
        mapMarker.bindPopup(popupContent);
        if (openPopup) {
            mapMarker.openPopup();
        }
    }
}

function updateDeliveryPinStatus() {
    if (!state.deliveryLat || !state.deliveryLng) {
        setMapStatus("Delivery mode: click on the map to pin the customer delivery location.");
        return;
    }

    setMapStatus(`Pinned location: ${state.deliveryLat}, ${state.deliveryLng}`);
}

function setDeliveryPin(lat, lng) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return;
    }

    state.deliveryLat = parsedLat.toFixed(6);
    state.deliveryLng = parsedLng.toFixed(6);
    state.deliveryAddress = "";

    if (!mapLoaded || !leafletMap) {
        return;
    }

    const popup = `<strong>Delivery pin</strong><div>${state.deliveryLat}, ${state.deliveryLng}</div>`;
    setMapMarker(parsedLat, parsedLng, true, popup, false);
    leafletMap.setView([parsedLat, parsedLng], 15);
    updateDeliveryPinStatus();
}

function showShopLocation() {
    state.deliveryLat = "";
    state.deliveryLng = "";
    state.deliveryAddress = "";

    const safeShopName = escapeHtml(mapConfig.shopName);
    const safeShopAddress = escapeHtml(mapConfig.shopAddress);
    const addressHtml = safeShopAddress ? `<div style="margin-top:4px;">${safeShopAddress}</div>` : "";

    setMapMarker(
        mapConfig.shopLat,
        mapConfig.shopLng,
        false,
        `<div style="font-size:13px;"><strong>${safeShopName}</strong>${addressHtml}</div>`,
        true
    );
    leafletMap.setView([mapConfig.shopLat, mapConfig.shopLng], 15);
    setMapStatus(`Self Pickup location: ${mapConfig.shopName}${mapConfig.shopAddress ? ` - ${mapConfig.shopAddress}` : ""}`);
}

function showDeliveryMode() {
    if (state.deliveryLat && state.deliveryLng) {
        setDeliveryPin(state.deliveryLat, state.deliveryLng);
        return;
    }

    if (mapMarker) {
        mapMarker.remove();
        mapMarker = null;
    }

    const center = getProvinceCenter(elements.destinationProvince.value || elements.currentProvince.value);
    leafletMap.setView([center.lat, center.lng], 11);
    setMapStatus("Delivery mode: click on the map to pin the customer delivery location.");
}

function updateMapForPickupType() {
    state.pickupType = getSelectedPickupType();

    if (!elements.pickupMapTitle || !elements.pickupMapHelp) {
        return;
    }

    if (!mapLoaded) {
        if (mapLoadError) {
            setMapStatus(mapLoadError, true);
        }
        return;
    }

    if (state.pickupType === "self") {
        elements.pickupMapTitle.textContent = "Pickup Location Map (Shop)";
        elements.pickupMapHelp.textContent = "User selected Self Pickup. The map shows the store pickup location.";
        setClearPinButtonVisible(false);
        showShopLocation();
    } else {
        elements.pickupMapTitle.textContent = "Delivery Map Pin";
        elements.pickupMapHelp.textContent = "User selected Delivery. Click the map to pin where the car should be delivered.";
        setClearPinButtonVisible(true);
        showDeliveryMode();
    }

    ensureMapSize();
}

function initializePickupMap() {
    if (!elements.pickupMap) {
        return;
    }

    if (typeof window.L === "undefined") {
        mapLoaded = false;
        mapLoadError = "Leaflet library is missing. Please check network and reload.";
        setMapStatus(mapLoadError, true);
        return;
    }

    leafletMap = L.map(elements.pickupMap, {
        zoomControl: true,
    }).setView([mapConfig.shopLat, mapConfig.shopLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(leafletMap);

    leafletMap.on("click", (event) => {
        if (state.pickupType !== "delivery") {
            return;
        }
        setDeliveryPin(event.latlng.lat, event.latlng.lng);
    });

    mapLoaded = true;
    mapLoadError = "";
    setMapStatus("");
    updateMapForPickupType();
}

function validateStep2() {
    const currentProvince = elements.currentProvince.value;
    const destinationProvince = elements.destinationProvince.value;
    const pickupType = getSelectedPickupType();

    if (!currentProvince || !destinationProvince) {
        setMessage(elements.locationValidationMessage, "Please select current province and destination province");
        return false;
    }

    if (pickupType === "delivery") {
        if (!mapLoaded) {
            setMessage(
                elements.locationValidationMessage,
                mapLoadError || "Map is not ready yet. Please try again."
            );
            return false;
        }

        if (!state.deliveryLat || !state.deliveryLng) {
            setMessage(elements.locationValidationMessage, "Please pin delivery location on the map");
            return false;
        }
    }

    state.currentProvince = currentProvince;
    state.destinationProvince = destinationProvince;
    state.pickupType = pickupType;
    setMessage(elements.locationValidationMessage, "");
    return true;
}

function validateStep3() {
    const contact = elements.contactNumber.value.trim();

    if (!/^[0-9]{10}$/.test(contact)) {
        setMessage(elements.confirmValidationMessage, "Please provide a valid 10-digit phone number");
        return false;
    }

    state.contactNumber = contact;
    setMessage(elements.confirmValidationMessage, "");
    return true;
}

function updateSummary() {
    const days = calculateDays(state.startDate, state.endDate);
    const totalPrice = state.selectedCar.pricePerDay * days;
    const deposit = Math.round(totalPrice * 0.3);
    const remaining = totalPrice - deposit;

    elements.summaryCar.textContent = state.selectedCar.name;
    elements.summaryDate.textContent = `${state.startDate} - ${state.endDate}`;
    elements.summaryDays.textContent = `${days} days`;
    elements.summaryCurrentProvince.textContent = state.currentProvince;
    elements.summaryDestinationProvince.textContent = state.destinationProvince;
    elements.summaryPickupType.textContent = state.pickupType === "delivery" ? "Delivery" : "Self Pickup";

    if (state.pickupType === "delivery") {
        elements.summaryMapLocation.textContent = `${state.deliveryLat}, ${state.deliveryLng}`;
    } else {
        elements.summaryMapLocation.textContent = `${mapConfig.shopName}${mapConfig.shopAddress ? ` - ${mapConfig.shopAddress}` : ""}`;
    }

    elements.summaryPricePerDay.textContent = formatMoney(state.selectedCar.pricePerDay);
    elements.summaryTotalPrice.textContent = formatMoney(totalPrice);
    elements.summaryDeposit.textContent = formatMoney(deposit);
    elements.summaryRemaining.textContent = formatMoney(remaining);
}

function fillHiddenFields() {
    elements.formCarId.value = state.selectedCar.id;
    elements.formStartDate.value = state.startDate;
    elements.formEndDate.value = state.endDate;
    elements.formPickupType.value = state.pickupType;
    elements.formCurrentProvince.value = state.currentProvince;
    elements.formDestinationProvince.value = state.destinationProvince;
    elements.formContactNumber.value = state.contactNumber;
    elements.formDeliveryLat.value = state.deliveryLat;
    elements.formDeliveryLng.value = state.deliveryLng;
    elements.formDeliveryAddress.value = state.deliveryAddress;
}

function initializeDateInputs() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const tomorrowYmd = toYmd(tomorrow);
    const dayAfterTomorrowYmd = toYmd(dayAfterTomorrow);

    elements.startDateInput.min = tomorrowYmd;
    elements.endDateInput.min = tomorrowYmd;
    elements.startDateInput.value = tomorrowYmd;
    elements.endDateInput.value = dayAfterTomorrowYmd;

    elements.startDateInput.addEventListener("change", () => {
        const startDate = elements.startDateInput.value;
        elements.endDateInput.min = startDate || tomorrowYmd;

        if (elements.endDateInput.value && startDate && elements.endDateInput.value < startDate) {
            elements.endDateInput.value = startDate;
        }

        refreshAvailability();
    });

    elements.endDateInput.addEventListener("change", refreshAvailability);
}

function bindEvents() {
    elements.carCards.forEach((card) => {
        card.addEventListener("click", () => selectCar(card));
    });

    elements.pickupOptions.forEach((option) => {
        option.addEventListener("change", () => {
            state.pickupType = getSelectedPickupType();
            setMessage(elements.locationValidationMessage, "");

            if (state.pickupType === "self") {
                clearDeliveryPin(false);
            }

            updateMapForPickupType();
        });
    });

    elements.currentProvince.addEventListener("change", () => {
        if (!mapLoaded) {
            return;
        }

        if (state.pickupType === "self") {
            updateMapForPickupType();
            return;
        }

        if (!state.deliveryLat) {
            updateMapForPickupType();
        }
    });

    elements.destinationProvince.addEventListener("change", () => {
        if (!mapLoaded || state.pickupType !== "delivery") {
            return;
        }

        if (!state.deliveryLat) {
            updateMapForPickupType();
        }
    });

    if (elements.clearDeliveryPinBtn) {
        elements.clearDeliveryPinBtn.addEventListener("click", () => {
            if (state.pickupType !== "delivery") {
                return;
            }
            clearDeliveryPin(true);
        });
    }

    elements.step1NextBtn.addEventListener("click", () => {
        if (!validateStep1()) {
            return;
        }
        setStep(2);
        updateMapForPickupType();
    });

    elements.step2BackBtn.addEventListener("click", () => setStep(1));

    elements.step2NextBtn.addEventListener("click", () => {
        if (!validateStep2()) {
            return;
        }

        updateSummary();
        setStep(3);
    });

    elements.step3BackBtn.addEventListener("click", () => setStep(2));

    elements.confirmBookingBtn.addEventListener("click", () => {
        if (!validateStep3()) {
            return;
        }

        fillHiddenFields();
        elements.form.submit();
    });
}

function logout() {
    if (confirm("Do you want to logout?")) {
        window.location.href = "/api/logout/";
    }
}

window.logout = logout;

document.addEventListener("DOMContentLoaded", () => {
    initializeDateInputs();
    bindEvents();
    initializePickupMap();
    refreshAvailability();
});
