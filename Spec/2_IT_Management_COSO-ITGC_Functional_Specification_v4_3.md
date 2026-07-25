# **เอกสารข้อกำหนดฟังก์ชันการทำงาน (Functional Specification & Business Logic)**

**Project:** IT Management & COSO-ITGC Compliance System
**Prepared By:** System Analyst & DBA
**Target Audience:** Full Stack Developer Team
**Version:** 4.0 (รวม Deep-Link Approve Screens เข้าเป็นเอกสารเดียว — ไม่มีไฟล์ Add-on แยกอีกต่อไป)

## **🛑 สรุปภาพรวมสำหรับนักพัฒนา (Developer Overview)**

ระบบนี้ประกอบด้วย **1 Web Application (index.html)** ที่ควบคุมการเปลี่ยนหน้าจอด้วย URL Parameter (`?action=...`) ใช้ GAS (Google Apps Script) เป็น Backend แต่ฝาก index.html ไว้ที่ GitHub Pages เพื่อแก้ปัญหา LINE LIFF ติด iframe ให้ออกแบบโปรเจกต์แยกไฟล์ `.gs`/`.html` ตามส่วนงานให้ชัดเจน ไม่รวมเป็นไฟล์เดียวกัน และรวมค่าคงที่ทั้งหมดไว้ที่ `config.gs` จุดเดียว

มีหน้าจอ / แบบฟอร์ม ที่ต้องพัฒนาทั้งหมด **17 หน้าจอ (รวม App Shell)** แบ่งเป็น 2 กลุ่มการเข้าถึง:
- **กลุ่ม A — เข้าผ่านเมนูหลัก** (ต้องเช็คสิทธิ์ Scr_xx ตามปกติ)
- **กลุ่ม B — เข้าผ่าน Deep Link เฉพาะรายการเท่านั้น** ไม่ปรากฏในเมนู ไม่เช็ค Scr_xx และไม่เช็ค Is_Active ของ App Shell เลย (ดูรายละเอียด Auth Pattern ในกฎเหล็กข้อ 4)

| # | ชื่อฟอร์ม | Sheet อ้างอิง | กลุ่มการเข้าถึง |
|---|---|---|---|
| 1 | App Shell — Main Menu & Auth Router | - | - |
| 2 | Form 1.1: UAR (User Access Request) | 11_Access_Request | A |
| 3 | Form 1.2: UAR Approve | 11_Access_Request | **B — Deep Link** |
| 4 | Form 1.3: Access Review | 12_Access_Review | A |
| 5 | Form 2.1: Asset Movement | 21_Asset_Movement | A |
| 6 | Form 2.2: Asset Destroy | 22_Asset_Destroy | A |
| 7 | Form 3.1: Contract Management (CRUD) | 31_Outsource | A |
| 8 | Form 4.1: Change Request (ผู้แจ้ง + IT อัปเดตสถานะ ในหน้าเดียวกัน) | 41_Change_Req | A |
| 9 | Form 4.3: UAT Sign-off | 41_Change_Req | **B — Deep Link** |
| 10 | Form 4.4: Deploy Sign-off | 41_Change_Req | A |
| 11 | Form 5.1: Backup Log | 51_Backup_Log | A |
| 12 | Form 5.2: Recovery Test Log | 52_Recovery_Test | A |
| 13 | Form 6.1: DRP Test Log | 61_DRP_Test | A |
| 14 | Form 6.2: Approve DRP Test | 61_DRP_Test | **B — Deep Link** |
| 15 | Form 7.1: Server Room Access (Request) | 71_ServerRoom | A (แต่เปิด Public ไม่เช็ค Users_Profile) |
| 16 | Form 7.2: Approve Server Room | 71_ServerRoom | **B — Deep Link** |
| 17 | Form 8.1: Clear Notify Message | 04-Notify_message | A |

> **Audit & Compliance Rule (กฎเหล็กสำหรับ Dev):**

