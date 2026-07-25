# Process Flowcharts — IT Management & COSO-ITGC Compliance System (v4)
สำหรับแนบท้ายเอกสาร Spec เพื่อใช้ประกอบการทำ Work Instruction (WI) และการตรวจสอบของ Audit
(Copy โค้ดแต่ละบล็อกไปวางใน draw.io ได้ทีละ Flow — อัปเดตตาม Spec v4: Deep Link Approve, ตัด LINE Push, ตัด PDF ของ Asset Movement)

---

## 1. Data Access Control — UAR (Form 1.1 → Deep Link → Form 1.2)

```mermaid
flowchart TD
    subgraph IT1["เจ้าหน้าที่ IT (Scr_01 - เข้าเมนูหลัก)"]
        A1([เริ่ม: เปิด Form 1.1]) --> A2[กรอกประเภทรายการ:<br/>ผู้ใช้ใหม่ / ลาออก / แก้ไขสิทธิ์]
        A2 --> A3{ประเภท = แก้ไขสิทธิ์?}
        A3 -->|Yes| A4[ดึง Role/365/Computer/VPN<br/>ล่าสุดของผู้ใช้นี้มาแสดง]
        A3 -->|No| A5[กรอกวันที่-เวลาส่งมอบ]
        A4 --> A6[เลือก Role ที่ต้องการ]
        A5 --> A6
        A6 --> A7[กด Submit]
    end

    A7 --> S1[(บันทึกลง 11_Access_Request<br/>Req_Status = Pending)]
    S1 --> S2[(Insert 04_Notify_message<br/>'มี UAR รอผู้ใช้ยอมรับ')]
    S2 --> S3[(Insert Raw_JSON ลง 99_System_Log)]
    S3 --> S4[Backend สร้าง URL Deep Link:<br/>action=approve&form=1_2&req_id=xxxx]
    S4 --> S5[IT Copy Link ส่งให้เจ้าของสิทธิ์<br/>ทาง LINE/Email]

    subgraph U["เจ้าของสิทธิ์ (เปิดผ่าน Deep Link เท่านั้น)"]
        S5 --> B1([เปิด Link บนมือถือ])
        B1 --> B2["ข้าม App Shell ปกติทั้งหมด<br/>ไม่เช็ค Is_Active, ไม่เช็ค Scr_xx"]
        B2 --> B3{Emp_Code จาก Line_UID<br/>ตรงกับ Emp_Code ในรายการ?}
        B3 -->|ไม่ตรง| B4[Reject: 'ไม่พบสิทธิ์<br/>เข้าถึงรายการนี้']
        B3 -->|ตรง| B5{Status ของรายการ<br/>ยังเป็น Pending?}
        B5 -->|No| B6[แสดง Read-only:<br/>'รายการนี้ถูกดำเนินการแล้ว']
        B5 -->|Yes| B7[แสดงข้อมูลจาก Form 1.1<br/>Read-only ทั้งหมด]
        B7 --> B8{ติ๊กยอมรับเงื่อนไข?}
        B8 -->|No| B7
        B8 -->|Yes| B9{กด Approve<br/>หรือ Reject?}
    end

    B4 --> END1([จบ])
    B6 --> END2([จบ])

    B9 -->|Reject| C1[(ปรับ Req_Status = Rejected)]
    C1 --> C2[(Insert Raw_JSON ลง 99_System_Log)]
    C2 --> END3([จบ])

    B9 -->|Approve| D1[(บันทึก Approve_LineUID)]
    D1 --> D2[Backend สร้าง PDF<br/>Template: FORM_UAR_APPROVE_DOC_ID]
    D2 --> D3[(บันทึก PDF_Link)]
    D3 --> D4{Req_Type เดิม<br/>คืออะไร?}
    D4 -->|ผู้ใช้ใหม่| D5[(สร้าง 21_Asset_Movement<br/>Doc_Type = 2-รับมอบ)]
    D4 -->|ลาออก| D6[(สร้าง 21_Asset_Movement<br/>Doc_Type = 1-ส่งคืน)]
    D4 -->|แก้ไขสิทธิ์| D7[ไม่ต้องสร้าง<br/>21_Asset_Movement]
    D5 --> D8[(Insert 04_Notify_message)]
    D6 --> D8
    D7 --> D8
    D8 --> D9[(Insert Raw_JSON ลง 99_System_Log)]
    D9 --> END4([จบ — มี PDF เป็นหลักฐานครบ])
```

---

## 2. Access Review — ทบทวนสิทธิ์ประจำปี (Form 1.3)

