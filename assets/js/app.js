/**
 * app.js - Single Page Application (SPA) Router & Application Shell
 * IT Management & COSO-ITGC Compliance System
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App Initializing...');
  await initApp();
});

async function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const form = urlParams.get('form');
  const reqId = urlParams.get('req_id');

  // ==========================================
  // STEP 1: INITIALIZE LINE LIFF & SSO (Runs for BOTH Route A and Route B)
  // ==========================================
  let lineUid = localStorage.getItem('ITGC_LINE_UID');
  let lineProfileName = localStorage.getItem('ITGC_LINE_NAME');

  if (typeof liff !== 'undefined' && typeof LIFF_ID !== 'undefined' && LIFF_ID && LIFF_ID !== 'YOUR_LIFF_ID_HERE') {
    try {
      await liff.init({ liffId: LIFF_ID });
      if (liff.isLoggedIn()) {
        // หากยังไม่มี Line_UID ใน localStorage ให้ดึง Profile จาก LIFF พร้อม Timeout 2.5 วินาทีเพื่อป้องกัน LINE App ค้าง
        if (!lineUid) {
          try {
            const profile = await Promise.race([
              liff.getProfile(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('LIFF Profile fetch timeout')), 2500))
            ]);
            lineUid = profile.userId;
            lineProfileName = profile.displayName;
            localStorage.setItem('ITGC_LINE_UID', lineUid);
            localStorage.setItem('ITGC_LINE_NAME', lineProfileName);
          } catch (pErr) {
            console.warn('Could not fetch LIFF profile within timeout:', pErr);
          }
        }
      } else {
        liff.login();
        return;
      }
    } catch (liffErr) {
      console.warn('LIFF Init warning:', liffErr);
    }
  }

  // Fallback สำหรับการทดสอบในเครื่องหากเปิดแบบ Local Dev
  if (!lineUid) {
    lineUid = localStorage.getItem('ITGC_LINE_UID') || 'UID_DEV_IT_001';
    lineProfileName = localStorage.getItem('ITGC_LINE_NAME') || 'IT Admin Dev';
    localStorage.setItem('ITGC_LINE_UID', lineUid);
    localStorage.setItem('ITGC_LINE_NAME', lineProfileName);
  }

  const userDisplayNameElem = document.getElementById('user-display-name');
  if (userDisplayNameElem) {
    userDisplayNameElem.innerText = lineProfileName || 'IT Staff';
  }

  // ==========================================
  // STEP 2: ROUTE B - Deep Link Approval Screens (?action=approve)
  // ==========================================
  if (action === 'approve') {
    document.body.classList.add('deeplink-mode');

    // ซ่อน Sidebar
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.style.display = 'none';

    // โหลดหน้าจอตามแบบฟอร์ม Deep Link
    let targetView = '';
    if (form === '1_2') targetView = 'Form_1_2.html';
    else if (form === '4_3') targetView = 'Form_4_3.html';
    else if (form === '6_2') targetView = 'Form_6_2.html';
    else if (form === '7_2') targetView = 'Form_7_2.html';
    else {
      showAlert('ข้อผิดพลาด', 'ไม่พบรูปแบบฟอร์ม Deep Link ที่ระบุ', 'error');
      return;
    }

    await loadView(targetView, { reqId: reqId, isDeepLink: true });
    return;
  }

  // ==========================================
  // STEP 3: ROUTE A - Main Menu & SPA Router
  // ==========================================
  // Form 7.1 (Public Access check)
  if (form === '7_1') {
    await loadView('Form_7_1.html', { isPublic: true });
    return;
  }

  // ดึงสิทธิ์ User Profile จาก Backend
  let userProfile;
  try {
    userProfile = await apiFetch('get_user_profile', { lineUid: lineUid });
    window.CURRENT_USER_PROFILE = userProfile;
  } catch (authErr) {
    Swal.fire({
      title: 'ไม่อนุญาตให้เข้าถึงระบบ',
      html: `
        <p class="text-danger fw-bold">${authErr.message}</p>
        <hr>
        <p class="text-start mb-1"><small>Line_UID ของคุณในขณะนี้คือ:</small></p>
        <div class="input-group mb-3">
          <input type="text" class="form-control" value="${lineUid}" id="my-line-uid-input" readonly>
          <button class="btn btn-outline-primary" onclick="navigator.clipboard.writeText('${lineUid}'); alert('คัดลอก Line_UID แล้ว');">Copy</button>
        </div>
        <p class="text-start text-muted mb-0"><small>กรุณานำ Line_UID นี้ไปเพิ่มใน Sheet <strong>01_Users_Profile</strong> แล้วกดปุ่มลองอีกครั้งครับ</small></p>
      `,
      icon: 'warning',
      allowOutsideClick: false,
      confirmButtonText: 'ลองอีกครั้ง'
    }).then(() => {
      window.location.reload();
    });
    return;
  }

  // Render Menu ตามสิทธิ์ Scr_xx
  renderSidebarMenu(userProfile);

  // โหลดหน้าแรก หรือฟอร์มที่ระบุ
  const defaultForm = form ? `Form_${form}.html` : 'Form_1_1.html';
  await loadView(defaultForm);
}

/**
 * Render Sidebar Menu ตามสิทธิ์ Scr_xx
 */