1. จัดระบบตัวแปร config ค่าคงที่ต่าง ๆ แยกไฟล์ `.gs` ไว้ต่างหาก ให้ชัดเจนเป็นระบบ เพื่อให้แก้ไขจัดการง่าย
2. ทุก Form ที่มีการกด Submit จะต้องบันทึก Line_UID ของผู้ทำรายการเสมอ (ดึงจาก LIFF)
3. ทุก Form ที่ระบุว่า **"สร้าง PDF"** เมื่อ Submit/Approve สำเร็จ Backend (GAS) ต้องนำข้อมูลไป Replace ค่า `{{field name}}` ใน Template Google Doc แล้วแปลงเป็นไฟล์ PDF เก็บใน Google Drive (Folder ตาม `PDF_FOLDER_ID`) นำ Link มาบันทึกลง Sheet และบันทึก Log เป็น JSON ลงใน Sheet `99_System_Log` เสมอ — รายชื่อ Template ทั้งหมดดูที่ตาราง Mapping ท้ายเอกสาร
4. **[แก้ไขสำคัญ] การตรวจสอบสิทธิ์เข้าถึงหน้าจอ แบ่งเป็น 2 รูปแบบ:**

   **(ก) ฟอร์มกลุ่ม A (เข้าผ่านเมนูหลัก):** ต้องผ่าน App Shell ปกติทุกขั้นตอน — เช็ค Line_UID มีอยู่ใน `01_Users_Profile` และ `Is_Active = Yes` ก่อน แล้วจึงเช็คสิทธิ์ Scr_01–Scr_17 เฉพาะฟอร์มที่จะเข้า
   ยกเว้น **Form 7.1** ที่เปิดให้บุคคลทั่วไปเข้าได้โดยไม่ต้องมีชื่อใน `01_Users_Profile` เลย (Scr_15 จึงเป็นค่าที่ไม่ถูกใช้งานจริง เก็บไว้เฉย ๆ)

   **(ข) ฟอร์มกลุ่ม B (เข้าผ่าน Deep Link เฉพาะรายการ):** **ข้าม App Shell ทั้งหมด** — ไม่เช็ค `Is_Active`, ไม่เช็ค Scr_xx ใด ๆ ทั้งสิ้น ตรวจสอบเฉพาะเงื่อนไขเฉพาะฟอร์มดังนี้เท่านั้น:

   | ฟอร์ม | วิธีตรวจสอบตัวตน |
   |---|---|
   | Form 1.2 | Line_UID ผู้เข้ามา → หา Emp_Code ใน `01_Users_Profile` → ต้องตรงกับ `Emp_Code` ของรายการใน `11_Access_Request` (Req_ID ตาม parameter) |
   | Form 4.3 | Line_UID ผู้เข้ามา → หา Emp_Code ใน `01_Users_Profile` → ต้องตรงกับ `EMP_CODE` ของรายการใน `41_Change_Req` (Req_ID ตาม parameter) |
   | Form 6.2 | Line_UID ผู้เข้ามา → ต้องตรงกับ `Line_UID` ใน `02_Approve_Profile` ของ Profile ที่ระบุไว้ใน `Approve_Profile` ของรายการ `61_DRP_Test` (DRP_ID ตาม parameter) — **ไม่ต้องมีชื่อใน `01_Users_Profile`** |
   | Form 7.2 | Line_UID ผู้เข้ามา → ต้องตรงกับ `Line_UID` ใน `02_Approve_Profile` ของ Profile ที่ระบุไว้ใน `Approve_Profile` ของรายการ `71_ServerRoom` (Log_ID ตาม parameter) — **ไม่ต้องมีชื่อใน `01_Users_Profile`** |

   ถ้าตรวจสอบไม่ผ่านเงื่อนไขเฉพาะฟอร์ม ให้ปฏิเสธการเข้าถึงทันทีด้วย SweetAlert "ไม่พบสิทธิ์เข้าถึงรายการนี้" — เหตุผลที่ออกแบบแบบนี้: เพื่อให้พนักงานที่เพิ่งถูกปรับ `Is_Active=No` (เช่น กรณีลาออก) ยังสามารถกดยืนยัน/รับทราบรายการของตัวเองผ่าน Deep Link ได้ โดยไม่ติด App Shell บล็อกไว้ก่อน

5. **รูปแบบ URL ของ Deep Link:** ให้ใช้ Query String มาตรฐาน คั่นด้วย `&` เท่านั้น (**ห้ามใช้ `?` ซ้ำ**) รูปแบบ:
   ```
   https://<github-pages-domain>/index.html?action=approve&form=1_2&req_id=<Req_ID>
   https://<github-pages-domain>/index.html?action=approve&form=4_3&req_id=<Req_ID>
   https://<github-pages-domain>/index.html?action=approve&form=6_2&req_id=<DRP_ID>
   https://<github-pages-domain>/index.html?action=approve&form=7_2&req_id=<Log_ID>
   ```
   เมื่อเข้าด้วย `action=approve` ให้ Frontend **ซ่อนเมนูหลัก/Sidebar ทั้งหมด** แสดงเฉพาะรายการเดียวตาม `req_id` ที่ระบุ และห้ามมีลิงก์ย้อนกลับไปหน้าอื่นในระบบ (ป้องกันผู้ที่ได้รับลิงก์หลุดเข้าไปเห็นข้อมูลรายการอื่น)
