/**
 * Order Management System
 * Tracks order progress through 4-step booking workflow
 */

// Check if user is logged in
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        window.location.href = 'Login.html';
    }
    loadOrders();
});

// Sample orders data
const sampleOrders = [
    {
        id: 'ORD001',
        bookingId: 'BK001',
        vehicle: 'Toyota Camry',
        pickupDate: '2026-02-15',
        dropoffDate: '2026-02-18',
        pickupLocation: 'กรุงเทพมหานคร',
        dropoffLocation: 'เชียงใหม่',
        totalPrice: 4500,
        currentStep: 2,
        timeline: [
            { step: 1, title: '💳 วางเงินประกัน', status: 'completed', time: '08:30 น.' },
            { step: 2, title: '📞 รอเจ้าหนี้ติดต่อ', status: 'active', time: '09:45 น.' },
            { step: 3, title: '🚗 ยืนยันส่ง/รับรถ', status: 'pending', time: '' },
            { step: 4, title: '✅ สำเร็จ', status: 'pending', time: '' }
        ]
    },
    {
        id: 'ORD002',
        bookingId: 'BK002',
        vehicle: 'Honda Accord',
        pickupDate: '2026-02-20',
        dropoffDate: '2026-02-22',
        pickupLocation: 'เชียงใหม่',
        dropoffLocation: 'กรุงเทพมหานคร',
        totalPrice: 2600,
        currentStep: 1,
        timeline: [
            { step: 1, title: '💳 วางเงินประกัน', status: 'active', time: '10:15 น.' },
            { step: 2, title: '📞 รอเจ้าหนี้ติดต่อ', status: 'pending', time: '' },
            { step: 3, title: '🚗 ยืนยันส่ง/รับรถ', status: 'pending', time: '' },
            { step: 4, title: '✅ สำเร็จ', status: 'pending', time: '' }
        ]
    }
];

