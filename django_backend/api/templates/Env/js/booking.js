const state = {
    currentStep: 1,
    startDate: "",
    endDate: "",
    selectedCar: null,
    currentProvince: "",
    destinationProvince: "",
    pickupType: "self",
    contactNumber: "",
};

let availabilityFetchId = 0;

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
    summaryCar: document.getElementById("summaryCar"),
    summaryDate: document.getElementById("summaryDate"),
    summaryDays: document.getElementById("summaryDays"),
    summaryCurrentProvince: document.getElementById("summaryCurrentProvince"),
    summaryDestinationProvince: document.getElementById("summaryDestinationProvince"),
    summaryPickupType: document.getElementById("summaryPickupType"),
    summaryPricePerDay: document.getElementById("summaryPricePerDay"),
    summaryTotalPrice: document.getElementById("summaryTotalPrice"),
    summaryDeposit: document.getElementById("summaryDeposit"),
    summaryRemaining: document.getElementById("summaryRemaining"),
};

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

function validateStep2() {
    const currentProvince = elements.currentProvince.value;
    const destinationProvince = elements.destinationProvince.value;
    const pickupType = document.querySelector('input[name="pickup_option"]:checked')?.value || "self";

    if (!currentProvince || !destinationProvince) {
        setMessage(elements.locationValidationMessage, "Please select current province and destination province");
        return false;
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

    elements.step1NextBtn.addEventListener("click", () => {
        if (!validateStep1()) {
            return;
        }
        setStep(2);
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
        window.location.href = "/logout/";
    }
}

window.logout = logout;

document.addEventListener("DOMContentLoaded", () => {
    initializeDateInputs();
    bindEvents();
    refreshAvailability();
});
