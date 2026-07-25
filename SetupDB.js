/**
 * SetupDB.js - Database Initializer & Migration Helper
 * ทำหน้าที่สร้าง Sheet ทั้งหมด 15 ตาราง พร้อมตั้งค่า Header และข้อมูลเริ่มต้น (Master Data) โดยอัตโนมัติ
 */

function setupDatabase() {
  const ss = getSpreadsheet();
  console.log("Starting Database Setup on Spreadsheet: " + ss.getName());

  const schema = {
    '01_Users_Profile': [
      'Line_UID', 'Line_ProfileName', 'FullNameTH', 'FullNameEN', 'Emp_Code', 'Department', 
      'Tel', 'Email', 'Is_Active', 'Last_Update', 
      'Scr_01', 'Scr_02', 'Scr_03', 'Scr_04', 'Scr_05', 'Scr_06', 'Scr_07', 'Scr_08', 
      'Scr_09', 'Scr_10', 'Scr_11', 'Scr_12', 'Scr_13', 'Scr_14', 'Scr_15', 'Scr_16', 'Scr_17'
    ],
    '02_Approve_Profile': [
      'Profile_Name', 'FullName', 'Emp_Code', 'Department', 'Tel', 'Email', 'Line_UID'
    ],
    '03_IT_Asset_Master': [
      'Computer_Name', 'Asset_Type', 'Status'
    ],
    '04-Notify_message': [
      'LOG_ID', 'Last_update', 'message'
    ],
    '11_Access_Request': [
      'Req_ID', 'Req_Type', 'Req_Date', 'Emp_Code', 'FullName', 'Role_Requested', 
      'Agree_Terms', 'O365_Email', 'Computer_Name', 'VPN_Access', 'Req_Status', 
      'Created_LineUID', 'Approve_LineUID', 'Last_Update', 'PDF_Link'
    ],
    '12_Access_Review': [
      'Rev_ID', 'Review_Date', 'Computer_Name', 'Emp_Code', 'FullName', 'O365_Email', 
      'Current_Role', 'Remark', 'Result', 'Created_LineUID', 'Last_Update', 'PDF_Link'
    ],
    '21_Asset_Movement': [
      'Move_ID', 'Doc_Type', 'Computer_Name', 'Emp_Code', 'FullName', 'Tel', 
      'Move_DateTime', 'Remark', 'Created_LineUID', 'Last_Update'
    ],
    '22_Asset_Destroy': [
      'Destroy_ID', 'Destroy_Date', 'Remark', 'Upload_Link', 'Created_LineUID', 'Last_Update'
    ],
    '31_Outsource': [
      'Contract_ID', 'Vendor_Name', 'Contract_No', 'Subject', 'Start_Date', 'End_Date', 
      'Budget', 'name_contract', 'email_contract', 'TEL_contract', 'Contract_Type', 
      'PDF_Upload_Link', 'Is_Active', 'Last_Update'
    ],
    '41_Change_Req': [
      'Req_ID', 'Req_Type', 'Subject', 'Detail', 'Priority', 'Req_Date', 'Req_Name', 
      'EMP_CODE', 'Approve_Profile', 'Status', 'IT_Vendor', 'IT_Plan', 'UAT_Date', 
      'UAT_LineUID', 'Deploy_Date', 'Deploy_UID', 'Last_Update'
    ],
    '51_Backup_Log': [
      'Log_ID', 'Backup_Date', 'Job_Type', 'Status', 'Remark', 'Created_LineUID', 'Last_Update', 'PDF_Link'
    ],
    '52_Recovery_Test': [
      'Test_ID', 'Test_Date', 'From_Bk_Date', 'Status', 'Detail', 'Created_LineUID', 'Last_Update', 'PDF_Link'
    ],
    '61_DRP_Test': [
      'DRP_ID', 'Test_Date', 'Subject', 'Detail', 'Upload_Link', 'Result', 'Status', 
      'Approve_Profile', 'PDF_Link', 'Approve_LineUID', 'Approve_Datetime', 'Last_Update'
    ],
    '71_ServerRoom': [
      'Log_ID', 'Req_Date', 'Visitor_Name', 'Purpose', 'Status', 'Approve_Profile', 
      'Req_LineUID', 'PDF_Link', 'Approve_LineUID', 'Approve_Datetime', 'Last_Update'
    ],
    '99_System_Log': [
      'Log_ID', 'Timestamp', 'Line_UID', 'Module_Name', 'Action_Type', 'Raw_JSON'
    ]
  };

  const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

  for (const sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      console.log(`Created new sheet: '${sheetName}'`);
    }

    const headers = schema[sheetName];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // Formatting Header Row: Deep Navy background, White bold text, Freeze Top Row
    headerRange.setBackground('#1E3A8A');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // ===== SEED SAMPLE MASTER DATA =====
  // 1. Initial Admin User Profile in 01_Users_Profile
  const userSheet = ss.getSheetByName('01_Users_Profile');
  if (userSheet.getLastRow() === 1) {
    userSheet.appendRow([
      'UID_DEV_IT_001', 'IT Admin Dev', 'เจ้าหน้าที่ ไอที', 'IT Admin Staff', 'EMP001', 'IT Department', 
      '0812345678', 'it@company.com', 'Yes', now,
      'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes'
    ]);
  }

  // 2. Initial Approve Profiles in 02_Approve_Profile
  const approveSheet = ss.getSheetByName('02_Approve_Profile');
  if (approveSheet.getLastRow() === 1) {
    approveSheet.appendRow(['CEO', 'กรรมการผู้จัดการ (CEO)', 'EMP000', 'Executive', '0800000000', 'ceo@company.com', 'UID_CEO_001']);
    approveSheet.appendRow(['IT Manager', 'ผู้จัดการฝ่ายไอที', 'EMP002', 'IT Department', '0811111111', 'it_mgr@company.com', 'UID_ITMGR_001']);
  }

  // 3. Initial IT Asset Master in 03_IT_Asset_Master
  const assetSheet = ss.getSheetByName('03_IT_Asset_Master');
  if (assetSheet.getLastRow() === 1) {
    assetSheet.appendRow(['NB-IT-001', 'Laptop', 'Active']);
    assetSheet.appendRow(['PC-ACC-002', 'Desktop', 'Active']);
    assetSheet.appendRow(['NB-SALES-003', 'Laptop', 'Active']);
  }

  // 4. Initial System Notification
  const notifySheet = ss.getSheetByName('04-Notify_message');
  if (notifySheet.getLastRow() === 1) {
    notifySheet.appendRow(['NTF_INIT', now, 'ตารางข้อมูลและโครงสร้างระบบ ITGC ถูกเตรียมพร้อมเรียบร้อยแล้ว']);
  }

  console.log("Database Setup Completed Successfully!");
  return {
    success: true,
    message: 'เตรียมโครงสร้าง Google Sheets ทั้งหมด 15 ตาราง พร้อม Master Data เริ่มต้นเรียบร้อยแล้ว!'
  };
}
