# **เอกสารข้อกำหนดระบบ (System Requirement Specification & Database Design)**

**Project:** IT Management & COSO-ITGC Compliance System
**Prepared By:** System Analyst & DBA (10 Years Experience)
**Target Audience:** Full Stack Developer Team, Internal Audit, IT Management
**Version:** 4.0 (รวม Deep-Link Approve Screens เข้าเป็นเอกสารเดียวกับ Functional Spec v4 — ใช้คู่กัน 2 ไฟล์เท่านั้น)

## **1. สถาปัตยกรรมระบบ (System Architecture)**

ระบบนี้ถูกออกแบบมาเพื่อลดการใช้กระดาษ (Paperless) และรองรับการทำ Audit Trail ตามมาตรฐาน COSO-ITGC สำหรับบริษัทที่เตรียมตัว IPO โดยมีสถาปัตยกรรมดังนี้:

* **Frontend (Hosting: GitHub Pages):**
  * ใช้ `index.html` เป็นไฟล์หลัก ควบคุม Routing ผ่าน URL Parameter (เช่น `index.html?action=form_name` สำหรับเมนูปกติ หรือ `index.html?action=approve&form=1_2&req_id=xxx` สำหรับ Deep Link — ดูรายละเอียด Auth Pattern ในหัวข้อ 3.1)
  * **UI/UX:** แนะนำ **Bootstrap 5** หรือ **Tailwind CSS** ร่วมกับ **SweetAlert2**
  * **Authentication:** ผูกกับ **LINE LIFF API** (`liff.init()`, `liff.getProfile()`) เพื่อดึง UID มาใช้เป็น SSO
* **Backend (Hosting: Google Apps Script — GAS):**
  * พัฒนาเป็น RESTful API Web App (`doPost`, `doGet`) รับ-ส่งข้อมูลแบบ JSON
  * **ข้อควรระวัง (CORS):** ต้อง Deploy เป็น "Execute as: Me" และ "Who has access: Anyone" — ผู้ Deploy ต้องมีสิทธิ์ Editor บน Google Sheet เป้าหมายจริง (ประสานกับผู้ดูแล Sheet ก่อน Deploy)
  * **โครงสร้างไฟล์ GAS (Modular):** ห้ามเขียนรวมกัน ต้องแยกไฟล์ดังนี้
    * `Code.gs` (Router รับ Request — ต้องแยก Logic เส้นทาง `action=approve` (Deep Link, ไม่เช็ค Auth ปกติ) ออกจากเส้นทางเมนูหลัก (เช็ค Auth ปกติ) ตั้งแต่จุดแรกที่รับ Request)
    * `BaseFunction.gs` (จัดการ DB, LIFF Auth, Generate PDF)
    * `Mod_AccessControl.gs`, `Mod_ITAsset.gs`, ฯลฯ แยกตามระบบงาน
* **Database (Google Sheets) & Data Immutability Control:**
  * เก็บข้อมูลแยก Sheet ตามหัวข้อ มีการใช้ Transaction ID และเก็บ Log ทุกขั้นตอน
  * การเพิ่ม/ลด/แก้ไขข้อมูลทั้งหมดต้องทำผ่าน Web Application (API) เท่านั้น
  * **PDF Document Generation:** ทุกครั้งที่มีการ Approve (เฉพาะฟอร์มที่ระบุไว้ว่าต้องสร้าง PDF) ระบบนำข้อมูลไป Replace `{{fieldname}}` บน Template Google Doc สร้างเป็น PDF เก็บใน Google Drive และนำ Link มาบันทึกใน Sheet

## **2. การออกแบบฐานข้อมูล (Database Design)**

*หมายเหตุ: ทุกตารางที่มี Transaction ควรมี Created_LineUID, Approve_LineUID (ถ้ามีขั้นตอนอนุมัติ), Last_Update และ PDF_Link (ถ้ามีการสร้าง PDF) เสมอ*

