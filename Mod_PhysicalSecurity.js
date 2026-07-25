/**
 * Mod_PhysicalSecurity.gs - Module for Physical Security
 * จัดการ Form 7.1 (Server Room Access Request - Public) และ Form 7.2 (Approve Server Room Access - Deep Link)
 */

const Mod_PhysicalSecurity = {

  /**
   * ดึงรายการ Profile ผู้อนุมัติจาก 02_Approve_Profile สำหรับแสดงใน Dropdown
   */
  getApproveProfiles: function() {
    const profiles = readAllRows(CONFIG.SHEETS.APPROVE_PROFILE);
    return profiles.map(p => ({
      Profile_Name: p.Profile_Name,
      FullName: p.FullName,
      Department: p.Department
    }));
  },

  /**
   * [Form 7.1 - Submit Server Room Access Request (Public)]
   */
  submitServerRoomRequest: function(payload, lineUid) {
    return withLock(() => {
      const logId = 'SR_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      appendRow(CONFIG.SHEETS.SERVER_ROOM, {
        'Log_ID': logId,
        'Req_Date': payload.Req_Date || now,
        'Visitor_Name': payload.Visitor_Name || '',
        'Purpose': payload.Purpose || '',
        'Status': 'Pending',
        'Approve_Profile': payload.Approve_Profile || '',
        'Req_LineUID': lineUid || '',
        'PDF_Link': '',
        'Approve_LineUID': '',
        'Approve_Datetime': '',
        'Last_Update': now
      });

      Mod_Notify.addNotification(`มีรายการขอเข้าห้อง Server Room (ผู้ขอ: ${payload.Visitor_Name}) รอการอนุมัติจาก (${payload.Approve_Profile})`);
      writeSystemLog('Mod_PhysicalSecurity', 'INSERT_SERVER_ROOM_REQ', lineUid, payload);

      return {
        logId: logId,
        message: 'บันทึกคำขอเข้าห้อง Server Room เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 7.2 - Get Record for Deep Link]
   * Auth Check: Line_UID ผู้เข้ามา -> ต้องตรงกับ Line_UID ใน 02_Approve_Profile ของ Profile ที่ระบุไว้
   */
  getServerRoomForApprove: function(logId, lineUid) {
    if (!logId) throw new Error('Log_ID is required');

    const requests = readAllRows(CONFIG.SHEETS.SERVER_ROOM);
    const item = requests.find(r => String(r.Log_ID).trim() === String(logId).trim());

    if (!item) throw new Error('ไม่พบรายการขอเข้าห้อง Server Room ตาม Log_ID ที่ระบุ');

    // Route B Auth Check: Match Line_UID in 02_Approve_Profile
    const approveProfiles = readAllRows(CONFIG.SHEETS.APPROVE_PROFILE);
    const targetProfile = approveProfiles.find(p => String(p.Profile_Name).trim() === String(item.Approve_Profile).trim());

    if (!targetProfile || String(targetProfile.Line_UID).trim() !== String(lineUid).trim()) {
      throw new Error('คุณไม่มีสิทธิ์อนุมัติรายการนี้ (Line_UID ไม่ตรงกับ Profile ผู้อนุมัติที่ระบุ)');
    }

    return item;
  },

  /**
   * [Form 7.2 - Submit Approve Server Room Access (Deep Link)]
   */
  submitApproveServerRoom: function(payload, lineUid) {
    return withLock(() => {
      const logId = payload.Log_ID;
      const item = this.getServerRoomForApprove(logId, lineUid);

      if (item.Status !== 'Pending') {
        throw new Error('รายการนี้ได้รับการอนุมัติไปเรียบร้อยแล้ว');
      }

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      // Generate PDF
      const pdfData = {
        Log_ID: item.Log_ID,
        Req_Date: item.Req_Date,
        Visitor_Name: item.Visitor_Name,
        Purpose: item.Purpose,
        Approve_Profile: item.Approve_Profile,
        Approve_Datetime: now
      };

      let pdfUrl = '';
      try {
        pdfUrl = generatePDF(CONFIG.TEMPLATES.FORM_SERVERROOM_DOC_ID, pdfData, `ServerRoom_Access_${item.Log_ID}`);
      } catch (e) {
        Logger.log('PDF Generation warning: ' + e.message);
      }

      updateRow(CONFIG.SHEETS.SERVER_ROOM, 'Log_ID', logId, {
        'Status': 'Approved',
        'PDF_Link': pdfUrl,
        'Approve_LineUID': lineUid,
        'Approve_Datetime': now,
        'Last_Update': now
      });

      Mod_Notify.addNotification(`คำขอเข้าห้อง Server Room (ผู้ขอ: ${item.Visitor_Name}) ได้รับการอนุมัติเรียบร้อยแล้ว`);
      writeSystemLog('Mod_PhysicalSecurity', 'APPROVE_SERVER_ROOM', lineUid, payload);

      return {
        success: true,
        message: 'อนุมัติการเข้าห้อง Server Room เรียบร้อยแล้ว',
        pdfUrl: pdfUrl
      };
    });
  }

};