```mermaid
flowchart TD
    A1([เริ่ม: IT เปิด Form 1.3<br/>Scr_03]) --> A2[เลือก Computer Name]
    A2 --> A3[Auto Fetch: หา record ล่าสุด<br/>สถานะ 'รับมอบ' ใน 21_Asset_Movement]
    A3 --> A4[ได้ Emp_Code / FullName<br/>ผู้ถือครองปัจจุบัน]
    A4 --> A5[Auto Fetch: หา 11_Access_Request<br/>ล่าสุด Req_Status=Approved]
    A5 --> A6[แสดง Role / O365 Email<br/>Read-only]
    A6 --> A7[IT ไปตรวจสอบบนเครื่องจริง]
    A7 --> A8[กรอกผล: ผ่าน / ไม่ผ่าน + หมายเหตุ]
    A8 --> A9[กด Submit]
    A9 --> S1[(บันทึกลง 12_Access_Review)]
    S1 --> S2[Backend สร้าง PDF<br/>Template: FORM_ACCESS_REVIEW_DOC_ID]
    S2 --> S3[(บันทึก PDF_Link)]
    S3 --> S4[(Insert Raw_JSON ลง 99_System_Log)]
    S4 --> END([จบ])
```

---

## 3. IT-Asset — Asset Movement (Form 2.1)

```mermaid
flowchart TD
    A1([เริ่ม: IT เปิด Form 2.1<br/>Scr_04]) --> A2[เลือกประเภทเอกสาร:<br/>1-ส่งคืน / 2-รับมอบ]
    A2 --> A3[เลือก Computer Name<br/>จาก 03_IT_Asset_Master]
    A3 --> A4[ระบบดึง Emp_Code/FullName/Tel<br/>ผู้ครอบครองล่าสุดมาแสดง]
    A4 --> A5{ต้องแก้ไขเป็น<br/>คนอื่นไหม?}
    A5 -->|Yes, คีย์แทน| A6[แก้ไข Emp_Code/FullName/Tel]
    A5 -->|No| A7[ใช้ค่าที่ดึงมา]
    A6 --> A8[กรอกหมายเหตุ]
    A7 --> A8
    A8 --> A9[กด Submit]
    A9 --> S1[(บันทึกลง 21_Asset_Movement)]
    S1 --> S2[(Insert Raw_JSON ลง 99_System_Log)]
    S2 --> END(["จบ — ไม่มี Approve, ไม่มี PDF<br/>(ใช้ PDF ของ Form 1.2 เป็นหลักฐานร่วมกันสำหรับ Flow ปกติ)"])
```

---

## 4. IT-Asset — Asset Destroy (Form 2.2)

```mermaid
flowchart TD
    A1([เริ่ม: เปิด Form 2.2<br/>Scr_05]) --> A2[กรอกหมายเหตุการทำลาย]
    A2 --> A3[แนบภาพประกอบ]
    A3 --> A4[กด Submit]
    A4 --> S1[แปลงไฟล์ภาพเป็น Base64<br/>ส่งเข้า GAS]
    S1 --> S2[(Save ไฟล์ลง<br/>UPLOAD_FOLDER_ID บน Drive)]
    S2 --> S3[(บันทึก URL ลง 22_Asset_Destroy)]
    S3 --> S4[(Insert Raw_JSON ลง 99_System_Log)]
    S4 --> END([จบ])
```

---

## 5. Outsourcing Control — Contract Management (Form 3.1, CRUD)

```mermaid
flowchart TD
    A1([เริ่ม: เปิด Form 3.1<br/>Scr_06 - Data Table]) --> A2{เลือกกิจกรรม}
    A2 -->|เพิ่มรายการ| B1[กรอกข้อมูลสัญญา<br/>+ อัปโหลด PDF สัญญา]
    B1 --> B2[(Insert 31_Outsource<br/>Is_Active = True)]
    A2 -->|แก้ไข| C1[เลือกรายการ → แก้ไขข้อมูล]
    C1 --> C2[(Update 31_Outsource<br/>Last_Update = now)]
    A2 -->|ลบ| D1[เลือกรายการที่จะลบ]
    D1 --> D2[(Soft Delete:<br/>Update Is_Active = False)]
    B2 --> S1[(Insert Raw_JSON ลง 99_System_Log)]
    C2 --> S1
    D2 --> S1
    S1 --> END([จบ])
```

---

## 6. Change Management & Helpdesk (Form 4.1 → Deep Link → Form 4.3 → Form 4.4)