### **0. Master Data (Sheet: 01_Users_Profile, 02_Approve_Profile, 03_IT_Asset_Master, 04-Notify_message)**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **01_Users_Profile** | Line_UID | String (PK) | รหัสจาก LIFF |
|  | Line_ProfileName | String | ชื่อใน LINE |
|  | FullNameTH | String | ชื่อนามสกุลพนักงาน THAI |
|  | FullNameEN | String | ชื่อนามสกุล ENG |
|  | Emp_Code | String | รหัสพนักงาน |
|  | Department | String | หน่วยงาน |
|  | Tel, Email | String | ข้อมูลติดต่อ |
|  | Is_Active | Boolean | Yes / No (Default: Yes) — **ใช้เฉพาะฟอร์มกลุ่ม A เท่านั้น ฟอร์มกลุ่ม B (Deep Link) ไม่เช็คค่านี้** |
|  | Last_Update | DateTime | วันที่แก้ไขล่าสุด |
|  | Scr_01 | Boolean | สิทธิ์เข้าถึง **Form 1.1** (Yes/No) |
|  | Scr_02 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — Form 1.2 เข้าผ่าน Deep Link เท่านั้น ไม่เช็คค่านี้ (เก็บคอลัมน์ไว้เพื่อไม่ให้เลข Scr ขยับ) |
|  | Scr_03 | Boolean | สิทธิ์เข้าถึง **Form 1.3** (Yes/No) |
|  | Scr_04 | Boolean | สิทธิ์เข้าถึง **Form 2.1** (Yes/No) |
|  | Scr_05 | Boolean | สิทธิ์เข้าถึง **Form 2.2** (Yes/No) |
|  | Scr_06 | Boolean | สิทธิ์เข้าถึง **Form 3.1** (Yes/No) |
|  | Scr_07 | Boolean | สิทธิ์เข้าถึง **Form 4.1** (Yes/No) |
|  | Scr_08 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — ยุบรวมเข้ากับ Form 4.1 แล้ว (เก็บคอลัมน์ไว้เพื่อไม่ให้เลข Scr ขยับ) |
|  | Scr_09 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — Form 4.3 เข้าผ่าน Deep Link เท่านั้น ไม่เช็คค่านี้ |
|  | Scr_10 | Boolean | สิทธิ์เข้าถึง **Form 4.4** (Yes/No) |
|  | Scr_11 | Boolean | สิทธิ์เข้าถึง **Form 5.1** (Yes/No) |
|  | Scr_12 | Boolean | สิทธิ์เข้าถึง **Form 5.2** (Yes/No) |
|  | Scr_13 | Boolean | สิทธิ์เข้าถึง **Form 6.1** (Yes/No) |
|  | Scr_14 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — Form 6.2 เข้าผ่าน Deep Link เท่านั้น ไม่เช็คค่านี้ |
|  | Scr_15 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — Form 7.1 เปิด Public ไม่เช็ค Users_Profile เลย |
|  | Scr_16 | Boolean | ⚠️ **ไม่ใช้งานแล้ว** — Form 7.2 เข้าผ่าน Deep Link เท่านั้น ไม่เช็คค่านี้ |
|  | Scr_17 | Boolean | สิทธิ์เข้าถึง **Form 8.1** (Yes/No) |
| **02_Approve_Profile** | Profile_Name | String (PK) | เช่น CEO, IT (ใช้เป็น Filter ให้เลือก) |
|  | FullName, Emp_Code | String | ข้อมูลผู้อนุมัติ |
|  | Department, Tel, Email | String | ข้อมูลติดต่อ |
|  | Line_UID | String | **ใช้ตรวจสอบตัวตนตอนเข้า Form 6.2/7.2 ผ่าน Deep Link** |
| **03_IT_Asset_Master** | Computer_Name | String (PK) | ชื่อเครื่องคอมพิวเตอร์ |
|  | Asset_Type | String | ประเภท เช่น Laptop, Desktop |
|  | Status | String | Active, Inactive, Destroyed |
| **04-Notify_message** | LOG_ID | String (PK) | Auto Gen Key |
|  | Last_update | DateTime | วันที่เพิ่มรายการ |
|  | message | String | ข้อความแจ้งเตือน |

