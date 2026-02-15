/* Global Variables */
let selectedCar = null; // {id, name, price}

/* Helper Functions */
function parseDate(yMd) {
    const parts = yMd.split('-');
    return new Date(parts[0], parts[1]-1, parts[2]);
}

function computeDays(start, end) {
    const s = parseDate(start);
    const e = parseDate(end);
    const diff = Math.floor((e - s) / (1000*60*60*24));
    return diff + 1; // รวมวันแรก
}

/* Event Listeners for Date Changes */
document.addEventListener('DOMContentLoaded', function() {
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');

    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', updatePreview);
        endDateInput.addEventListener('change', updatePreview);
    }
});

/* Update Price Preview */
function updatePreview() {
    const s = document.getElementById('start_date').value;
    const e = document.getElementById('end_date').value;
    const info = document.getElementById('selectedInfo');
    const preview = document.getElementById('pricePreview');

    if (!s || !e) {
        info.textContent = 'โปรดเลือกวันรับ/คืน';
        preview.style.display = 'none';
        return;
    }

    // disable start <= today in UI (Server side validation recommended)
    const today = new Date();
    today.setHours(0,0,0,0);
    const startDate = parseDate(s);
    if (startDate <= today) {
        info.textContent = 'ต้องจองล่วงหน้าอย่างน้อย 1 วัน';
        preview.style.display = 'none';
        return;
    }

    const days = computeDays(s,e);
    if (days <= 0) {
        info.textContent = 'วันคืนต้องมากกว่าวันรับ';
        preview.style.display = 'none';
        return;
    }

    info.textContent = `วันที่เลือก: ${s} → ${e}`;
    if (selectedCar) {
        const price = selectedCar.price * days;
        document.getElementById('previewDays').textContent = days;
        document.getElementById('previewPrice').textContent = price;
        preview.style.display = 'block';
    } else {
        document.getElementById('previewDays').textContent = days;
        document.getElementById('previewPrice').textContent = '–';
        preview.style.display = 'block';
    }
}

/* Function called when user clicks a car card */
function onClickCar(carId, carName, carPrice) {
    // ให้ UI แสดง selected
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
    
    const selectedElement = document.getElementById('car-'+carId);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }

    selectedCar = { id: carId, name: carName, price: parseInt(carPrice, 10) };

    // update preview (ถ้าวันถูกเลือกแล้ว)
    updatePreview();

    // เปิด modal เลือกจังหวัด
    document.getElementById('selectedCarId').value = carId;
    document.getElementById('zoneModal').style.display = 'block';
}

/* Function to handle fallback selectCar (if needed by other buttons) */
function selectCar(carId) {
    const startDate = document.getElementById("start_date").value;
    const endDate = document.getElementById("end_date").value;

    if (!startDate || !endDate) {
        alert("กรุณาเลือกวันรับรถและวันคืนรถก่อน");
        return;
    }

    // เปิด modal
    document.getElementById("selectedCarId").value = carId;
    document.getElementById("zoneModal").style.display = "block";
}

/* Function to Close Modal */
function closeZoneModal() {
    document.getElementById("zoneModal").style.display = "none";
}

/* Function to Proceed to Booking Details */
function proceedToDetails() {
    const currentProvince = document.getElementById('currentProvince').value;
    const destinationProvince = document.getElementById('destinationProvince').value;
    // ตรวจสอบ radio button ของ pickup_option (ถ้ามี)
    const pickupType = document.querySelector('input[name="pickup_option"]:checked')?.value || 'self';

    if (!currentProvince || !destinationProvince) {
        alert('กรุณาเลือกจังหวัดให้ครบ');
        return;
    }

    // ใส่ค่าลง form hidden inputs
    document.getElementById('form_start_date').value = document.getElementById('start_date').value;
    document.getElementById('form_end_date').value = document.getElementById('end_date').value;
    document.getElementById('form_current_province').value = currentProvince;
    document.getElementById('form_destination_province').value = destinationProvince;
    document.getElementById('form_pickup_type').value = pickupType;

    // submit ไป Django
    document.getElementById('bookingForm').submit();
}

/* Calendar Navigation Placeholders (Need implementation or library) */
function previousMonth() {
    console.log("Previous month clicked");
    // Implement calendar logic here
}

function nextMonth() {
    console.log("Next month clicked");
    // Implement calendar logic here
}

function logout() {
    // Implement logout logic here or redirect
    console.log("Logout clicked");
}

const deposit = Math.round(price * 0.3);
document.getElementById('previewDeposit').textContent = deposit;

if (selectedElement.classList.contains("disabled")) {
    return;
}
