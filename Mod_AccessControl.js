/**
 * Mod_AccessControl.gs - Module for Data Access Control & Authorization
 * จัดการ Form 1.1 (UAR), Form 1.2 (UAR Approve - Deep Link), Form 1.3 (Access Review)
 */

const Mod_AccessControl = {

  /**
   * [Form 1.1 - Search Employee Latest Record]
   * ค้นหาประวัติการขอสิทธิ์ล่าสุดของพนักงานจาก Emp_Code เพื่อลดการคีย์ใหม่
   */
  getLatestEmployeeRecord: function(empCode) {
    if (!empCode) return { found: false };

    const requests = readAllRows(CONFIG.SHEETS.ACCESS_REQUEST);
    // Filter matching Emp_Code and sort descending by Req_Date / Row
    const userReqs = requests.filter(r => String(r.Emp_Code).trim() === String(empCode).trim());
    
    if (userReqs.length > 0) {
      const latest = userReqs[userReqs.length - 1];
      return {
        found: true,
        data: {
          Emp_Code: latest.Emp_Code,
          FullName: latest.FullName,
          FullNameEN: latest.FullNameEN || '',
          Department: latest.Department || '',
          Role_Requested: latest.Role_Requested,
          O365_Email: latest.O365_Email,
          Computer_Name: latest.Computer_Name,
          VPN_Access: latest.VPN_Access
        }
      };
    }

    // Fallback search in 01_Users_Profile if not found in 11_Access_Request
    const users = readAllRows(CONFIG.SHEETS.USERS_PROFILE);
    const user = users.find(u => String(u.Emp_Code).trim() === String(empCode).trim());
    if (user) {
      return {
        found: true,
        data: {
          Emp_Code: user.Emp_Code,
          FullName: user.FullNameTH,
          FullNameEN: user.FullNameEN,
          Department: user.Department,
          O365_Email: user.Email
        }
      };
    }

    return { found: false };
  },

  /**
   * [Form 1.1 - Submit UAR]
   * บันทึกคำขอสิทธิ์ UAR ใหม่ (Status = Pending)
   */
  submitUAR: function(payload, lineUid) {
    return withLock(() => {
      const reqId = 'UAR_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      const newRecord = {
        'Req_ID': reqId,
        'Req_Type': payload.Req_Type || 'ผู้ใช้ใหม่',
        'Req_Date': payload.Req_Date || now,
        'Handover_Date': payload.Handover_Date || '',
        'Handover_Time': payload.Handover_Time || '',
        'Emp_Code': payload.Emp_Code,
        'FullName': payload.FullName,
        'FullNameEN': payload.FullNameEN || '',
        'Department': payload.Department || '',
        'Role_Requested': Array.isArray(payload.Role_Requested) ? payload.Role_Requested.join(', ') : payload.Role_Requested,
        'Agree_Terms': false,
        'O365_Email': payload.O365_Email || '',
        'Computer_Name': payload.Computer_Name || '',
        'VPN_Access': payload.VPN_Access ? 'Yes' : 'No',
        'Req_Status': 'Pending',
        'Created_LineUID': lineUid || '',
        'Approve_LineUID': '',
        'Last_Update': now,
        'PDF_Link': ''
      };

      appendRow(CONFIG.SHEETS.ACCESS_REQUEST, newRecord);

      // สร้าง Notify Message
      Mod_Notify.addNotification(`มีรายการ UAR ใหม่รอการยืนยันสิทธิ์ (รหัสพนักงาน: ${payload.Emp_Code} - ${payload.FullName})`);

      writeSystemLog('Mod_AccessControl', 'INSERT_UAR', lineUid, payload);

      return {
        reqId: reqId,
        message: 'บันทึกคำขอสิทธิ์ UAR เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 1.2 - Get UAR Record for Deep Link]
   * ดึงข้อมูล UAR ตาม Req_ID และทำการ Auth Check
   */
  getUARForApprove: function(reqId, lineUid) {
    if (!reqId) throw new Error('Missing Req_ID parameter');

    const requests = readAllRows(CONFIG.SHEETS.ACCESS_REQUEST);
    const req = requests.find(r => String(r.Req_ID).trim() === String(reqId).trim());

    if (!req) throw new Error('ไม่พบรายการ UAR ตาม Req_ID ที่ระบุ');

    // Route B Auth Check: Line_UID ของผู้เข้าผ่าน Deep Link ต้อง match กับ Emp_Code ของรายการใน 01_Users_Profile
    const users = readAllRows(CONFIG.SHEETS.USERS_PROFILE);
    const currentUser = users.find(u => String(u.Line_UID).trim() === String(lineUid).trim());

    if (!currentUser) {
      throw new Error(`ไม่พบ Line_UID (${lineUid}) ของคุณในระบบ 01_Users_Profile กรุณาเพิ่ม Line_UID ของคุณลงใน Sheet 01_Users_Profile ก่อน`);
    }

    const reqEmpCode = String(req.Emp_Code || '').trim().toLowerCase();
    const userEmpCode = String(currentUser.Emp_Code || '').trim().toLowerCase();

    // เข้มงวดตาม Spec: ต้องเป็นเจ้าของรายการ (Emp_Code ตรงกัน) เท่านั้น
    if (userEmpCode !== reqEmpCode) {
      throw new Error(`คุณไม่มีสิทธิ์เข้าถึงรายการนี้ (Emp_Code ของคุณในระบบคือ '${currentUser.Emp_Code}' ไม่ตรงกับเจ้าของรายการคือ '${req.Emp_Code}')`);
    }

    return req;
  },

  /**
   * [Form 1.2 - Submit UAR Approve/Reject (Deep Link)]
   */
  submitUARApprove: function(payload, lineUid) {
    return withLock(() => {
      const reqId = payload.Req_ID;
      const action = payload.Action; // 'Approve' or 'Reject'

      // Validate Auth & Fetch Record
      const req = this.getUARForApprove(reqId, lineUid);

      if (req.Req_Status !== 'Pending') {
        throw new Error('รายการนี้ได้รับการดำเนินการไปเรียบร้อยแล้ว');
      }

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      if (action === 'Reject') {
        updateRow(CONFIG.SHEETS.ACCESS_REQUEST, 'Req_ID', reqId, {
          'Req_Status': 'Rejected',
          'Approve_LineUID': lineUid,
          'Last_Update': now
        });

        Mod_Notify.addNotification(`รายการ UAR (รหัส: ${req.Emp_Code}) ถูกปฏิเสธ (Rejected) โดยผู้ขอ`);
        writeSystemLog('Mod_AccessControl', 'REJECT_UAR', lineUid, payload);
        return { success: true, message: 'บันทึกการปฏิเสธรายการเรียบร้อยแล้ว' };
      }

      // Action === 'Approve'
      if (!payload.Agree_Terms) {
        throw new Error('กรุณากดยินยอมรับเงื่อนไขก่อนกดอนุมัติ');
      }

      // 1. Generate PDF
      const pdfData = {
        Req_ID: req.Req_ID,
        Req_Type: req.Req_Type,
        Req_Date: req.Req_Date,
        Emp_Code: req.Emp_Code,
        FullName: req.FullName,
        Role_Requested: req.Role_Requested,
        O365_Email: req.O365_Email,
        Computer_Name: req.Computer_Name,
        VPN_Access: req.VPN_Access,
        Approve_Date: now,
        Req_Status: 'Approved'
      };

      let pdfUrl = '';
      try {
        pdfUrl = generatePDF(CONFIG.TEMPLATES.FORM_UAR_APPROVE_DOC_ID, pdfData, `UAR_Approve_${req.Req_ID}`);
      } catch (e) {
        Logger.log('PDF Generation warning: ' + e.message);
      }

      // 2. Update 11_Access_Request
      updateRow(CONFIG.SHEETS.ACCESS_REQUEST, 'Req_ID', reqId, {
        'Agree_Terms': true,
        'Req_Status': 'Approved',
        'Approve_LineUID': lineUid,
        'Last_Update': now,
        'PDF_Link': pdfUrl
      });

      // 3. Create Asset Movement Record (ถ้าไม่ใช่ 'แก้ไขสิทธิ์')
      if (req.Req_Type !== 'แก้ไขสิทธิ์') {
        const docType = (req.Req_Type === 'ผู้ใช้ใหม่') ? '2-รับมอบ' : '1-ส่งคืน';
        const moveId = 'MOVE_' + new Date().getTime();

        // ใช้วันที่และเวลาส่งมอบ/รับคืนที่ผู้แจ้งระบุมาจาก Form 1.1 (Handover_Date หรือ Req_Date)
        let moveDateTime = req.Req_Date || now;
        if (req.Handover_Date) {
          const hTime = req.Handover_Time ? (req.Handover_Time.length === 5 ? `${req.Handover_Time}:00` : req.Handover_Time) : '00:00:00';
          moveDateTime = `${req.Handover_Date} ${hTime}`;
        }

        appendRow(CONFIG.SHEETS.ASSET_MOVEMENT, {
          'Move_ID': moveId,
          'Doc_Type': docType,
          'Computer_Name': req.Computer_Name,
          'Emp_Code': req.Emp_Code,
          'FullName': req.FullName,
          'Tel': '',
          'Move_DateTime': moveDateTime,
          'Remark': `สร้างอัตโนมัติจาก UAR Approve (${req.Req_ID})`,
          'Created_LineUID': lineUid,
          'Last_Update': now
        });
      }

      // 4. Notify & System Log
      Mod_Notify.addNotification(`รายการ UAR (รหัส: ${req.Emp_Code} - ${req.FullName}) ได้รับการกดยอมรับเรียบร้อยแล้ว`);
      writeSystemLog('Mod_AccessControl', 'APPROVE_UAR', lineUid, payload);

      return {
        success: true,
        message: 'อนุมัติคำขอสิทธิ์ UAR เรียบร้อยแล้ว',
        pdfUrl: pdfUrl
      };
    });
  },

  /**
   * [Form 1.3 - Fetch Details by Computer Name]
   * ดึงข้อมูลผู้ครอบครองล่าสุด และคำขอสิทธิ์ล่าสุดของคอมพิวเตอร์เพื่อทำ Access Review
   */
  getAccessReviewDetails: function(computerName) {
    if (!computerName) throw new Error('Computer Name is required');

    // 1. หา record ล่าสุดสถานะ 'รับมอบ' ใน 21_Asset_Movement
    const movements = readAllRows(CONFIG.SHEETS.ASSET_MOVEMENT);
    const compMoves = movements.filter(m => String(m.Computer_Name).trim() === String(computerName).trim() && String(m.Doc_Type).includes('รับมอบ'));
    
    let latestOwner = { Emp_Code: 'N/A', FullName: 'ไม่พบผู้รับมอบล่าสุด' };
    if (compMoves.length > 0) {
      const lastMove = compMoves[compMoves.length - 1];
      latestOwner = {
        Emp_Code: lastMove.Emp_Code,
        FullName: lastMove.FullName
      };
    }

    // 2. หา 11_Access_Request ล่าสุดที่ Req_Status=Approved ของพนักงานคนนั้น
    let latestRequest = { Role_Requested: 'N/A', O365_Email: 'N/A' };
    if (latestOwner.Emp_Code !== 'N/A') {
      const requests = readAllRows(CONFIG.SHEETS.ACCESS_REQUEST);
      const appReqs = requests.filter(r => String(r.Emp_Code).trim() === String(latestOwner.Emp_Code).trim() && String(r.Req_Status).trim() === 'Approved');
      if (appReqs.length > 0) {
        const lastReq = appReqs[appReqs.length - 1];
        latestRequest = {
          Role_Requested: lastReq.Role_Requested,
          O365_Email: lastReq.O365_Email
        };
      }
    }

    return {
      Computer_Name: computerName,
      Emp_Code: latestOwner.Emp_Code,
      FullName: latestOwner.FullName,
      Current_Role: latestRequest.Role_Requested,
      O365_Email: latestRequest.O365_Email
    };
  },

  /**
   * [Form 1.3 - Submit Access Review]
   */
  submitAccessReview: function(payload, lineUid) {
    return withLock(() => {
      const revId = 'REV_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      // Generate PDF
      const pdfData = {
        Rev_ID: revId,
        Review_Date: now,
        Computer_Name: payload.Computer_Name,
        Emp_Code: payload.Emp_Code,
        FullName: payload.FullName,
        Current_Role: payload.Current_Role,
        O365_Email: payload.O365_Email,
        Result: payload.Result,
        Remark: payload.Remark || ''
      };

      let pdfUrl = '';
      try {
        pdfUrl = generatePDF(CONFIG.TEMPLATES.FORM_ACCESS_REVIEW_DOC_ID, pdfData, `Access_Review_${revId}`);
      } catch (e) {
        Logger.log('PDF Generation warning: ' + e.message);
      }

      appendRow(CONFIG.SHEETS.ACCESS_REVIEW, {
        'Rev_ID': revId,
        'Review_Date': now,
        'Computer_Name': payload.Computer_Name,
        'Emp_Code': payload.Emp_Code,
        'FullName': payload.FullName,
        'O365_Email': payload.O365_Email,
        'Current_Role': payload.Current_Role,
        'Remark': payload.Remark || '',
        'Result': payload.Result,
        'Created_LineUID': lineUid,
        'Last_Update': now,
        'PDF_Link': pdfUrl
      });

      writeSystemLog('Mod_AccessControl', 'INSERT_ACCESS_REVIEW', lineUid, payload);

      return {
        revId: revId,
        message: 'บันทึกการทบทวนสิทธิ์เรียบร้อยแล้ว',
        pdfUrl: pdfUrl
      };
    });
  }

};