function renderSidebarMenu(profile) {
  const container = document.getElementById('sidebar-menu-list');
  if (!container) return;

  const menuItems = [
    { cat: 'Data Access Control', items: [
      { scr: 'Scr_01', name: 'Form 1.1: UAR Request', view: 'Form_1_1.html', icon: 'bi-person-plus' },
      { scr: 'Scr_03', name: 'Form 1.3: Access Review', view: 'Form_1_3.html', icon: 'bi-shield-check' }
    ]},
    { cat: 'IT Asset Management', items: [
      { scr: 'Scr_04', name: 'Form 2.1: Asset Movement', view: 'Form_2_1.html', icon: 'bi-box-arrow-right' },
      { scr: 'Scr_05', name: 'Form 2.2: Asset Destroy', view: 'Form_2_2.html', icon: 'bi-trash' }
    ]},
    { cat: 'Outsourcing Control', items: [
      { scr: 'Scr_06', name: 'Form 3.1: Contract Mgmt', view: 'Form_3_1.html', icon: 'bi-file-earmark-text' }
    ]},
    { cat: 'Change & Helpdesk', items: [
      { scr: 'Scr_07', name: 'Form 4.1: Change Request', view: 'Form_4_1.html', icon: 'bi-tools' },
      { scr: 'Scr_10', name: 'Form 4.4: Deploy Sign-off', view: 'Form_4_4.html', icon: 'bi-cloud-upload' }
    ]},
    { cat: 'Backup & Recovery', items: [
      { scr: 'Scr_11', name: 'Form 5.1: Backup Log', view: 'Form_5_1.html', icon: 'bi-hdd' },
      { scr: 'Scr_12', name: 'Form 5.2: Recovery Test', view: 'Form_5_2.html', icon: 'bi-arrow-clockwise' }
    ]},
    { cat: 'BCP & DRP', items: [
      { scr: 'Scr_13', name: 'Form 6.1: DRP Test Log', view: 'Form_6_1.html', icon: 'bi-activity' }
    ]},
    { cat: 'Physical Security', items: [
      { scr: 'public', name: 'Form 7.1: Server Room Access', view: 'Form_7_1.html', icon: 'bi-door-open' }
    ]},
    { cat: 'Notifications', items: [
      { scr: 'Scr_17', name: 'Form 8.1: Notify Board', view: 'Form_8_1.html', icon: 'bi-bell' }
    ]}
  ];

  let html = '';

  menuItems.forEach(group => {
    let groupHtml = `<div class="nav-category">${group.cat}</div>`;
    let count = 0;

    group.items.forEach(item => {
      const isAllowed = item.scr === 'public' || String(profile[item.scr]).toLowerCase() === 'yes' || String(profile[item.scr]).toLowerCase() === 'true';
      if (isAllowed) {
        count++;
        groupHtml += `
          <button class="nav-item-btn" onclick="loadView('${item.view}')" id="btn-nav-${item.view.replace('.html', '')}">
            <i class="bi ${item.icon}"></i>
            <span>${item.name}</span>
          </button>
        `;
      }
    });

    if (count > 0) {
      html += groupHtml;
    }
  });

  container.innerHTML = html;
}

/**
 * โหลด View HTML มาวางใน #view-container (SPA Behavior)
 */
async function loadView(viewName, params = {}) {
  try {
    showLoading();

    // Highlight active nav item
    document.querySelectorAll('.nav-item-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-nav-${viewName.replace('.html', '')}`);
    if (activeBtn) activeBtn.classList.add('active');

    const response = await fetch(`views/${viewName}`);
    if (!response.ok) throw new Error(`Could not load view file: views/${viewName}`);

    const htmlContent = await response.text();
    const container = document.getElementById('view-container');

    // Parse HTML and extract script tags so they execute properly in SPA
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const scriptElements = Array.from(tempDiv.querySelectorAll('script'));
    scriptElements.forEach(s => s.remove());

    container.innerHTML = tempDiv.innerHTML;

    // Append and execute scripts in global scope
    scriptElements.forEach(s => {
      const newScript = document.createElement('script');
      if (s.src) {
        newScript.src = s.src;
      } else {
        newScript.textContent = s.textContent;
      }
      document.body.appendChild(newScript);
      newScript.remove();
    });

    hideLoading();

    // Trigger Init Function ใน View แต่ละตัว (ถ้ามี)
    const initFuncName = `init_${viewName.replace('.html', '')}`;
    if (typeof window[initFuncName] === 'function') {
      window[initFuncName](params);
    }

  } catch (err) {
    hideLoading();
    console.error('Error loading view:', err);
    showAlert('เกิดข้อผิดพลาด', `ไม่สามารถโหลดหน้าจอ ${viewName} ได้`, 'error');
  }
}
