# ITGC-No-Pap Project Handover & Architecture Document (v1.0-20260726)

## 📌 Project Overview
**System Name**: IT Management & COSO-ITGC Compliance System (Paperless System for IPO Audit Readiness)  
**Version**: `v1.0-20260726`  
**Repository Path**: `c:\Antigravity_Data\ITGC-No-Pap`  
**GitHub Repo**: `https://github.com/pingly69/ITGC-No-Pap.git`  
**Deploy URL (GitHub Pages)**: `https://pingly69.github.io/ITGC-No-Pap/`  

---

## 🔑 Key Configuration & Accounts
- **Google Apps Script (GAS) Project ID**: `1evgFH-0QQnfSU9gtEdGblAHnbd6tINu_bgrUYceItAWjueS8vaYi_ayh` (Title: `ITGC-No-Pap-Project`)
- **GAS Web App URL**: `https://script.google.com/macros/s/AKfycbyeUY4upddRnpBFINCAKMhWqe1uWkyg3mJJCGn0oHSKLzTtZsoV69WeloDQKSx03PeVaw/exec`
- **Google Spreadsheet ID**: `1dSMm3AT5_ge08BvNCD5gUpZGt9L62wVmfYLbOST9FXY`
- **LINE LIFF ID**: `2009016720-0Df5GB2w` (URL: `https://liff.line.me/2009016720-0Df5GB2w`)
- **PDF Drive Folder ID**: `1z8iZy6wXtGRvVN-55bEFSxOAzoQPOHN4`
- **Upload Attachment Folder ID**: `1zvFM2hDHBdS_BClm3Fo4cTl0ak-zcJUf`

---

## 🛠️ System Architecture & File Structure

```
c:\Antigravity_Data\ITGC-No-Pap\
├── index.html                   # SPA HTML Shell (Navbar, Sidebar, Flatpickr & LIFF scripts)
├── assets/
│   ├── css/
│   │   └── style.css            # Custom Navy Blue Theme, Responsive Cards & Flatpickr z-index
│   └── js/
│       ├── app.js               # SPA Router, Dynamic Script Loader & Step-1 LIFF SSO Init
│       └── clientUtils.js       # apiFetch, Flatpickr initDatePicker (d/m/Y), formatDateThai
├── views/                       # SPA Views (Form 1.1 to Form 8.1)
│   ├── Form_1_1.html            # UAR Request Entry (Auto-populate Emp, Roles & VPN Access)
│   ├── Form_1_2.html            # UAR Approve Deep Link (Strict Emp_Code matching)
│   ├── Form_1_3.html            # Access Review Form
│   ├── Form_2_1.html            # Asset Movement (Date + Time Picker, aligned Move_DateTime)
│   ├── Form_2_2.html            # Asset Destroy Form (Image upload)
│   ├── Form_3_1.html            # Outsource Contract Mgmt (Modal with Flatpickr, PDF link preservation)
│   ├── Form_4_1.html            # Change Request (Newest-first sort, Search toolbar, 20-per-page Pagination)
│   ├── Form_4_3.html            # UAT Sign-off Deep Link
│   ├── Form_4_4.html            # Production Deployment Form
│   ├── Form_5_1.html            # Daily Backup Log Form
│   ├── Form_5_2.html            # Recovery Test Log Form
│   ├── Form_6_1.html            # DRP Test Log Entry
│   ├── Form_6_2.html            # Approve DRP Test Deep Link
│   ├── Form_7_1.html            # Server Room Access Request Form
│   ├── Form_7_2.html            # Approve Server Room Deep Link
│   └── Form_8_1.html            # IT Notify Message Board
├── Code.js                      # Main Backend REST API Router & JSON Response Handlers
├── config.js                    # System Configurations, Sheet Names, Google Doc Template IDs
├── Utils.js                     # Spreadsheet CRUD, LockService, SaveFile & PDF Generators
├── SetupDB.js                   # 15-Sheet Database Auto-Initializer & Master Seed Generator
├── Mod_AccessControl.js         # UAR & Access Review Logic
├── Mod_ITAsset.js               # Asset Movement & Destroy Logic
├── Mod_Outsource.js             # Contract Management Logic
├── Mod_ChangeMgmt.js            # Change Request & UAT Sign-off Logic
├── Mod_Backup.js                # Backup & Recovery Logic
├── Mod_DRP.js                   # DRP Emergency Test Logic
├── Mod_PhysicalSecurity.js      # Server Room Access Control Logic
└── Mod_Notify.js                # System Notification Board Logic
```

---

## ⚡ Important Business Logic & Rules Enforced

1. **Strict COSO-ITGC Authorization**:
   - **No IT Admin Bypasses**: Route B Deep Links (Form 1.2 UAR Approve, Form 4.3 UAT Sign-off) strictly enforce case-insensitive trimmed `Emp_Code` matching.
2. **LINE LIFF SSO Optimization**:
   - `liff.init({ liffId })` runs as Step 1 in `initApp()`.
   - Utilizes `localStorage` caching (`ITGC_LINE_UID`) and a 2.5-second `Promise.race` timeout to prevent hanging on initial open in LINE In-App Webview.
3. **Date & Time Standards**:
   - UI Display: **`dd/MM/yyyy`** (UK/Thai format) via Flatpickr `altFormat: "d/m/Y"`.
   - Backend Database (`21_Asset_Movement`, `11_Access_Request`, etc.): **`YYYY-MM-DD HH:mm:ss`** (ISO Timestamp) to ensure seamless sorting, filtering, and Dashboard reporting.
   - Handover/Resignation Date: Form 1.1 `Handover_Date` + `Handover_Time` is set as `Req_Date` and saved directly as `Move_DateTime` in `21_Asset_Movement` upon approval.
4. **Form 4.1 Scalability & UX**:
   - Sorted Newest-First.
   - Real-time search keyword toolbar + Status Filter.
   - Client-side Pagination (20, 50, 100, All items per page) for handling 1,000+ items with zero lag.

---

## 📝 Pending Work / Next Step
- **PDF Templates Customization**: Fine-tuning Google Doc Template Layouts for Form 1.2, Form 1.3, Form 5.2, Form 6.2, and Form 7.2.