6. **[Audit Trail]:** ทุก Action (Insert/Update/Approve) Backend ต้องนำ Request Payload เก็บเป็น `Raw_JSON` ลงใน Sheet `99_System_Log` เสมอ เพื่อให้ Auditor ใช้สอบทาน
7. Project นี้เป็น project รวมทุกข้อมูล ให้พนักงานฝ่าย IT ใช้งานผ่าน Desktop เป็นหลัก แต่ต้องแสดงผลแบบ Responsive/Mobile ได้ด้วย ในกรณีพนักงาน IT อยู่นอกพื้นที่ — ส่วนที่ยังอยู่นอก Scope รอบนี้ (จะพัฒนาเพิ่มภายหลังเป็นแอปแยกสำหรับผู้ใช้ทั่วไป) คือหน้าจอกรอกคำขอแบบเมนูปกติของ **Form 1.1 และ Form 2.1** (ปัจจุบันให้เจ้าหน้าที่ IT เป็นผู้บันทึกแทนก่อน) — **ส่วน Form 1.2, 4.3, 6.2, 7.2 ไม่ได้อยู่ในข้อยกเว้นนี้แล้ว เพราะทำผ่าน Deep Link ในโปรเจกต์นี้เรียบร้อย ไม่ต้องรอเวอร์ชันหน้า**

## **📝 รายละเอียดฟังก์ชันแต่ละหน้าจอ (Screen Specification)**

### **0. App Shell (หน้าจอหลักและระบบยืนยันตัวตน)**

* **UI/UX:** หน้าจอว่างที่มี Loading Spinner
* **Business Logic:**
  1. เมื่อเปิด `index.html` ตรวจสอบ URL Parameter ก่อน: ถ้ามี `action=approve` ให้ข้ามไปที่ Business Logic ของฟอร์มกลุ่ม B ทันที (ดูกฎเหล็กข้อ 4-ข) โดยไม่ผ่านขั้นตอนที่ 2-3 ด้านล่างนี้เลย
  2. กรณีอื่น ๆ: เรียก `liff.init()` และ `liff.getProfile()` แล้วนำ `userId` ส่งไปเช็คที่ Backend (Sheet: `01_Users_Profile`) ยกเว้น **Form 7.1** ที่เปิดให้ทุกคนเข้าได้โดยไม่ต้องมี Users_Profile
  3. **ถ้าไม่พบ หรือ Active=No:** แสดง SweetAlert "คุณไม่มีสิทธิ์เข้าใช้งาน" และ Block การทำงาน
  4. **ถ้าพบ:** โหลดเมนู (Sidebar/Navbar) แสดงเฉพาะรายการที่ได้รับสิทธิ์ `Scr_xx = Yes` เท่านั้น

### **ระบบที่ 1: Data Access Control (การจัดการสิทธิ์)**

**BOX: Notify** — แสดงข้อความแจ้งเตือนจาก Sheet `04-Notify_message` (เห็นเหมือนกันทุกคนในเวอร์ชันนี้ — ทีม IT เป็นผู้ใช้หลัก future version จะแยกกรองตาม User)

**Form 1.1: UAR (User Access Request)** — เจ้าหน้าที่ IT บันทึกข้อมูลตามที่ได้รับแจ้งจาก Users แล้วส่ง Link Form 1.2 ให้ผู้ขอกดยอมรับต่อไป
*(อ้างอิง Sheet: `11_Access_Request`)*

* **วัตถุประสงค์:** แจ้งพนักงานใหม่ / ลาออก / ขอปรับสิทธิ์
* **UI & Logic:**
  * วันที่: [Auto-fill] วันที่ปัจจุบัน (Read-only), Status = Pending
  * EMP_no, NAME (TH), NAME (EN), แผนก: [Text Input]  กรณี ใส่รหัสพนักงาน แล้วให้ตรวจสอบ ค้นหาและดึงข้อมูลคนนี้(ถ้ามี) ล่าสุด ขึ้นมาแสดง (ส่วนนี้มีปรับแก้ไข ใหม่จาก flowchart ที่แนบไป)
  * ประเภทรายการ: [Radio] ผู้ใช้ใหม่ / ลาออก / แก้ไขสิทธิ์
    * *Condition:* ถ้าเลือก "ผู้ใช้ใหม่/ลาออก" ให้แสดงช่อง "วันที่ส่งมอบ" และ "เวลาที่ส่งมอบ" (บังคับกรอก) 
    * *Condition:* ถ้าเลือก "แก้ไขสิทธิ์" จะเป็นการปรับ Role/365 Users/Computer Name /VPN Yes/No และ Role
  * Role: [Checkbox] MGMT, SALES, PLAN, DESIGN, CONSTRUCTION, PURCHASE, STORE, ACC, FN, HR (เลือกได้มากกว่า 1)
  * 365 Users: [Text Input] กรอก Email
  * COMPUTER NAME: [Dropdown] จาก `03_IT_Asset_Master` เท่านั้น
  * VPN: [Radio] Yes / No