```mermaid
flowchart TD
    subgraph U1["ผู้แจ้ง / IT (Scr_07 - Form 4.1 ใช้ร่วมกัน 2 บทบาท)"]
        A1([เริ่ม: เปิด Form 4.1]) --> A2[เลือกประเภท: Incident / Change<br/>กรอกเรื่อง-รายละเอียด-ความสำคัญ<br/>+ EMP_CODE ผู้แจ้ง]
        A2 --> A3[กด Submit]
    end
    A3 --> S1[(บันทึก 41_Change_Req<br/>Status = New)]
    S1 --> S2[(Insert 04_Notify_message<br/>'Change Request ใหม่')]
    S2 --> S3[(Insert Raw_JSON ลง 99_System_Log)]

    subgraph IT1["IT (Scr_07 - เปิด Ticket เดิมกลับมาแก้ในฟอร์มเดียวกัน)"]
        S3 --> B1([เปิด Ticket เดิม]) --> B2[กรอกแผนดำเนินงาน + Vendor]
        B2 --> B3{ปรับสถานะเป็นอะไร?}
        B3 -->|กำลังทำ| B4[Status = Process]
        B3 -->|พร้อมให้ User ทดสอบ| B5[Status = UAT]
        B3 -->|ไม่ต้องการแล้ว| B6[Status = Cancel]
    end
    B4 --> S4[(Update 41_Change_Req)] --> S5[(Insert Raw_JSON ลง Log)] --> B1
    B6 --> S4b[(Update 41_Change_Req)] --> S5b[(Insert Raw_JSON ลง Log)] --> ENDX([จบ - ยกเลิก])

    B5 --> S6[(Update Status = UAT)]
    S6 --> S7[(Insert 04_Notify_message)]
    S7 --> S8[Backend สร้าง URL Deep Link:<br/>action=approve&form=4_3&req_id=xxxx]
    S8 --> S9[IT Copy Link ส่งให้เจ้าของ Ticket]

    subgraph U2["เจ้าของ Ticket (เปิดผ่าน Deep Link เท่านั้น)"]
        S9 --> C1([เปิด Link])
        C1 --> C2["ข้าม App Shell ปกติ<br/>ไม่เช็ค Is_Active, ไม่เช็ค Scr_xx"]
        C2 --> C3{Emp_Code จาก Line_UID<br/>ตรงกับ EMP_CODE ในรายการ?}
        C3 -->|ไม่ตรง| C4[Reject: 'ไม่พบสิทธิ์<br/>เข้าถึงรายการนี้']
        C3 -->|ตรง| C5[ทดสอบระบบจริง]
        C5 --> C6[กด 'ยอมรับผล UAT Approve']
    end
    C4 --> ENDY([จบ])
    C6 --> D1[(บันทึก UAT_Date, UAT_LineUID<br/>Status = UAT-Approved)]
    D1 --> D2[(Insert 04_Notify_message)]
    D2 --> D3[(Insert Raw_JSON ลง 99_System_Log)]

    subgraph IT2["IT (Scr_10 - Form 4.4)"]
        D3 --> E1[เปิดรายการ Status = UAT-Approved]
        E1 --> E2[นำขึ้น Production จริง]
        E2 --> E3[กด 'Deploy Completed']
    end
    E3 --> F1[(บันทึก Deploy_Date, Deploy_UID<br/>Status = Deployed)]
    F1 --> F2[(Insert Raw_JSON ลง 99_System_Log)]
    F2 --> END([จบ])
```

---

## 7. Backup & Recovery (Form 5.1, 5.2)

```mermaid
flowchart TD
    subgraph BK["Backup Log (Form 5.1, Scr_11)"]
        A1([เริ่ม]) --> A2[เลือกวันที่ + ประเภท Job<br/>NAS / Cloud / Mango]
        A2 --> A3[ระบุผลลัพธ์: ผ่าน / ไม่ผ่าน + หมายเหตุ]
        A3 --> A4[กด Submit]
    end
    A4 --> S1[(บันทึก 51_Backup_Log<br/>+ Created_LineUID)]
    S1 --> S2[(Insert Raw_JSON ลง 99_System_Log)]
    S2 --> END1([จบ])

    subgraph RC["Recovery Test (Form 5.2, Scr_12)"]
        B1([เริ่ม]) --> B2[เลือกวันที่ทดสอบ +<br/>วันที่ Backup ที่นำมาใช้]
        B2 --> B3[อธิบายวิธีทดสอบ + แนบเอกสาร]
        B3 --> B4[ระบุผล: ผ่าน / ไม่ผ่าน]
        B4 --> B5[กด Submit]
    end
    B5 --> T1[(บันทึก 52_Recovery_Test)]
    T1 --> T2[Backend สร้าง PDF<br/>Template: FORM_RECOVERY_TEST_DOC_ID]
    T2 --> T3[(บันทึก PDF_Link)]
    T3 --> T4[(Insert Raw_JSON ลง 99_System_Log)]
    T4 --> END2([จบ])
```

