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

/**
 * แปลงวันที่จากรูปแบบต่างๆ (เช่น ISO string, DD/MM/YYYY)
 * ให้อยู่ในรูปแบบ YYYY-MM-DD สำหรับกำหนดค่าลงใน <input type="date">
 */
function formatDateForInput(dateVal) {
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    dateVal = dateVal.trim();
    if (!dateVal) return '';

    // หากเป็น ISO string เช่น "2026-07-26T00:00:00" หรือ "2026-07-26 00:00:00"
    if (dateVal.includes('T')) {
      return dateVal.split('T')[0];
    }
    if (dateVal.includes(' ')) {
      const part = dateVal.split(' ')[0];
      if (part.match(/^\d{4}-\d{2}-\d{2}$/)) return part;
    }

    // หากเป็น DD/MM/YYYY เช่น "26/07/2026"
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
    }

    // หากเป็น YYYY-MM-DD อยู่แล้ว
    if (dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateVal;
    }
  }

  // พยายามแปลงผ่าน JS Date object
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}