* **Submit Action:** บันทึกลง `11_Access_Request` (Status = Pending) → ระบบ Generate URL Deep Link ของ Form 1.2 ให้ IT copy ส่งต่อให้ผู้ขอ → Insert `04_Notify_message`

---

**Form 1.2: UAR Approve** — เข้าผ่าน **Deep Link เท่านั้น** `?action=approve&form=1_2&req_id=<Req_ID>`
*(อ้างอิง Sheet: `11_Access_Request`)*

* **วัตถุประสงค์:** ให้ **ผู้ใช้ที่เป็นเจ้าของสิทธิ์** (ไม่ใช่ IT) กดยอมรับเงื่อนไขการถือครองเครื่อง/สิทธิ์ที่ IT บันทึกไว้ให้ในฟอร์ม 1.1
* **Auth (ดูรายละเอียดในกฎเหล็กข้อ 4-ข):** เช็คเฉพาะ Emp_Code ของ Line_UID ผู้เข้ามา (จาก `01_Users_Profile`) ต้องตรงกับ Emp_Code ของรายการ ไม่เช็คเงื่อนไขอื่น
* **UI & Logic:**
  * แสดงรายการที่ Status = Pending เท่านั้น (ถ้า Status ไม่ใช่ Pending ให้แสดงข้อความ "รายการนี้ถูกดำเนินการไปแล้ว" แบบ Read-only)
  * แสดงข้อมูลจาก Form 1.1 ทั้งหมดแบบ Read-only
  * **[สำคัญ]** Checkbox "ยอมรับเงื่อนไขการถือครองสิทธิ์การใช้งานและอุปกรณ์ และรับผิดชอบต่อสิทธิ์ในการเข้าถึงข้อมูลขององค์กร" (บังคับติ๊กก่อน Submit)
  * ปุ่ม "Approve" (ยอมรับ) และ "Reject" (ไม่ยอมรับ)
* **Submit Action:**
  * ถ้ากด **Approve** → บันทึก `Approve_LineUID` → สั่ง Backend สร้าง PDF (Template: `FORM_UAR_APPROVE_DOC_ID`) → บันทึก `PDF_Link` → **สร้างรายการใน `21_Asset_Movement`** โดยใช้ข้อมูลจากใบคำขอนี้ (Doc_Type = **2-รับมอบ** ถ้า Req_Type = ผู้ใช้ใหม่, Doc_Type = **1-ส่งคืน** ถ้า Req_Type = ลาออก) — **ยกเว้นกรณี Req_Type = แก้ไขสิทธิ์ ไม่ต้องสร้างรายการใน 21_Asset_Movement**
  * ถ้ากด **Reject** → ปรับ `Req_Status = Rejected` เท่านั้น จบขั้นตอน ไม่มีการสร้าง PDF หรือ Asset Movement
  * ทั้งสองกรณี → Insert `04_Notify_message` แจ้งเตือนว่ามีรายการ UAR: รหัสพนักงาน / ชื่อ / Status

---

**Form 1.3: Access Review** — สำหรับบันทึกทบทวนสิทธิ์ (ประจำปี)
*(อ้างอิง Sheet: `12_Access_Review`)*

* **วัตถุประสงค์:** ตรวจสอบว่าเครื่องคอมพิวเตอร์นั้น ๆ ใครถือครอง และมีสิทธิ์อะไรบ้างตรงกับปัจจุบันหรือไม่
* **UI & Logic (ห้ามคีย์เองเด็ดขาด):**
  * COMPUTER NAME: [Autocomplete/Dropdown]
  * **[Auto Fetch Logic]** เมื่อเลือกชื่อเครื่อง:
    1. หา record ล่าสุดสถานะ "รับมอบ" ใน `21_Asset_Movement` → ได้รหัส/ชื่อพนักงาน (Read-only)
    2. หา `11_Access_Request` ล่าสุดที่ `Req_Status=Approved` ของพนักงานคนนั้น → แสดง Role/O365 Email (Read-only)
  * หมายเหตุ: [Text Area], ผลการตรวจสอบ: [Radio] ผ่าน/ไม่ผ่าน
