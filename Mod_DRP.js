/**
 * Mod_DRP.gs - Module for BCP & DRP Emergency Management
 * จัดการ Form 6.1 (DRP Test Log) และ Form 6.2 (Approve DRP Test - Deep Link)
 */

const Mod_DRP = {

  /**
   * [Form 6.1 - Submit DRP Test Log]
   */
  submitDRPTest: function(payload, lineUid) {
    return withLock(() => {
      const drpId = 'DRP_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      let uploadUrl = payload.Upload_Link || '';
      if (payload.UploadData) {
        try {
          const filename = `DRP_Attachment_${drpId}.pdf`;
          uploadUrl = saveUploadedFile(payload.UploadData, filename, 'application/pdf');
        } catch (e) {
          Logger.log('Upload attachment failed: ' + e.message);
        }
      }

      appendRow(CONFIG.SHEETS.DRP_TEST, {
        'DRP_ID': drpId,
        'Test_Date': payload.Test_Date || now,
        'Subject': payload.Subject || '',
        'Detail': payload.Detail || '',
        'Upload_Link': uploadUrl,
        'Result': payload.Result || 'ผ่าน',
        'Status': 'Pending',
        'Approve_Profile': payload.Approve_Profile || '',
        'PDF_Link': '',
        'Approve_LineUID': '',
        'Approve_Datetime': '',
        'Last_Update': now
      });

      Mod_Notify.addNotification(`มีรายการ DRP Test (${payload.Subject}) รอผู้อนุมัติ (${payload.Approve_Profile}) กดรับทราบ`);
      writeSystemLog('Mod_DRP', 'INSERT_DRP_TEST', lineUid, payload);

      return {
        drpId: drpId,
        message: 'บันทึก DRP Test Log เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 6.2 - Get DRP Record for Deep Link]
   * Auth Check: Line_UID ผู้เข้ามา -> ต้องตรงกับ Line_UID ใน 02_Approve_Profile ของ Profile ที่ระบุไว้
   */
  getDRPForApprove: function(drpId, lineUid) {
    if (!drpId) throw new Error('DRP_ID is required');

    const tests = readAllRows(CONFIG.SHEETS.DRP_TEST);
    const item = tests.find(d => String(d.DRP_ID).trim() === String(drpId).trim());

    if (!item) throw new Error('ไม่พบรายการ DRP Test ตาม DRP_ID ที่ระบุ');

    // Route B Auth Check: Match Line_UID in 02_Approve_Profile
    const approveProfiles = readAllRows(CONFIG.SHEETS.APPROVE_PROFILE);
    const targetProfile = approveProfiles.find(p => String(p.Profile_Name).trim() === String(item.Approve_Profile).trim());

    if (!targetProfile || String(targetProfile.Line_UID).trim() !== String(lineUid).trim()) {
      throw new Error('คุณไม่มีสิทธิ์อนุมัติรายการนี้ (Line_UID ไม่ตรงกับ Profile ผู้อนุมัติที่ระบุ)');
    }

    return item;
  },

  /**
   * [Form 6.2 - Submit Approve DRP Test (Deep Link)]
   */
  submitApproveDRP: function(payload, lineUid) {
    return withLock(() => {
      const drpId = payload.DRP_ID;
      const item = this.getDRPForApprove(drpId, lineUid);

      if (item.Status !== 'Pending') {
        throw new Error('รายการนี้ได้รับการอนุมัติ/รับทราบไปเรียบร้อยแล้ว');
      }

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      // Generate PDF
      const pdfData = {
        DRP_ID: item.DRP_ID,
        Test_Date: item.Test_Date,
        Subject: item.Subject,
        Detail: item.Detail,
        Result: item.Result,
        Approve_Profile: item.Approve_Profile,
        Approve_Datetime: now,
        Status: 'Approved',
        Upload_Link: item.Upload_Link || ''
      };

      let pdfUrl = '';
      try {
        pdfUrl = generatePDF(CONFIG.TEMPLATES.FORM_DRP_TEST_DOC_ID, pdfData, `DRP_Test_${item.DRP_ID}`);
      } catch (e) {
        Logger.log('PDF Generation warning: ' + e.message);
      }

      updateRow(CONFIG.SHEETS.DRP_TEST, 'DRP_ID', drpId, {
        'Status': 'Approved',
        'PDF_Link': pdfUrl,
        'Approve_LineUID': lineUid,
        'Approve_Datetime': now,
        'Last_Update': now
      });

      Mod_Notify.addNotification(`รายการ DRP Test (${item.Subject}) ได้รับการอนุมัติ/รับทราบเรียบร้อยแล้ว`);
      writeSystemLog('Mod_DRP', 'APPROVE_DRP_TEST', lineUid, payload);

      return {
        success: true,
        message: 'อนุมัติ/รับทราบผลการทดสอบ DRP เรียบร้อยแล้ว',
        pdfUrl: pdfUrl
      };
    });
  }

};