### **1. Data Access Control**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **11_Access_Request** | Req_ID | String (PK) | Auto Generate |
|  | Req_Type | String | New / Resign / Edit |
|  | Req_Date | DateTime | วันที่และเวลาส่งมอบ/ลาออก |
|  | Emp_Code, FullName | String | ข้อมูลพนักงาน — **ใช้ตรวจสอบตัวตนตอนเข้า Form 1.2 ผ่าน Deep Link (match กับ Emp_Code ใน 01_Users_Profile)** |
|  | Role_Requested | String | สิทธิ์ที่ขอ (MGMT, SALES, PLAN...) |
|  | Agree_Terms | Boolean | ยอมรับเงื่อนไข (บังคับ Yes ก่อน Approve) |
|  | O365_Email | String | Email 365 |
|  | Computer_Name | String | เลือกจาก Master |
|  | VPN_Access | Boolean | Yes / No |
|  | Req_Status | String | Pending, Approved, Rejected |
|  | Created_LineUID | String | UID ผู้บันทึก (IT) |
|  | Approve_LineUID | String | UID ผู้ยอมรับ (เจ้าของสิทธิ์เอง ผ่าน Form 1.2) |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |
|  | PDF_Link | String | URL หลักฐาน PDF |
| **12_Access_Review** | Rev_ID | String (PK) | Auto Generate |
|  | Review_Date | DateTime | วันที่ตรวจสอบ |
|  | Computer_Name | String | ชื่อเครื่องที่ตรวจสอบ |
|  | Emp_Code, FullName | String | Auto fetch จาก Asset Movement ล่าสุด |
|  | O365_Email, Current_Role | String | Auto fetch จาก Access Request ล่าสุด |
|  | Remark | String | หมายเหตุ |
|  | Result | String | ผลการตรวจ (ผ่าน/ไม่ผ่าน) |
|  | Created_LineUID | String | UID ผู้บันทึก |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |
|  | PDF_Link | String | URL หลักฐาน PDF |

### **2. IT-Asset**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **21_Asset_Movement** | Move_ID | String (PK) | Auto Generate |
|  | Doc_Type | String | 1-ส่งคืน, 2-รับมอบ |
|  | Computer_Name | String | เลือกจาก Master |
|  | Emp_Code | String | ดึงจากผู้ครอบครองล่าสุด (แก้ไขได้) |
|  | FullName | String | ดึงจากผู้ครอบครองล่าสุด (แก้ไขได้) |
|  | Tel | String | *(เพิ่มใหม่ v4 — เดิม UI มีช่องนี้แต่ Schema ตกหล่น)* เบอร์ติดต่อ |
|  | Move_DateTime | DateTime | วันที่และเวลาโอนย้าย |
|  | Remark | String | เหตุผล |
|  | Created_LineUID | String | UID ผู้บันทึก |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |

*หมายเหตุ: ตัด `PDF_Link` ออกจากตารางนี้ในเวอร์ชัน v4 — ยืนยันแล้วว่า Asset Movement ไม่ต้องมี PDF ของตัวเอง ใช้ PDF จาก Form 1.2 (11_Access_Request) เป็นหลักฐานร่วมกันแทน และตัด `Upload_Link` ออกด้วย เนื่องจาก Form 2.1 ไม่มีช่องอัปโหลดไฟล์ใด ๆ ตาม UI Spec ปัจจุบัน (คอลัมน์เดิมเป็นการ Copy จาก Form 2.2 มาโดยไม่ตั้งใจ)*

### **3. Outsourcing Control**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **31_Outsource** | Contract_ID | String (PK) | Auto Generate |
|  | Vendor_Name | String | ชื่อผู้ให้บริการ |
|  | Contract_No | String | เลขที่สัญญา |
|  | Subject | String | เรื่อง |
|  | Start_Date | Date | วันที่เริ่มสัญญา |
|  | End_Date | Date | วันที่สิ้นสุดสัญญา |
|  | Budget | String | งบประมาณ |
|  | name_contract | String | ชื่อผู้ติดต่อ |
|  | email_contract | String | Email |
|  | TEL_contract | String | เบอร์ |
|  | Contract_Type | String | รายปี, รายเดือน, on-Demand |
|  | PDF_Upload_Link | String | แนบไฟล์สัญญา PDF |
|  | Is_Active | String | True/False (True = Default) |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |

### **4. Change Management & Helpdesk**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **41_Change_Req** | Req_ID | String (PK) | Auto Generate |
|  | Req_Type | String | 1.แจ้งปัญหาการใช้งาน, 2.ขอเปลี่ยนระบบการทำงาน |
|  | Subject | String | เรื่อง |
|  | Detail | String | รายละเอียด |
|  | Priority | String | ความสำคัญ (3 ระดับ) |
|  | Req_Date | Date | วันที่แจ้ง |
|  | Req_Name | String | ชื่อผู้แจ้ง |
|  | EMP_CODE | String | รหัสพนักงานผู้แจ้ง — **ใช้ตรวจสอบตัวตนตอนเข้า Form 4.3 ผ่าน Deep Link (match กับ Emp_Code ใน 01_Users_Profile)** |
|  | Approve_Profile | String | เผื่อไว้ ปัจจุบันยังไม่ต้องมีการอนุมัติในขั้นนี้ |
|  | Status | String | New, Process, UAT, UAT-Approve, Deploy, Cancel |
|  | IT_Vendor | String | ผู้ดำเนินการ |
|  | IT_Plan | String | แผนดำเนินงาน (IT กรอก) |
|  | UAT_Date | Date | วันที่ User ยอมรับ |
|  | UAT_LineUID | String | LineUID คนที่มา Sign-off |
|  | Deploy_Date | Date | วันที่ Deploy |
|  | Deploy_UID | String | LineUID คนที่กด Deploy |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |

### **5. Backup & Recovery**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **51_Backup_Log** | Log_ID | String (PK) | Auto Generate |
|  | Backup_Date | Date | วันที่ |
|  | Job_Type | String | NAS, Cloud, Mango |
|  | Status | String | ผ่าน, ไม่ผ่าน |
|  | Remark | String | หมายเหตุ |
|  | Created_LineUID | String | UID ผู้บันทึก |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |
|  | PDF_Link | String | ไม่ใช้ (Form 5.1 ไม่มีการสร้าง PDF) — เก็บคอลัมน์ไว้เผื่ออนาคต |
| **52_Recovery_Test** | Test_ID | String (PK) | Auto Generate |
|  | Test_Date | Date | วันที่ทดสอบ |
|  | From_Bk_Date | Date | นำข้อมูลวันไหนมา Test |
|  | Status | String | ผ่าน, ไม่ผ่าน |
|  | Detail | String | วิธีทดสอบ |
|  | Created_LineUID | String | UID ผู้บันทึก |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |
|  | PDF_Link | String | URL หลักฐาน PDF |

### **6. BCP & DRP**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **61_DRP_Test** | DRP_ID | String (PK) | Auto Generate |
|  | Test_Date | Date | วันที่ |
|  | Subject | String | หัวข้อทดสอบ |
|  | Detail | Text | รายละเอียด |
|  | Upload_Link | String | แนบไฟล์หรือคลิป |
|  | Result | String | ผ่าน, ไม่ผ่าน |
|  | Status | String | Pending, Approved |
|  | Approve_Profile | String | เลือกจาก Profile_Name ใน `02_Approve_Profile` — **ใช้ตรวจสอบตัวตนตอนเข้า Form 6.2 ผ่าน Deep Link (match Line_UID)** |
|  | PDF_Link | String | URL หลักฐาน PDF |
|  | Approve_LineUID | String | บันทึก Line_UID คนอนุมัติ |
|  | Approve_Datetime | DateTime | เวลากดอนุมัติ |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |

### **7. Physical Security**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **71_ServerRoom** | Log_ID | String (PK) | Auto Generate |
|  | Req_Date | DateTime | วันที่ เวลาที่ต้องการเข้า |
|  | Visitor_Name | String | ชื่อผู้เข้าพื้นที่ |
|  | Purpose | String | วัตถุประสงค์ |
|  | Status | String | Pending, Approved |
|  | Approve_Profile | String | ชื่อผู้อนุมัติที่เลือกไว้ — **ใช้ตรวจสอบตัวตนตอนเข้า Form 7.2 ผ่าน Deep Link (match Line_UID)** |
|  | Req_LineUID | String | ดึงจาก LIFF (ผู้ใช้ทั่วไปไม่ต้องมี Profile) |
|  | PDF_Link | String | URL หลักฐาน PDF |
|  | Approve_LineUID | String | บันทึก Line_UID คนอนุมัติ |
|  | Approve_Datetime | DateTime | เวลากดอนุมัติ |
|  | Last_Update | DateTime | วันที่ เวลาแก้ไขรายการ |

### **8. System Log (Audit Trail) — [CRITICAL]**

| Sheet Name | Field Name | Type | Description |
| :---- | :---- | :---- | :---- |
| **99_System_Log** | Log_ID | String (PK) | Auto Generate |
|  | Timestamp | DateTime | วันที่และเวลาที่เกิด Transaction |
|  | Line_UID | String | UID ของผู้ที่กระทำ (ถ้ามี) |
|  | Module_Name | String | ชื่อ Form/System ที่เรียกใช้ API |
|  | Action_Type | String | เช่น INSERT, UPDATE, DELETE, APPROVE |
|  | Raw_JSON | Text | รับค่า Request Payload (JSON) ทั้งก้อนมาเก็บไว้ |

