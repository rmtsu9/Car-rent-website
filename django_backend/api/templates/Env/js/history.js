/**
 * Rental History Management
 * Handles fetching, filtering, and displaying rental history
 */

// Check if user is logged in
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        window.location.href = 'Login.html';
    }
    initializeHistory();
});

// Sample rental history data
const rentalHistory = [
    {
        id: 'RH001',
        vehicle: 'Toyota Camry',
        pickupDate: '2026-01-15',
        dropoffDate: '2026-01-18',
        duration: '3 วัน',
        pickupLocation: 'สาขากรุงเทพ',
        dropoffLocation: 'สาขาเชียงใหม่',
        dailyRate: 1500,
        totalPrice: 4500,
        status: 'completed',
        bookingDate: '2026-01-10'
    },
    {
        id: 'RH002',
        vehicle: 'Honda Accord',
        pickupDate: '2026-01-20',
        dropoffDate: '2026-01-23',
        duration: '3 วัน',
        pickupLocation: 'สาขากรุงเทพ',
        dropoffLocation: 'สาขากรุงเทพ',
        dailyRate: 1300,
        totalPrice: 3900,
        status: 'completed',
        bookingDate: '2026-01-15'
    },
    {
        id: 'RH003',
        vehicle: 'Nissan Altima',
        pickupDate: '2026-02-01',
        dropoffDate: '2026-02-05',
        duration: '4 วัน',
        pickupLocation: 'สาขากรุงเทพ',
        dropoffLocation: 'สาขาพัทยา',
        dailyRate: 1200,
        totalPrice: 4800,
        status: 'completed',
        bookingDate: '2026-01-25'
    },
    {
        id: 'RH004',
        vehicle: 'BMW 3 Series',
        pickupDate: '2026-02-10',
        dropoffDate: '2026-02-12',
        duration: '2 วัน',
        pickupLocation: 'สาขากรุงเทพ',
        dropoffLocation: 'สาขากรุงเทพ',
        dailyRate: 2500,
        totalPrice: 5000,
        status: 'ongoing',
        bookingDate: '2026-02-05'
    },
    {
        id: 'RH005',
        vehicle: 'Mazda 6',
        pickupDate: '2026-01-05',
        dropoffDate: '2026-01-08',
        duration: '3 วัน',
        pickupLocation: 'สาขากรุงเทพ',
        dropoffLocation: 'สาขาระยอง',
        dailyRate: 1100,
        totalPrice: 3300,
        status: 'cancelled',
        bookingDate: '2025-12-30'
    }
];

let filteredData = [...rentalHistory];

function initializeHistory() {
    setupEventListeners();
    loadNetworkHistory();
    renderHistory();
}

async function loadNetworkHistory() {
    try {
        const userId = apiUtils.getUserId() || 'user';
        const response = await historyAPI.getUserHistory(userId);
        
        if (response.success && response.data && response.data.length > 0) {
            // Merge API data with local data
            rentalHistory.length = 0;
            rentalHistory.push(...response.data);
            filteredData = [...rentalHistory];
        }
    } catch (error) {
        console.log('API not available, using local history data');
        // Use local history data
        filteredData = [...rentalHistory];
    }
}