async function loadOrders() {
    try {
        const userId = apiUtils.getUserId() || 'user';
        const response = await orderAPI.getUserOrders(userId);
        
        if (response.success && response.data && response.data.length > 0) {
            sampleOrders.length = 0;
            sampleOrders.push(...response.data);
        }
    } catch (error) {
        console.log('API not available, using local order data');
    }
    
    renderOrders();
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    
    if (!sampleOrders || sampleOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>ยังไม่มีคำสั่งซื้อ</h3>
                <p>คลิกปุ่ม "จองรถ" เพื่อสร้างคำสั่งซื้อใหม่</p>
                <a href="Booking.html">🚗 จองรถเลย</a>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    
    sampleOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        container.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'progress-tracker';
    
    const completedSteps = order.timeline.filter(t => t.status === 'completed').length;
    const progressPercentage = (completedSteps / 4) * 100;
    
    let timelineHTML = '<div class="timeline-items">';
    order.timeline.forEach((item, idx) => {
        const timelineClass = item.status;
        timelineHTML += `
            <div class="timeline-item ${timelineClass}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-title">${item.title}</div>
                    <div class="timeline-time">${item.time}</div>
                </div>
            </div>
        `;
        if (idx < order.timeline.length - 1) {
            timelineHTML += '<div class="timeline-connector"></div>';
        }
    });
    timelineHTML += '</div>';
    
    let actionButton = '';
    if (order.currentStep < 4) {
        const nextStep = order.currentStep + 1;
        const stepTitles = {
            1: 'ยังไม่ได้วางเงิน',
            2: 'ยืนยันการติดต่อ',
            3: 'ยืนยันรับ/ส่งรถ',
            4: 'สำเร็จ'
        };
        actionButton = `<button class="btn btn-primary" onclick="confirmStep('${order.id}', ${nextStep})">✓ ยืนยัน${stepTitles[order.currentStep]}</button>`;
    } else {
        actionButton = `<span style="color: #2e7d32; font-weight: bold;">✅ สำเร็จแล้ว</span>`;
    }
    
    card.innerHTML = `
        <h3>รหัสคำสั่ง: #${order.id}</h3>
        
        <div class="order-card">
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">🚗 ยานพาหนะ</span>
                    <span class="info-value">${order.vehicle}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📅 วันเริ่มต้น</span>
                    <span class="info-value">${formatDate(order.pickupDate)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📅 วันสิ้นสุด</span>
                    <span class="info-value">${formatDate(order.dropoffDate)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">💰 ราคารวม</span>
                    <span class="info-value">${order.totalPrice} บาท</span>
                </div>
            </div>
            
            <div class="progress-steps">
                <div class="progress-line-bg"></div>
                <div class="progress-line-active" style="width: ${progressPercentage}%"></div>
                ${order.timeline.map((step, idx) => `
                    <div class="step ${step.status}">
                        <div class="step-number">${step.status === 'completed' ? '✓' : step.step}</div>
                        <div class="step-label">${step.title}</div>
                    </div>
                `).join('')}
            </div>
            
            ${timelineHTML}
            
            <div class="action-buttons">
                ${actionButton}
                <button class="btn btn-secondary" onclick="contactSupport('${order.id}')">📞 ติดต่อเจ้าหนี้</button>
            </div>
        </div>
    `;
    
    return card;
}

async function confirmStep(orderId, nextStep) {
    const order = sampleOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const stepText = ['', 'วางเงินประกัน', 'รอการติดต่อ', 'ยืนยันรับ/ส่งรถ', 'สำเร็จ'];
    
    if (nextStep === 1) {
        // Confirm deposit
        const confirmed = confirm('💳 ยืนยัน วางเงินประกัน 1,500 บาท หรือไม่?');
        if (!confirmed) return;
    } else if (nextStep === 2) {
        // Agent contact confirmation
        alert('📞 ติดต่อเจ้าหนี้แล้ว\n\nกำลังส่งข้อมูลของคุณไปยังเจ้าหนี้');
    } else if (nextStep === 3) {
        // Vehicle confirmation
        alert('🚗 ยืนยันการส่ง/รับรถแล้ว\n\nรถของคุณพร้อมให้บริการเลย');
    } else if (nextStep === 4) {
        // Complete
        alert('✅ คำสั่งซื้อสำเร็จแล้ว!\n\nข้อมูลจะบันทึกไปยังประวัติการเช่า');
    }
    
    // Try to update via API
    try {
        const response = await orderAPI.updateStep(orderId, nextStep);
        if (response.success) {
            // Update local data
            updateOrderStep(orderId, nextStep);
        } else {
            updateOrderStep(orderId, nextStep);
        }
    } catch (error) {
        console.log('API not available, updating locally');
        updateOrderStep(orderId, nextStep);
    }
}

function updateOrderStep(orderId, nextStep) {
    const order = sampleOrders.find(o => o.id === orderId);
    if (!order) return;
    
    order.currentStep = nextStep;
    order.timeline.forEach(item => {
        if (item.step < nextStep) {
            item.status = 'completed';
        } else if (item.step === nextStep) {
            item.status = 'active';
            item.time = getCurrentTime();
        } else {
            item.status = 'pending';
        }
    });
    
    if (nextStep === 4) {
        // Move to history after completion
        moveToHistory(order);
    }
    
    renderOrders();
}

async function moveToHistory(order) {
    const historyData = {
        id: 'RH' + Date.now(),
        vehicle: order.vehicle,
        pickupDate: order.pickupDate,
        dropoffDate: order.dropoffDate,
        pickupLocation: order.pickupLocation,
        dropoffLocation: order.dropoffLocation,
        totalPrice: order.totalPrice,
        status: 'completed',
        bookingDate: new Date().toISOString().split('T')[0],
        duration: Math.abs((new Date(order.dropoffDate) - new Date(order.pickupDate)) / (1000 * 60 * 60 * 24))
    };
    
    try {
        const response = await historyAPI.addHistory(historyData);
        if (response.success) {
            console.log('Order moved to history');
        }
    } catch (error) {
        console.log('API not available, saving history locally');
        const history = JSON.parse(localStorage.getItem('rentalHistory')) || [];
        history.push(historyData);
        localStorage.setItem('rentalHistory', JSON.stringify(history));
    }
}

function contactSupport(orderId) {
    const order = sampleOrders.find(o => o.id === orderId);
    if (!order) return;
    
    alert(`📞 ติดต่อเจ้าหนี้\n\nเบอร์โทร: 02-XXXXX-X\nอีเมล: support@carrental.com\n\nคำสั่งซื้อของคุณ: ${order.id}\nรถที่จอง: ${order.vehicle}`);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} น.`;
}