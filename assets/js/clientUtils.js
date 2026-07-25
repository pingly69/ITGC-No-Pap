/**
 * clientUtils.js - Client-side Helper Utilities & API Communication
 * IT Management & COSO-ITGC Compliance System
 */

// URL ของ GAS Web App (ปรับแต่งหลังจาก Deploy GAS Web App เป็น Executive: Me / Anyone)
let GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyeUY4upddRnpBFINCAKMhWqe1uWkyg3mJJCGn0oHSKLzTtZsoV69WeloDQKSx03PeVaw/exec';

// LINE LIFF ID
let LIFF_ID = '2009016720-0Df5GB2w';

/**
 * เรียกใช้ GAS Web App REST API ผ่าน Fetch API (ส่งแบบ text/plain ป้องกัน Preflight OPTIONS)
 */
async function apiFetch(action, payload = {}) {
  try {
    showLoading();

    // ดึง Line_UID จาก LocalStorage หรือ Mock
    const lineUid = localStorage.getItem('ITGC_LINE_UID') || 'UID_DEFAULT_DEV';

    const requestData = {
      action: action,
      lineUid: lineUid,
      ...payload
    };

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    hideLoading();

    if (result.status === 'error') {
      throw new Error(result.message || 'API Execution Error');
    }

    return result.data;
  } catch (error) {
    hideLoading();
    console.error('API Error:', error);
    showAlert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    throw error;
  }
}

/**
 * ฟอร์แมตวันที่ UTC+7 เป็น ค.ศ. dd/MM/yyyy
 */
function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear(); // ค.ศ.

  return `${day}/${month}/${year}`;
}

/**
 * ฟอร์แมตวันที่และเวลา UTC+7 เป็น ค.ศ. dd/MM/yyyy HH:mm:ss
 */
function formatDateTimeThai(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear(); // ค.ศ.
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * แสดง Loading Overlay
 */
function showLoading() {
  const el = document.getElementById('global-spinner');
  if (el) el.classList.remove('d-none');
}

/**
 * ซ่อน Loading Overlay
 */
function hideLoading() {
  const el = document.getElementById('global-spinner');
  if (el) el.classList.add('d-none');
}

/**
 * แสดง SweetAlert2 Alert
 */
function showAlert(title, text, icon = 'info') {
  if (typeof Swal !== 'undefined') {
    return Swal.fire({
      title: title,
      text: text,
      icon: icon,
      confirmButtonColor: '#1E3A8A'
    });
  } else {
    alert(`${title}: ${text}`);
  }
}

/**
 * แปลงไฟล์จาก File Input เป็น Base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