---

## 8. BCP & DRP — DRP Test (Form 6.1 → Deep Link → Form 6.2)

```mermaid
flowchart TD
    subgraph U["ผู้ทดสอบ (Scr_13 - Form 6.1)"]
        A1([เริ่ม]) --> A2[กรอกวันที่/หัวข้อ/รายละเอียด<br/>แนบไฟล์ PDF หรือ Link Video]
        A2 --> A3[ระบุผลทดสอบ: ผ่าน / ไม่ผ่าน]
        A3 --> A4[เลือก Approve_Profile<br/>จาก 02_Approve_Profile]
        A4 --> A5[กด Submit]
    end
    A5 --> S1[(บันทึก 61_DRP_Test<br/>Status = Pending)]
    S1 --> S2[(Insert 04_Notify_message<br/>'มี DRP Test รอรับทราบ')]
    S2 --> S3[(Insert Raw_JSON ลง 99_System_Log)]
    S3 --> S4[Backend สร้าง URL Deep Link:<br/>action=approve&form=6_2&req_id=xxxx]
    S4 --> S5[ผู้ทดสอบ Copy Link<br/>ส่งให้ผู้ได้รับเลือก]

    subgraph AP["ผู้ได้รับเลือก (เปิดผ่าน Deep Link เท่านั้น)"]
        S5 --> B1([เปิด Link])
        B1 --> B2["ข้าม App Shell ปกติ<br/>ไม่ต้องมีชื่อใน 01_Users_Profile เลย"]
        B2 --> B3{Line_UID ผู้เข้ามา<br/>ตรงกับ Line_UID ใน<br/>02_Approve_Profile ของ<br/>Approve_Profile ที่ระบุไว้?}
        B3 -->|ไม่ตรง| B4[Reject: 'ไม่พบสิทธิ์<br/>เข้าถึงรายการนี้']
        B3 -->|ตรง| B5[ตรวจดูรายละเอียด Read-only]
        B5 --> B6[กด Approve<br/>'รับทราบผลการทดสอบ']
    end
    B4 --> END1([จบ])

    B6 --> C1[(บันทึก Status=Approved<br/>Approve_LineUID, Approve_Datetime)]
    C1 --> C2[Backend สร้าง PDF<br/>Template: FORM_DRP_TEST_DOC_ID]
    C2 --> C3[(บันทึก PDF_Link)]
    C3 --> C4[(Insert 04_Notify_message)]
    C4 --> C5[(Insert Raw_JSON ลง 99_System_Log)]
    C5 --> END2([จบ — ไม่มี Reject ในขั้นนี้<br/>เพราะกิจกรรมดำเนินไปแล้วก่อนขออนุมัติ])
```

---

## 9. Physical Security — Server Room Access (Form 7.1 → Deep Link → Form 7.2)

```mermaid
flowchart TD
    subgraph V["ผู้ขอเข้าพื้นที่ (Form 7.1 - เปิด Public ไม่ต้องมี LIFF Login/Users_Profile)"]
        A1([เริ่ม: เปิด Form 7.1<br/>ไม่เช็คสิทธิ์ App Shell เลย]) --> A2[กรอกชื่อผู้ขอเข้าพื้นที่]
        A2 --> A3[กรอกวันที่-เวลาที่ต้องการเข้า<br/>+ วัตถุประสงค์]
        A3 --> A4[เลือก Approve_Profile<br/>จาก 02_Approve_Profile]
        A4 --> A5[กด Submit]
    end
    A5 --> S1[(บันทึก 71_ServerRoom<br/>Status = Pending)]
    S1 --> S2[(Insert 04_Notify_message<br/>'รออนุมัติเข้าพื้นที่หวงห้าม')]
    S2 --> S3[(Insert Raw_JSON ลง 99_System_Log)]
    S3 --> S4[Backend สร้าง URL Deep Link:<br/>action=approve&form=7_2&req_id=xxxx]
    S4 --> S5[แสดง Link ให้ผู้ขอ<br/>Copy ส่งให้ผู้ได้รับเลือก]

    subgraph AP["ผู้ได้รับเลือก (เปิดผ่าน Deep Link เท่านั้น)"]
        S5 --> B1([เปิด Link])
        B1 --> B2["ข้าม App Shell ปกติ<br/>ไม่ต้องมีชื่อใน 01_Users_Profile เลย"]
        B2 --> B3{Line_UID ผู้เข้ามา<br/>ตรงกับ Line_UID ใน<br/>02_Approve_Profile ของ<br/>Approve_Profile ที่ระบุไว้?}
        B3 -->|ไม่ตรง| B4[Reject: 'ไม่พบสิทธิ์<br/>เข้าถึงรายการนี้']
        B3 -->|ตรง| B5[ตรวจดูรายละเอียด Read-only]
        B5 --> B6[กด Approve 'รับทราบ']
    end
    B4 --> END1([จบ])

    B6 --> C1[(บันทึก Status=Approved<br/>Approve_LineUID, Approve_Datetime)]
    C1 --> C2[Backend สร้าง PDF<br/>Template: FORM_SERVERROOM_DOC_ID]
    C2 --> C3[(บันทึก PDF_Link)]
    C3 --> C4[(Insert 04_Notify_message)]
    C4 --> C5[(Insert Raw_JSON ลง 99_System_Log)]
    C5 --> END2([จบ — ไม่มี Reject<br/>เพราะกิจกรรมดำเนินไปก่อนอนุมัติแล้ว])
```

