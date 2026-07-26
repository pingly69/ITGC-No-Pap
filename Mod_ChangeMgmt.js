/**
 * Mod_ChangeMgmt.gs - Module for Change Management & Helpdesk
 * จัดการ Form 4.1 (Change Request / IT Update), Form 4.3 (UAT Sign-off - Deep Link), Form 4.4 (Deploy Sign-off)
 */

const Mod_ChangeMgmt = {

  /**
   * ดึงรายการ Change Request ทั้งหมด
   */
  getChangeRequests: function() {
    return readAllRows(CONFIG.SHEETS.CHANGE_REQ);
  },

  /**
   * [Form 4.1 - Submit / Open Ticket]
   * ผู้แจ้ง หรือ IT เปิด Ticket ใหม่ (Status = New)
   */
  submitChangeRequest: function(payload, lineUid) {
    return withLock(() => {
      const reqId = 'CHG_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      appendRow(CONFIG.SHEETS.CHANGE_REQ, {
        'Req_ID': reqId,
        'Req_Type': payload.Req_Type || '1.แจ้งปัญหาการใช้งาน',
        'Subject': payload.Subject || '',
        'Detail': payload.Detail || '',
        'Priority': payload.Priority || 'Medium',
        'Req_Date': payload.Req_Date || now,
        'Req_Name': payload.Req_Name || '',
        'EMP_CODE': payload.EMP_CODE || '',
        'Approve_Profile': '',
        'Status': 'New',
        'IT_Vendor': '',
        'IT_Plan': '',
        'UAT_Date': '',
        'UAT_LineUID': '',
        'Deploy_Date': '',
        'Deploy_UID': '',
        'Last_Update': now
      });

      Mod_Notify.addNotification(`มีรายการ Change Request ใหม่ (เรื่อง: ${payload.Subject} โดย ${payload.Req_Name})`);
      writeSystemLog('Mod_ChangeMgmt', 'INSERT_CHANGE_REQ', lineUid, payload);

      return {
        reqId: reqId,
        message: 'เปิด Ticket Change Request เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 4.1 - IT Update Ticket]
   * IT อัปเดตแผนการดำเนินงานและปรับสถานะ (New, Process, UAT, Cancel)
   */
  updateITProgress: function(payload, lineUid) {
    return withLock(() => {
      const reqId = payload.Req_ID;
      if (!reqId) throw new Error('Req_ID is required');

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
      const newStatus = payload.Status || 'Process';

      const updateData = {
        'IT_Vendor': payload.IT_Vendor || '',
        'IT_Plan': payload.IT_Plan || '',
        'Status': newStatus,
        'Last_Update': now
      };

      updateRow(CONFIG.SHEETS.CHANGE_REQ, 'Req_ID', reqId, updateData);

      if (newStatus === 'UAT') {
        Mod_Notify.addNotification(`รายการ Change Request (${reqId}) พร้อมสำหรับให้ผู้ใช้ทำ UAT Sign-off แล้ว`);
      }

      writeSystemLog('Mod_ChangeMgmt', 'IT_UPDATE_CHANGE_REQ', lineUid, payload);

      return {
        success: true,
        message: `อัปเดตสถานะเป็น ${newStatus} เรียบร้อยแล้ว`
      };
    });
  },

  /**
   * [Form 4.3 - Get Record for UAT Deep Link]
   * Auth Check: Line_UID ผู้เข้ามา -> หา Emp_Code ใน 01_Users_Profile -> ต้องตรงกับ EMP_CODE ของรายการ
   */
  getUATRecordForDeepLink: function(reqId, lineUid) {
    if (!reqId) throw new Error('Req_ID is required');

    const requests = readAllRows(CONFIG.SHEETS.CHANGE_REQ);
    const req = requests.find(r => String(r.Req_ID).trim() === String(reqId).trim());

    const users = readAllRows(CONFIG.SHEETS.USERS_PROFILE);
    const currentUser = users.find(u => String(u.Line_UID).trim() === String(lineUid).trim());

    if (!currentUser) {
      throw new Error(`ไม่พบ Line_UID (${lineUid}) ของคุณในระบบ 01_Users_Profile กรุณาเพิ่ม Line_UID ของคุณลงใน Sheet 01_Users_Profile ก่อน`);
    }

    const reqEmpCode = String(req.EMP_CODE || '').trim().toLowerCase();
    const userEmpCode = String(currentUser.Emp_Code || '').trim().toLowerCase();

    // เข้มงวดตาม Spec: ต้องเป็นผู้เปิด Ticket (EMP_CODE ตรงกัน) เท่านั้น
    if (userEmpCode !== reqEmpCode) {
      throw new Error(`คุณไม่มีสิทธิ์เข้าถึงรายการนี้ (EMP_CODE ของคุณในระบบคือ '${currentUser.Emp_Code}' ไม่ตรงกับผู้เปิด Ticket คือ '${req.EMP_CODE}')`);
    }

    return req;
  },

  /**
   * [Form 4.3 - Submit UAT Sign-off (Deep Link)]
   */
  submitUATSignOff: function(payload, lineUid) {
    return withLock(() => {
      const reqId = payload.Req_ID;
      const req = this.getUATRecordForDeepLink(reqId, lineUid);

      if (req.Status !== 'UAT') {
        throw new Error('รายการนี้ไม่อยู่ในสถานะพร้อมทำ UAT (สถานะปัจจุบัน: ' + req.Status + ')');
      }

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      updateRow(CONFIG.SHEETS.CHANGE_REQ, 'Req_ID', reqId, {
        'Status': 'UAT-Approved',
        'UAT_Date': now,
        'UAT_LineUID': lineUid,
        'Last_Update': now
      });

      Mod_Notify.addNotification(`รายการ Change Request (${reqId}) ผ่านการ UAT Sign-off แล้ว พร้อมสำหรับ Deploy`);
      writeSystemLog('Mod_ChangeMgmt', 'SUBMIT_UAT_APPROVED', lineUid, payload);

      return {
        success: true,
        message: 'บันทึก UAT Sign-off เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 4.4 - Submit Deploy Sign-off]
   * IT ยืนยันการนำขึ้นระบบจริง (กรองเฉพาะ Status = UAT-Approved)
   */
  submitDeploySignOff: function(payload, lineUid) {
    return withLock(() => {
      const reqId = payload.Req_ID;
      if (!reqId) throw new Error('Req_ID is required');

      const requests = readAllRows(CONFIG.SHEETS.CHANGE_REQ);
      const req = requests.find(r => String(r.Req_ID).trim() === String(reqId).trim());

      if (!req) throw new Error('ไม่พบรายการ Change Request');
      if (req.Status !== 'UAT-Approved') {
        throw new Error('รายการนี้ยังไม่ผ่านการ UAT Sign-off ไม่สามารถ Deploy ได้');
      }

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      updateRow(CONFIG.SHEETS.CHANGE_REQ, 'Req_ID', reqId, {
        'Status': 'Deployed',
        'Deploy_Date': now,
        'Deploy_UID': lineUid,
        'Last_Update': now
      });

      Mod_Notify.addNotification(`รายการ Change Request (${reqId}) ได้ถูก Deploy ขึ้นระบบเรียบร้อยแล้ว`);
      writeSystemLog('Mod_ChangeMgmt', 'SUBMIT_DEPLOYED', lineUid, payload);

      return {
        success: true,
        message: 'บันทึก Deploy Sign-off เรียบร้อยแล้ว'
      };
    });
  }

};