* **Submit Action:** บันทึกลง `12_Access_Review` → สั่ง Backend สร้าง PDF (Template: `FORM_ACCESS_REVIEW_DOC_ID`)

### **ระบบที่ 2: IT-Asset (การบริหารจัดการทรัพย์สิน)**

**Form 2.1: Asset Movement (บันทึกโอนย้าย)** — ในทางปฏิบัติให้ทาง IT บันทึกแทนผู้ใช้
*(อ้างอิง Sheet: `21_Asset_Movement`)*

* **วัตถุประสงค์:** บันทึกการเปลี่ยนมือผู้ถือครองเครื่อง (สำคัญมากสำหรับ Audit)
* **UI & Logic:**
  * ประเภทเอกสาร: [Radio] 1-ส่งคืน / 2-รับมอบ
  * Computer Name: [Dropdown] จาก `03_IT_Asset_Master`
  * รหัสพนักงาน, ชื่อพนักงาน, TEL: [Auto-fill] ดึงจาก LIFF Profile ของผู้เปิดฟอร์ม (แก้ไขได้ กรณีคีย์แทนคนอื่น)
  * วันที่โอนย้าย, เวลา: [Auto-fill] ปัจจุบัน (Move_DateTime)
  * หมายเหตุ: [Text Area]
* **Submit Action:** บันทึกลง `21_Asset_Movement` โดยตรง — **ไม่มีขั้นตอนอนุมัติ และไม่มีการสร้าง PDF** (ตัดสินใจแล้วว่าไม่จำเป็น เพราะรายการที่สำคัญ (ผู้ใช้ใหม่/ลาออก) ถูกสร้างมาจาก Form 1.2 อยู่แล้วซึ่งมี PDF เป็นหลักฐานรองรับเพียงพอ — Form 2.1 ใช้สำหรับกรณีบันทึกโอนย้ายเพิ่มเติมนอกเหนือจาก Flow ปกติเท่านั้น)

**Form 2.2: Asset Destroy (ขอทำลายสื่อบันทึกข้อมูล)**
*(อ้างอิง Sheet: `22_Asset_Destroy`)*

* **วัตถุประสงค์:** บันทึกประวัติการทำลายพร้อมหลักฐาน
* **UI & Logic:** วันที่: [Auto-fill], หมายเหตุ: [Text Area], แนบภาพประกอบ: [File Input]
* **Submit Action:** แปลงไฟล์ภาพเป็น Base64 → บันทึกลง Google Drive (`UPLOAD_FOLDER_ID`) → นำ URL กลับมาบันทึกใน Sheet

### **ระบบที่ 3: Outsourcing Control (การควบคุมสัญญา)**

**Form 3.1: Contract Management**
*(อ้างอิง Sheet: `31_Outsource`)*

* **วัตถุประสงค์:** เก็บข้อมูลสัญญา (แบบซื้อขาด/รายปี)
* **UI & Logic:** หน้าจอ CRUD Data Table — ปุ่ม "เพิ่มรายการ"/"แก้ไข"/"ลบ"
  * ฟิลด์: ชื่อผู้ให้บริการ, เลขที่สัญญา, Subject, วันที่เริ่ม-สิ้นสุด, งบประมาณ, เบอร์, Email, ผู้ประสานงาน
  * รูปแบบสัญญา: [Dropdown] รายปี/รายเดือน/on-Demand
  * เอกสารสัญญา: [File Input] อัปโหลด PDF
* **Submit Action:** *Audit Rule:* กด "ลบ" ห้าม Delete จริง ให้ Soft Delete (`Is_Active = False`)

### **ระบบที่ 4: Change Management & Helpdesk**

*ระบบนี้ 1 Transaction วิ่งผ่านสถานะ (New → Process → UAT → UAT-Approved → Deployed / Cancel) เก็บที่ Sheet `41_Change_Req`*

**Form 4.1: Change Request** — ใช้ 1 หน้าจอร่วมกัน 2 บทบาท:
1. **ผู้แจ้ง/IT รับแจ้งปัญหา** กรอกส่วนต้น (เปิด Ticket ใหม่)
2. **IT ผู้ดำเนินการ** เปิด Ticket เดิมกลับมาแก้ไขส่วนแผนงาน + ปรับสถานะ