function setupEventListeners() {
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const sortFilter = document.getElementById('sortFilter')?.value || 'newest';

    // Filter by status
    if (statusFilter === 'all') {
        filteredData = [...rentalHistory];
    } else {
        filteredData = rentalHistory.filter(item => item.status === statusFilter);
    }

    // Sort
    if (sortFilter === 'newest') {
        filteredData.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    } else if (sortFilter === 'oldest') {
        filteredData.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
    } else if (sortFilter === 'price-high') {
        filteredData.sort((a, b) => b.totalPrice - a.totalPrice);
    } else if (sortFilter === 'price-low') {
        filteredData.sort((a, b) => a.totalPrice - b.totalPrice);
    }

    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (!filteredData || filteredData.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>ยังไม่มีประวัติการเช่า</h3>
                <p>คลิกปุ่ม "จองรถ" เพื่อเริ่มการจองครั้งแรก</p>
                <a href="Booking.html">🚗 จองรถเลย</a>
            </div>
        `;
        return;
    }

    historyList.innerHTML = '';
    
    filteredData.forEach(rental => {
        const statusText = getStatusText(rental.status);
        const statusClass = rental.status;
        const pickupDate = formatThaiDate(new Date(rental.pickupDate));
        const dropoffDate = formatThaiDate(new Date(rental.dropoffDate));

        const card = document.createElement('div');
        card.className = `history-card ${statusClass}`;
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <h3>${rental.vehicle}</h3>
                    <p>รหัสการจอง #${rental.id}</p>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="card-content">
                <div class="info-group">
                    <span class="info-label">📍 สถานที่ยกรถ</span>
                    <span class="info-value">${rental.pickupLocation}</span>
                </div>
                <div class="info-group">
                    <span class="info-label">📍 สถานที่คืนรถ</span>
                    <span class="info-value">${rental.dropoffLocation}</span>
                </div>
                <div class="info-group">
                    <span class="info-label">📅 เริ่มต้น</span>
                    <span class="info-value">${pickupDate}</span>
                </div>
                <div class="info-group">
                    <span class="info-label">📅 สิ้นสุด</span>
                    <span class="info-value">${dropoffDate}</span>
                </div>
            </div>

            <div class="price-box">
                <div class="price-row">
                    <span>อัตรารายวัน</span>
                    <span>${rental.dailyRate} บาท × ${rental.duration}</span>
                </div>
                <div class="price-row">
                    <span><strong>ราคารวม</strong></span>
                    <span><strong>${rental.totalPrice} บาท</strong></span>
                </div>
            </div>

            <div class="card-footer">
                <button class="btn btn-view" onclick="showDetail('${rental.id}')">👁️ ดูรายละเอียด</button>
                <button class="btn btn-download" onclick="downloadReceipt('${rental.id}')">📥 ดาวน์โหลดใบเสร็จ</button>
            </div>
        `;

        historyList.appendChild(card);
    });
}

async function showDetail(rentalId) {
    const rental = rentalHistory.find(r => r.id === rentalId);
    if (!rental) {
        try {
            const response = await historyAPI.getById(rentalId);
            if (response.success) {
                displayDetailModal(response.data);
            }
        } catch (error) {
            console.log('Cannot fetch detail from API');
        }
        return;
    }

    displayDetailModal(rental);
}

function displayDetailModal(rental) {
    const modalBody = document.getElementById('detailModal').querySelector('.modal-content');
    const pickupDate = formatThaiDate(new Date(rental.pickupDate));
    const dropoffDate = formatThaiDate(new Date(rental.dropoffDate));
    const statusText = getStatusText(rental.status);

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2>📋 รายละเอียดการเช่า</h2>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="detail-row">
                <span class="detail-label">รหัสการจอง</span>
                <span class="detail-value">#${rental.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ยานพาหนะ</span>
                <span class="detail-value">${rental.vehicle}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">วันเริ่มต้น</span>
                <span class="detail-value">${pickupDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">วันสิ้นสุด</span>
                <span class="detail-value">${dropoffDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ระยะเวลา</span>
                <span class="detail-value">${rental.duration}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">สถานที่ยกรถ</span>
                <span class="detail-value">${rental.pickupLocation}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">สถานที่คืนรถ</span>
                <span class="detail-value">${rental.dropoffLocation}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">อัตรารายวัน</span>
                <span class="detail-value">${rental.dailyRate} บาท</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ราคารวม</span>
                <span class="detail-value"><strong>${rental.totalPrice} บาท</strong></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">สถานะ</span>
                <span class="detail-value">${getStatusText(rental.status)}</span>
            </div>
        </div>
    `;

    document.getElementById('detailModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

async function downloadReceipt(rentalId) {
    const rental = rentalHistory.find(r => r.id === rentalId);
    if (!rental) {
        try {
            const response = await historyAPI.getById(rentalId);
            if (response.success) {
                displayReceipt(response.data);
            }
        } catch (error) {
            console.log('Cannot fetch receipt from API');
        }
        return;
    }

    displayReceipt(rental);
}

function displayReceipt(rental) {
    alert(`📄 ใบเสร็จรับเงิน\n\nรหัสการจอง: #${rental.id}\nยานพาหนะ: ${rental.vehicle}\nราคารวม: ${rental.totalPrice} บาท\n\n(ในระบบจริง ไฟล์ PDF จะถูกดาวน์โหลด)`);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH');
}

function formatThaiDate(date) {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                   'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    const dayName = date.toLocaleString('th-TH', { weekday: 'short' });
    
    return `${dayName}ที่ ${day} ${month} ${year}`;
}

function getStatusText(status) {
    const statusMap = {
        'completed': '✅ สำเร็จ',
        'ongoing': '⏳ กำลังอยู่',
        'cancelled': '❌ ยกเลิก'
    };
    return statusMap[status] || status;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
}