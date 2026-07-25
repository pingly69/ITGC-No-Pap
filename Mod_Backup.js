/**
 * Mod_Backup.gs - Module for Backup & Recovery Management
 * จัดการ Form 5.1 (Backup Log) และ Form 5.2 (Recovery Test Log)
 */

const Mod_Backup = {

  /**
   * [Form 5.1 - Submit Backup Log]
   */
  submitBackupLog: function(payload, lineUid) {
    return withLock(() => {
      const logId = 'BK_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      appendRow(CONFIG.SHEETS.BACKUP_LOG, {
        'Log_ID': logId,
        'Backup_Date': payload.Backup_Date || now,
        'Job_Type': payload.Job_Type || 'NAS',
        'Status': payload.Status || 'ผ่าน',
        'Remark': payload.Remark || '',
        'Created_LineUID': lineUid,
        'Last_Update': now,
        'PDF_Link': ''
      });

      writeSystemLog('Mod_Backup', 'INSERT_BACKUP_LOG', lineUid, payload);

      return {
        logId: logId,
        message: 'บันทึก Backup Log เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 5.2 - Submit Recovery Test Log]
   * บันทึกการทดสอบ Recovery พร้อมสั่งสร้าง PDF จาก Template FORM_RECOVERY_TEST_DOC_ID
   */
  submitRecoveryTest: function(payload, lineUid) {
    return withLock(() => {
      const testId = 'REC_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      const pdfData = {
        Test_ID: testId,
        Test_Date: payload.Test_Date || now,
        From_Bk_Date: payload.From_Bk_Date || '',
        Status: payload.Status || 'ผ่าน',
        Detail: payload.Detail || ''
      };

      let pdfUrl = '';
      try {
        pdfUrl = generatePDF(CONFIG.TEMPLATES.FORM_RECOVERY_TEST_DOC_ID, pdfData, `Recovery_Test_${testId}`);
      } catch (e) {
        Logger.log('PDF Generation warning: ' + e.message);
      }

      appendRow(CONFIG.SHEETS.RECOVERY_TEST, {
        'Test_ID': testId,
        'Test_Date': payload.Test_Date || now,
        'From_Bk_Date': payload.From_Bk_Date || '',
        'Status': payload.Status || 'ผ่าน',
        'Detail': payload.Detail || '',
        'Created_LineUID': lineUid,
        'Last_Update': now,
        'PDF_Link': pdfUrl
      });

      writeSystemLog('Mod_Backup', 'INSERT_RECOVERY_TEST', lineUid, payload);

      return {
        testId: testId,
        message: 'บันทึกผลการทดสอบ Recovery Test เรียบร้อยแล้ว',
        pdfUrl: pdfUrl
      };
    });
  }

};