*(อ้างอิง Sheet: `41_Change_Req`)*

* **วัตถุประสงค์:** เปิด Ticket แจ้งปัญหาการใช้งาน หรือแจ้งเปลี่ยน Config ระบบ และให้ IT อัปเดตความคืบหน้าในหน้าเดียวกัน
* **UI & Logic (ส่วนเปิด Ticket — กรอกได้ทุกคนที่มีสิทธิ์ Scr_07):**
  * ประเภทรายการ: [Radio/Dropdown] 1. แจ้งปัญหา (Incident) / 2. ขอเปลี่ยนระบบ (Change)
  * เรื่อง, รายละเอียด: [Text Area]
  * ความสำคัญ: [Dropdown] Low, Medium, High
  * Request_name: [Text], EMP_CODE: [Text] **สำคัญ — ใช้เป็น Key สำหรับ Form 4.3 (Deep Link)**
  * Request_date: [Auto-fill]
* **UI & Logic (ส่วน IT ดำเนินการ — แก้ไขได้เมื่อเปิด Ticket เดิมกลับมา):**
  * แผนการดำเนินงาน: [Text Area], Vendor: [Text]
  * ปรับ Status ได้อิสระ: New / Process / UAT / Cancel — เมื่อพร้อมให้ User ทำ UAT ให้ปรับเป็น UAT (ระบบจะ Generate Link Form 4.3 ให้ IT ส่งต่อ)
* **Submit Action:** บันทึก/อัปเดตลง `41_Change_Req` → ถ้าปรับเป็น Status=UAT ให้ Insert `04_Notify_message` ด้วย

---

**Form 4.3: UAT Sign-off** — เข้าผ่าน **Deep Link เท่านั้น** `?action=approve&form=4_3&req_id=<Req_ID>`
*(อ้างอิง Sheet: `41_Change_Req`)*

* **วัตถุประสงค์:** ให้ผู้แจ้ง (เจ้าของ Ticket) กดยืนยันว่างานเสร็จจริง
* **Auth:** เช็คเฉพาะ Emp_Code ของ Line_UID ผู้เข้ามา (จาก `01_Users_Profile`) ต้องตรงกับ `EMP_CODE` ของรายการ
* **UI & Logic:**
  * แสดงรายการที่ Status = UAT เท่านั้น แบบ Read-only ทั้งหมด
  * ปุ่ม "ยอมรับผล (UAT Approve)"
* **Submit Action:** บันทึก `UAT_Date`, `UAT_LineUID` อัตโนมัติ → เปลี่ยน `Status = UAT-Approved` → Insert `04_Notify_message` แจ้งว่ามีรายการ UAT-Approved แล้ว

---

**Form 4.4: Deploy Sign-off (IT นำขึ้นระบบจริง)**
*(อ้างอิง Sheet: `41_Change_Req`)*

* **วัตถุประสงค์:** IT ยืนยันการแก้ไขบน Production
* **UI & Logic:** กรองเฉพาะ Status = UAT-Approved แสดงรายละเอียด (Read-only), ปุ่ม "Deploy Completed"
* **Submit Action:** บันทึก `Deploy_Date`, `Deploy_LineUID` → เปลี่ยน `Status = Deployed`

### **ระบบที่ 5: Backup & Recovery**

**Form 5.1: Backup Log**
*(อ้างอิง Sheet: `51_Backup_Log`)*
* Backup Date: [Date Picker], Job: [Dropdown] Nas Backup/Cloud Sync/Mango GL Backup, Status: [Radio] ผ่าน/ไม่ผ่าน, หมายเหตุ: [Text Area]
* **Submit Action:** บันทึกข้อมูล + Line_UID ของผู้ทำรายการ

**Form 5.2: Recovery Test Log**
*(อ้างอิง Sheet: `52_Recovery_Test`)*
* Test Recovery Date, From Backup Date: [Date Picker], Status: [Radio], แนบเอกสารการทดสอบ: [File Input] → `PDF_Link`, รายละเอียดวิธีทดสอบ: [Text Area]
* **Submit Action:** บันทึกข้อมูล → สั่ง Backend สร้าง PDF (Template: `FORM_RECOVERY_TEST_DOC_ID`)

### **ระบบที่ 6: BCP & DRP (แผนฉุกเฉิน)**