---

## 10. Notify Message Board (Form 8.1)

```mermaid
flowchart TD
    A1([เริ่ม: เปิด Form 8.1<br/>Scr_17]) --> A2[แสดงรายการทั้งหมด<br/>ใน 04-Notify_message<br/>เห็นทุกคน — ปัจจุบันเปิดให้ทีม IT ใช้]
    A2 --> A3[เลือกรายการที่จะลบ]
    A3 --> A4[กด ลบ]
    A4 --> S1[(Delete record จาก<br/>04-Notify_message)]
    S1 --> S2[(Insert Raw_JSON ลง 99_System_Log)]
    S2 --> END([จบ])
```

---

### หมายเหตุสำหรับ Auditor / WI

- ทุก Flow ที่มีขั้นตอน "Insert Raw_JSON ลง 99_System_Log" คือจุดที่ระบบบันทึก Audit Trail ตามมาตรฐาน COSO-ITGC — เกิดขึ้นทุกครั้งที่มี Request เข้า Backend โดยไม่มีข้อยกเว้น ทั้งเส้นทางเมนูหลักและ Deep Link
- กล่องทรงกระบอก (Cylinder) หมายถึงจุดที่มีการเขียน/อ่านข้อมูลใน Google Sheets
- **จุด "ข้าม App Shell ปกติ"** ปรากฏใน Flow 1, 6, 8, 9 — คือหน้าจอ Approve ที่เข้าผ่าน Deep Link เฉพาะรายการเท่านั้น (Form 1.2, 4.3, 6.2, 7.2) **ไม่เช็ค Is_Active และไม่เช็ค Scr_xx ใด ๆ** ตรวจสอบตัวตนด้วยเงื่อนไขเฉพาะฟอร์มแทน (Emp_Code match สำหรับ 1.2/4.3, Line_UID match กับ 02_Approve_Profile สำหรับ 6.2/7.2) — ออกแบบเพื่อให้พนักงานที่เพิ่งถูกปรับ Is_Active=No (เช่น กรณีลาออก) ยังกดยืนยันรายการของตัวเองได้
- Flow 6.2 และ 7.2 (DRP Test, Server Room) ไม่มี Path "Reject" ตามการตัดสินใจทางธุรกิจ (กิจกรรมดำเนินไปแล้วก่อนขออนุมัติ ปุ่ม Approve มีความหมายเป็น "รับทราบ" เท่านั้น)
- Flow 3 (Asset Movement, Form 2.1) ไม่มีการสร้าง PDF อีกต่อไป — ยืนยันแล้วว่า PDF จาก Form 1.2 เพียงพอเป็นหลักฐานสำหรับ Flow ปกติ (ผู้ใช้ใหม่/ลาออก) ส่วน Form 2.1 ใช้บันทึกกรณีอื่นนอกเหนือ Flow หลักเท่านั้น
- ตัดขั้นตอน LINE Push แจ้งเตือนผู้ขอออกทั้งระบบ เนื่องจากผู้ใช้ทั่วไปแทบไม่ได้เข้าแอปเอง และทีม IT ประสานผลกับผู้ขอผ่าน Email/LINE (ส่ง Deep Link ตรง) ตามกระบวนการทำงานจริงอยู่แล้ว — คงเหลือเฉพาะการแจ้งเตือนภายในแอป (04-Notify_message) สำหรับฝั่ง IT/ผู้อนุมัติเท่านั้น