## **3. เงื่อนไขเชิงลึกทาง Business Logic (คำแนะนำสำหรับทีม Dev)**

### **3.1 การตรวจสอบสิทธิ์ (Authorization Router) — มี 2 เส้นทางแยกกันเด็ดขาด**

**เส้นทาง A — ฟอร์มในเมนูหลัก (ทุกฟอร์ม ยกเว้นที่ระบุในเส้นทาง B):**
1. รับ LIFF Profile → เช็คที่ Backend ว่า `Line_UID` มีอยู่ใน `01_Users_Profile` และ `Is_Active = Yes` หรือไม่ ถ้าไม่ผ่านให้ Block ทันที
2. การแสดงผลเมนูควบคุมโดยค่า `Scr_01`–`Scr_17` (ยกเว้น `Scr_02, Scr_08, Scr_09, Scr_14, Scr_15, Scr_16` ที่ไม่ได้ใช้งานแล้วตามที่ระบุในตาราง Master Data ด้านบน)
3. ข้อยกเว้น: **Form 7.1** เปิด Public ไม่เช็คขั้นตอนที่ 1 เลย (ข้ามไปแสดงฟอร์มได้ทันที)
4. **[Defense-in-Depth]** Frontend สามารถ Cache ผล Scr_xx/Is_Active ไว้ตอนโหลดหน้าแรกเพื่อลด Loading แต่ **Backend ต้องตรวจสอบสิทธิ์ (Scr_xx / Is_Active) ซ้ำทุกครั้งที่มีการ Submit เสมอ ห้ามเชื่อสิทธิ์ที่ Frontend Cache ไว้** — ป้องกันกรณี Admin ปิดสิทธิ์กลางคันแต่ผู้ใช้ยังไม่ได้ Reload หน้า

**เส้นทาง B — ฟอร์ม Deep Link (`action=approve`): Form 1.2, 4.3, 6.2, 7.2**
1. **ข้ามขั้นตอนที่ 1-2 ของเส้นทาง A ทั้งหมด** — ไม่เช็ค `Is_Active`, ไม่เช็ค `Scr_xx`
2. อ่านค่า `form` และ `req_id` จาก Query Parameter → ดึง Record เดียวจาก Sheet ที่เกี่ยวข้องตาม `req_id`
3. ตรวจสอบตัวตนตามเงื่อนไขเฉพาะฟอร์ม (ดูตารางในหัวข้อ 0 Master Data คอลัมน์ Description ของแต่ละ Sheet ที่เกี่ยวข้อง หรือดูสรุปในกฎเหล็กข้อ 4 ของ Functional Spec)
4. ถ้าไม่ผ่าน → Reject ทันที ไม่แสดงข้อมูลใด ๆ ของ Record นั้น
5. Backend ต้อง Validate เงื่อนไขนี้ซ้ำทุกครั้งทั้งตอน `doGet` (ขอดูข้อมูล) และ `doPost` (ตอน Submit) ห้ามเชื่อว่า Frontend กรองมาให้ถูกแล้ว

### **3.2 ระบบ Asset & Access Review**

ส่วนนี้มีความเปราะบางเรื่อง Data Integrity แนะนำว่าห้ามให้ User กรอก `Emp_Code` เอง แต่ให้ Dev เขียน Logic ดึงจาก Sheet `21_Asset_Movement` โดยเช็คจากสถานะรับมอบ/ส่งคืนล่าสุดของตัวเครื่อง

### **3.3 Audit Trail System Log (บังคับทำ)**

ทุกครั้งที่มี Request วิ่งเข้ามาที่ GAS (ทั้งเส้นทาง A และ B) ให้เขียนโค้ด `JSON.stringify(requestBody)` ยัดลงคอลัมน์ `Raw_JSON` ใน Sheet `99_System_Log` เสมอ คู่กับ Timestamp ของ Google Server

### **3.4 PDF Generator & Timestamp**

* ใช้ Google Font เช่น "TH Sarabun New" ใน Template Google Doc เสมอ
* **Auditor Trick:** ให้ Dev พิมพ์วันที่และเวลาที่ Generate เอกสาร (Server Time) ลงมุมขวาบนของ PDF ทุกใบ เพื่อ Cross-check กับเวลาใน `99_System_Log` ได้

**End of Document**