**Form 6.1: DRP Test Log**
*(อ้างอิง Sheet: `61_DRP_Test`)*
* วันที่ทดสอบ: [Date Picker], หัวข้อ: [Text Input], รายละเอียด: [Text Area]
* Upload: [File Input] แนบ PDF หรือวาง Link Video, ผลการทดสอบ: [Radio] ผ่าน/ไม่ผ่าน
* Approve_users: [Dropdown] เลือก Profile_Name จาก `02_Approve_Profile` (ผู้ที่จะรับทราบผลทดสอบ)
* **Submit Action:** บันทึก Status = Pending → ระบบ Generate Link Form 6.2 ให้ผู้บันทึก copy ส่งต่อให้ผู้ได้รับเลือก → Insert `04_Notify_message`

---

**Form 6.2: Approve DRP Test** — เข้าผ่าน **Deep Link เท่านั้น** `?action=approve&form=6_2&req_id=<DRP_ID>`
*(อ้างอิง Sheet: `61_DRP_Test`)*

* **วัตถุประสงค์:** ผู้ที่ได้รับเลือกกดรับทราบผลการทดสอบ DRP
* **Auth:** เช็คเฉพาะ Line_UID ผู้เข้ามา ต้องตรงกับ `Line_UID` ใน `02_Approve_Profile` ของ Profile ที่ระบุไว้ในรายการนี้ (ไม่ต้องมีชื่อใน `01_Users_Profile`)
* **UI & Logic:** ดึงรายการที่ Status = Pending และตรงเงื่อนไข Auth ด้านบนเท่านั้น แสดงรายละเอียดทั้งหมด Read-only, ปุ่ม "Approve (รับทราบ)" — **ไม่มีปุ่ม Reject** (ตัดสินใจทางธุรกิจ: การทดสอบดำเนินการไปแล้วก่อนขออนุมัติ)
* **Submit Action:** บันทึก `Status=Approved`, `Approve_LineUID`, `Approve_Datetime` → สั่ง Backend สร้าง PDF (Template: `FORM_DRP_TEST_DOC_ID`) → Insert `04_Notify_message`

### **ระบบที่ 7: Physical Security**

**Form 7.1: Server Room Access (Request)** — เปิด Public ไม่ต้องมี Users_Profile
*(อ้างอิง Sheet: `71_ServerRoom`)*

* **วัตถุประสงค์:** บันทึกและขออนุมัติการเข้าพื้นที่หวงห้าม
* **UI & Logic:**
  * Request_dateTime: [Auto-fill, แก้ไขได้] เผื่อกรอกล่วงหน้าก่อนเวลาเข้าจริง
  * ชื่อผู้ขอเข้าพื้นที่: [Text Input] (เผื่อเป็น Outsource)
  * เข้าพื้นที่เพื่อ: [Text Area]
  * Approve_users: [Dropdown] จาก `02_Approve_Profile`
* **Submit Action:** บันทึก Status = Pending → ระบบ Generate Link Form 7.2 ให้ผู้บันทึกส่งต่อให้ผู้ได้รับเลือก → Insert `04_Notify_message` แจ้งว่ามีรายการรออนุมัติเข้าพื้นที่หวงห้าม

---

**Form 7.2: Approve Server Room** — เข้าผ่าน **Deep Link เท่านั้น** `?action=approve&form=7_2&req_id=<Log_ID>`
*(อ้างอิง Sheet: `71_ServerRoom`)*

* **วัตถุประสงค์:** ผู้ที่ได้รับเลือกกดอนุมัติ/รับทราบการขอเข้าห้อง Server
* **Auth:** เช็คเฉพาะ Line_UID ผู้เข้ามา ต้องตรงกับ `Line_UID` ใน `02_Approve_Profile` ของ Profile ที่ระบุไว้ในรายการนี้ (ไม่ต้องมีชื่อใน `01_Users_Profile`)
* **UI & Logic:** ดึงรายการที่ Status = Pending และตรงเงื่อนไข Auth ด้านบนเท่านั้น แสดงรายละเอียด Read-only, ปุ่ม "Approve" — **ไม่มีปุ่ม Reject** (ตัดสินใจทางธุรกิจ: กิจกรรมดำเนินไปแล้วก่อนขออนุมัติ)
* **Submit Action:** บันทึก `Status=Approved`, `Approve_LineUID`, `Approve_Datetime` → สั่ง Backend สร้าง PDF (Template: `FORM_SERVERROOM_DOC_ID`) → Insert `04_Notify_message`

### **ระบบที่ 8: Message Notify**

**Form 8.1: message notify clear**
*(อ้างอิง Sheet: `04-Notify_message`)*
* แสดงรายการทั้งหมด เลือกรายการกด "ลบ" ออกได้ (ลบแบบ Global เห็นเหมือนกันทุกคน — ปัจจุบันมีแค่ทีม IT ใช้เมนูนี้)

