import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// !!! สำคัญ: นำ Config จาก Firebase Console ของคุณมาวางตรงนี้ !!!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const bookingsRef = ref(database, 'bookings');

// ตั้งค่าให้เลือกวันที่ย้อนหลังไม่ได้
document.getElementById('bookingDate').setAttribute('min', new Date().toISOString().split('T')[0]);

// ฟังก์ชันหลักในการจอง
window.addBooking = async function() {
    const car = document.getElementById('carSelect').value;
    const name = document.getElementById('userName').value;
    const date = document.getElementById('bookingDate').value;

    if (!name || !date) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    try {
        // 1. เช็คข้อมูลใน Database ว่าซ้ำไหม
        const snapshot = await get(bookingsRef);
        let isConflict = false;

        if (snapshot.exists()) {
            const data = snapshot.val();
            for (let id in data) {
                if (data[id].car === car && data[id].date === date) {
                    isConflict = true;
                    break;
                }
            }
        }

        if (isConflict) {
            alert(`ขออภัย! ${car} ถูกจองแล้วในวันที่ ${date}`);
            return;
        }

        // 2. ถ้าไม่ซ้ำ ให้บันทึกข้อมูล
        await push(bookingsRef, {
            car: car,
            user: name,
            date: date,
            createdAt: Date.now()
        });

        alert("จองสำเร็จเรียบร้อย!");
        document.getElementById('userName').value = "";
    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
}

// โหลดข้อมูลแสดงผลแบบ Real-time
onValue(bookingsRef, (snapshot) => {
    const listElement = document.getElementById('bookingList');
    listElement.innerHTML = "";
    
    if (!snapshot.exists()) {
        listElement.innerHTML = "<p style='text-align:center; color:#999;'>ยังไม่มีการจอง</p>";
        return;
    }

    const data = snapshot.val();
    // เรียงลำดับตามวันที่ (ใหม่ไปเก่า)
    const sortedBookings = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedBookings.forEach(item => {
        const div = document.createElement('div');
        div.className = 'booking-item';
        div.setAttribute('data-car', item.car);
        div.innerHTML = `
            <div class="item-info">
                <b>${item.car}</b>
                <span>ผู้จอง: ${item.user}</span>
            </div>
            <div class="item-date">${item.date}</div>
        `;
        listElement.appendChild(div);
    });
});