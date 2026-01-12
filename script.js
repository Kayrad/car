import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, get, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Config เดิมของคุณ
const firebaseConfig = {
    apiKey: "AIzaSyAhDNQrGffZhb5Y_ZMKcB5vK8q7I1gU2Rk",
    authDomain: "bookingcarrf.firebaseapp.com",
    projectId: "bookingcarrf",
    storageBucket: "bookingcarrf.firebasestorage.app",
    messagingSenderId: "438250066454",
    appId: "1:438250066454:web:cd3cdf7fcdbf8b8f8f5b37",
    databaseURL: "https://bookingcarrf-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const bookingsRef = ref(database, 'bookings');

let allBookings = [];
const modal = document.getElementById('actionModal');

// 1. ตั้งค่าปฏิทิน (FullCalendar)
const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    locale: 'th',
    height: 'auto',
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    
    // ส่วนที่แก้ไข: เมื่อคลิกที่วันที่
    dateClick: (info) => {
        const selectedCar = document.getElementById('carSelect').value;
        
        // ตรวจสอบว่าในวันที่คลิก มีรายการที่ "จองแล้ว" (สีแดง/pending) อยู่หรือไม่
        const isBusy = allBookings.some(b => 
            b.car === selectedCar && 
            b.date === info.dateStr && 
            b.status !== 'completed'
        );
        
        // ถ้าไม่ว่าง (isBusy เป็นจริง) ให้ "จบการทำงานทันที" ไม่ต้องเด้ง Popup หรือ Alert
        if (isBusy) return; 

        // ถ้าว่าง ถึงจะเรียกเปิดหน้าต่างจองรถ
        openBookingModal(info.dateStr);
    },
    
    // ส่วนที่แก้ไข: เมื่อคลิกที่ "แถบสี" (จองแล้ว/เสร็จแล้ว)
    eventClick: (info) => openManageModal(info.event),
    events: []
});
calendar.render();

// 2. ฟังก์ชันกรองข้อมูลและแสดงผล (คงเดิม)
onValue(bookingsRef, (snapshot) => {
    allBookings = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        allBookings = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    }
    updateCalendar();
});

function updateCalendar() {
    const selectedCar = document.getElementById('carSelect').value;
    const events = allBookings
        .filter(b => b.car === selectedCar)
        .map(b => ({
            id: b.id,
            title: `${b.status === 'completed' ? '✅' : '❌'} ${b.user}`,
            start: b.date,
            className: b.status === 'completed' ? 'event-completed' : 'event-pending',
            extendedProps: { user: b.user, reason: b.reason, status: b.status || 'pending' }
        }));
    calendar.removeAllEvents();
    calendar.addEventSource(events);
}

// 3. ฟังก์ชันเปิดหน้าต่างจองรถ (ลบส่วน Alert ที่ซ้ำซ้อนออก)
function openBookingModal(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return alert("ไม่สามารถจองย้อนหลังได้");

    const currentCar = document.getElementById('carSelect').value;
    document.getElementById('modalTitle').innerText = `จอง ${currentCar}\nวันที่ ${dateStr}`;
    document.getElementById('modalBody').innerHTML = `
        <input type="text" id="userName" placeholder="ชื่อผู้จอง">
        <textarea id="bookingReason" placeholder="ไปที่ไหน / ธุระอะไร"></textarea>
        <div class="btn-group-vertical">
            <button class="btn btn-confirm" onclick="confirmBooking('${dateStr}')">ยืนยันการจอง</button>
            <button class="btn btn-cancel" onclick="closeModal()">ปิดหน้าต่าง</button>
        </div>
    `;
    modal.style.display = 'block';
}

// 4. ฟังก์ชันเปิดหน้าต่างจัดการ (ยกเลิก หรือ ใช้งานเสร็จ)
function openManageModal(event) {
    const status = event.extendedProps.status;
    document.getElementById('modalTitle').innerText = `จัดการการจอง: ${event.extendedProps.user}`;
    
    let actionButtons = '';
    if (status === 'pending') {
        actionButtons = `
            <button class="btn btn-success" onclick="completeBooking('${event.id}')">ใช้งานเสร็จแล้ว (รถว่าง)</button>
            <button class="btn btn-delete" onclick="deleteBooking('${event.id}')">ยกเลิกการจอง</button>
        `;
    } else {
        actionButtons = `
            <p style="color:#27ae60; margin-bottom:15px; font-weight:bold;">ใช้งานเสร็จสิ้นแล้ว ✅</p>
            <button class="btn btn-delete" onclick="deleteBooking('${event.id}')">ลบประวัติ</button>
        `;
    }

    document.getElementById('modalBody').innerHTML = `
        <div class="btn-group-vertical">
            ${actionButtons}
            <button class="btn btn-cancel" onclick="closeModal()">กลับ</button>
        </div>
    `;
    modal.style.display = 'block';
}

// 5. ระบบบันทึก และ จัดการสถานะ
window.confirmBooking = async (date) => {
    const name = document.getElementById('userName').value.trim();
    if (!name) return alert("กรุณาใส่ชื่อ");
    await push(bookingsRef, {
        car: document.getElementById('carSelect').value,
        user: name,
        reason: document.getElementById('bookingReason').value.trim(),
        date: date,
        status: 'pending',
        createdAt: Date.now()
    });
    closeModal();
};

window.completeBooking = async (id) => {
    if (confirm("ยืนยันว่าใช้งานเสร็จแล้ว?")) {
        await update(ref(database, `bookings/${id}`), { status: 'completed' });
        closeModal();
    }
};

window.deleteBooking = async (id) => {
    if (confirm("ยืนยันการลบรายการนี้?")) {
        await remove(ref(database, `bookings/${id}`));
        closeModal();
    }
};

window.closeModal = () => modal.style.display = 'none';
window.selectCar = (carName, element) => {
    document.querySelectorAll('.car-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('carSelect').value = carName;
    updateCalendar();
};