---

## **ข้อความถึงทีมพัฒนาระบบ — สำคัญ**

1. **GAS Performance:** ต้องระวังเรื่องความเร็วในการ Load/ค้นหา/บันทึกข้อมูลพร้อมกันหลายคน
2. **Concurrent Write:** ระวังการกดบันทึกพร้อมกันหลายคน (ประเมินไม่เกิน 10 คนในวินาทีเดียวกัน) — ใช้ LockService:
   ```javascript
   const lock = LockService.getScriptLock();
   try {
     lock.waitLock(30000);
     SpreadsheetApp.flush();
   } finally {
     lock.releaseLock();
   }
   ```
3. **Primary Key Generation:** ใช้ `const record_id = new Date().getTime().toString();` ภายใต้ Lock ด้านบนเพื่อกันซ้ำ โดยยังคงความเร็ว
4. **CORS / Preflight (GitHub Pages ↔ GAS Web App):** index.html วางไว้ที่ GitHub Pages เพื่อให้ LINE LIFF ทำงานได้ — ถ้า fetch() จาก Frontend ส่ง header `Content-Type: application/json` จะโดน Browser ยิง Preflight (OPTIONS) ซึ่ง GAS Web App ไม่รองรับ ทำให้ Request Fail **ให้ fetch() ส่งแบบ `Content-Type: text/plain;charset=utf-8` แล้วฝั่ง GAS ใช้ `JSON.parse(e.postData.contents)` แทน**
5. **Deep Link Security:** เนื่องจากฟอร์มกลุ่ม B ไม่เช็ค Scr_xx/Is_Active ให้ Backend Validate เงื่อนไข Auth เฉพาะฟอร์ม (ตามตารางในกฎเหล็กข้อ 4) อย่างเข้มงวดในทุก Request ทั้ง GET (แสดงข้อมูล) และ POST (Submit) — ห้ามเชื่อ Frontend ฝ่ายเดียว

## **Template & Folder Mapping (ท้ายเอกสาร)**

| # | ชื่อ Template | Doc_ID Constant (config.gs) | อ้างอิง Sheet | Trigger (เกิด PDF ตอนไหน) |
|---|---|---|---|---|
| 1 | UAR Approve | `FORM_UAR_APPROVE_DOC_ID` = `1j7yisKuS8vwpR0S862zSeTqkTo7KVJoyVM_KeP-YEF8` | `11_Access_Request` | Form 1.2 — ผู้ใช้กด **Approve** |
| 2 | Access Review | `FORM_ACCESS_REVIEW_DOC_ID` = `17t0Lw7tr35IvsQhvikccy-FXJcphPL3PSmg-lXE0YKk` | `12_Access_Review` | Form 1.3 — กด **Submit** |
| 3 | Recovery Test | `FORM_RECOVERY_TEST_DOC_ID` = `1Afil1dTvmo8uZf8V10oNZECR0LYZNwH5p0Qu2qyX1jY` | `52_Recovery_Test` | Form 5.2 — กด **Submit** |
| 4 | DRP Test | `FORM_DRP_TEST_DOC_ID` = `17MjzmFieQ6CDuTocukEwwxmbEW-Kxo0038EvNUHILhc` | `61_DRP_Test` | Form 6.2 — ผู้ได้รับเลือกกด **Approve** |
| 5 | Server Room Access | `FORM_SERVERROOM_DOC_ID` = `1CifDMTIGRz6mkNRsOr5zlFoKXKO07_qJ8nzFbnA6YZI` | `71_ServerRoom` | Form 7.2 — ผู้ได้รับเลือกกด **Approve** |

*หมายเหตุ: Asset Movement (21_Asset_Movement) ไม่มี Template PDF ของตัวเองแล้ว — ใช้ PDF จาก Form 1.2 (UAR Approve) เป็นหลักฐานร่วมกัน เนื่องจากข้อมูลการโอนย้ายถูกสร้างมาจากรายการเดียวกัน*

**Folder ID:**
- `PDF_FOLDER_ID = 1z8iZy6wXtGRvVN-55bEFSxOAzoQPOHN4` (เก็บ PDF ที่สร้างจาก Template)
- `UPLOAD_FOLDER_ID = 1zvFM2hDHBdS_BClm3Fo4cTl0ak-zcJUf` (เก็บไฟล์ที่ผู้ใช้ Upload เอง เช่น ภาพ Asset Destroy, เอกสารแนบ DRP)

**End of Document**
