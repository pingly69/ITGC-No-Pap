/**
 * config.gs - IT Management & COSO-ITGC Compliance System
 * รวมค่าคงที่และ Configuration ทั้งหมดของระบบไว้ที่จุดเดียว
 */

// Spreadsheet Configuration
const CONFIG = {
  // Spreadsheet ID (หากว่างไว้ จะใช้ SpreadsheetApp.getActiveSpreadsheet())
  SPREADSHEET_ID: '1dSMm3AT5_ge08BvNCD5gUpZGt9L62wVmfYLbOST9FXY',

  // Sheet Names
  SHEETS: {
    USERS_PROFILE: '01_Users_Profile',
    APPROVE_PROFILE: '02_Approve_Profile',
    IT_ASSET_MASTER: '03_IT_Asset_Master',
    NOTIFY_MESSAGE: '04-Notify_message',
    ACCESS_REQUEST: '11_Access_Request',
    ACCESS_REVIEW: '12_Access_Review',
    ASSET_MOVEMENT: '21_Asset_Movement',
    ASSET_DESTROY: '22_Asset_Destroy',
    OUTSOURCE: '31_Outsource',
    CHANGE_REQ: '41_Change_Req',
    BACKUP_LOG: '51_Backup_Log',
    RECOVERY_TEST: '52_Recovery_Test',
    DRP_TEST: '61_DRP_Test',
    SERVER_ROOM: '71_ServerRoom',
    SYSTEM_LOG: '99_System_Log'
  },

  // Google Doc Template IDs สำหรับสร้าง PDF
  TEMPLATES: {
    FORM_UAR_APPROVE_DOC_ID: '1j7yisKuS8vwpR0S862zSeTqkTo7KVJoyVM_KeP-YEF8',
    FORM_ACCESS_REVIEW_DOC_ID: '17t0Lw7tr35IvsQhvikccy-FXJcphPL3PSmg-lXE0YKk',
    FORM_RECOVERY_TEST_DOC_ID: '1Afil1dTvmo8uZf8V10oNZECR0LYZNwH5p0Qu2qyX1jY',
    FORM_DRP_TEST_DOC_ID: '17MjzmFieQ6CDuTocukEwwxmbEW-Kxo0038EvNUHILhc',
    FORM_SERVERROOM_DOC_ID: '1CifDMTIGRz6mkNRsOr5zlFoKXKO07_qJ8nzFbnA6YZI'
  },

  // Google Drive Folder IDs
  FOLDERS: {
    PDF_FOLDER_ID: '1z8iZy6wXtGRvVN-55bEFSxOAzoQPOHN4',
    UPLOAD_FOLDER_ID: '1zvFM2hDHBdS_BClm3Fo4cTl0ak-zcJUf'
  },

  // Timezone & Formatting Defaults
  TIMEZONE: 'Asia/Bangkok',
  DATE_FORMAT: 'yyyy-MM-dd HH:mm:ss'
};
