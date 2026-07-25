/**
 * Mod_Notify.gs - Module for System Notifications & Message Board
 * จัดการ Form 8.1 (Message Notify Clear) และการส่งการแจ้งเตือนลง 04-Notify_message
 */

const Mod_Notify = {

  /**
   * ดึงรายการแจ้งเตือนทั้งหมด เรียงจากใหม่ไปเก่า
   */
  getNotifications: function() {
    const notifs = readAllRows(CONFIG.SHEETS.NOTIFY_MESSAGE);
    return notifs.reverse();
  },

  /**
   * เพิ่มข้อความแจ้งเตือนใหม่
   */
  addNotification: function(messageText) {
    if (!messageText || messageText.trim() === '') return;

    const logId = 'NTF_' + new Date().getTime() + '_' + Math.floor(Math.random() * 100);
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

    appendRow(CONFIG.SHEETS.NOTIFY_MESSAGE, {
      'LOG_ID': logId,
      'Last_update': now,
      'message': messageText
    });
  },

  /**
   * ลบข้อความแจ้งเตือนตาม LOG_ID (Form 8.1 - Clear Notify Message)
   */
  deleteNotification: function(logId, lineUid) {
    return withLock(() => {
      if (!logId) throw new Error('LOG_ID is required for deletion');

      const sheet = getSheet(CONFIG.SHEETS.NOTIFY_MESSAGE);
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return { success: false, message: 'ไม่พบรายการ' };

      const headers = data[0].map(h => String(h).trim());
      const pkIndex = headers.indexOf('LOG_ID');
      if (pkIndex === -1) throw new Error('LOG_ID header not found');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][pkIndex]) === String(logId)) {
          sheet.deleteRow(i + 1);
          writeSystemLog('Mod_Notify', 'DELETE_NOTIFICATION', lineUid, { LOG_ID: logId });
          return { success: true, message: 'ลบรายการแจ้งเตือนเรียบร้อยแล้ว' };
        }
      }

      return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };
    });
  },

  /**
   * ลบข้อความแจ้งเตือนทั้งหมด
   */
  clearAllNotifications: function(lineUid) {
    return withLock(() => {
      const sheet = getSheet(CONFIG.SHEETS.NOTIFY_MESSAGE);
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
        writeSystemLog('Mod_Notify', 'CLEAR_ALL_NOTIFICATIONS', lineUid, {});
      }
      return { success: true, message: 'ล้างรายการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว' };
    });
  }

};
