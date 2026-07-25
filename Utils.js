/**
 * Utils.gs - Shared Utilities for IT Management & COSO-ITGC System
 * รวม helper functions ทั้งหมดที่ใช้ร่วมกันในโปรเจกต์
 */

/**
 * ดึง Spreadsheet Object
 */
function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('ยังไม่ได้กำหนด SPREADSHEET_ID ในไฟล์ config.js (กรุณาใส่ ID ของ Google Sheet ใน SPREADSHEET_ID)');
  }
  return ss;
}

/**
 * ดึง Sheet Object จากชื่อ Sheet
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found in Spreadsheet.`);
  }
  return sheet;
}

/**
 * อ่านข้อมูลทั้งหมดใน Sheet คืนค่าเป็น Array of Objects (ใช้บรรทัดแรกเป็น Key)
 */
function readAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
      }
      row[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) hasData = true;
    }
    if (hasData) {
      row['_rowNum'] = i + 1; // 1-indexed line number in sheet
      rows.push(row);
    }
  }
  return rows;
}

/**
 * เพิ่มแถวใหม่ลงใน Sheet ตามคอลัมน์ใน Header
 */
function appendRow(sheetName, rowObject) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  
  const newRow = headers.map(header => {
    let val = rowObject[header];
    if (val === undefined || val === null) return '';
    return val;
  });

  sheet.appendRow(newRow);
}

/**
 * อัปเดตข้อมูลใน Sheet โดยค้นหาจาก Primary Key
 */
function updateRow(sheetName, pkField, pkValue, updateObject) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;

  const headers = data[0].map(h => String(h).trim());
  const pkIndex = headers.indexOf(pkField);
  if (pkIndex === -1) throw new Error(`PK Field '${pkField}' not found in sheet '${sheetName}'.`);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][pkIndex]) === String(pkValue)) {
      headers.forEach((header, colIdx) => {
        if (updateObject.hasOwnProperty(header)) {
          let val = updateObject[header];
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * บันทึก Audit Log ลงใน Sheet 99_System_Log (บังคับทำทุก Action)
 */
function writeSystemLog(moduleName, actionType, lineUid, rawPayload) {
  try {
    const logId = 'LOG_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
    const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
    const rawJsonStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

    appendRow(CONFIG.SHEETS.SYSTEM_LOG, {
      'Log_ID': logId,
      'Timestamp': timestamp,
      'Line_UID': lineUid || '',
      'Module_Name': moduleName || '',
      'Action_Type': actionType || '',
      'Raw_JSON': rawJsonStr
    });
  } catch (e) {
    Logger.log('Error writing system log: ' + e.message);
  }
}

/**
 * สั่ง Execด้วย LockService เพื่อกัน Concurrent Write
 */
function withLock(callback) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const result = callback();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * สร้างไฟล์ PDF จาก Google Doc Template และ Replace ค่า {{fieldname}}
 */
function generatePDF(templateDocId, dataObject, outputFileName) {
  if (!templateDocId || templateDocId.trim() === '') {
    throw new Error('Template Doc ID is invalid.');
  }

  // 1. Copy Template Doc ไปยัง Folder เป้าหมาย
  const templateFile = DriveApp.getFileById(templateDocId);
  const targetFolder = DriveApp.getFolderById(CONFIG.FOLDERS.PDF_FOLDER_ID);
  const copiedFile = templateFile.makeCopy(outputFileName, targetFolder);
  const doc = DocumentApp.openById(copiedFile.getId());
  const body = doc.getBody();

  // 2. Replace {{fieldname}} ด้วยข้อมูลจาก dataObject
  for (const key in dataObject) {
    const placeholder = `{{${key}}}`;
    let value = dataObject[key];
    if (value === null || value === undefined) value = '';
    body.replaceText(placeholder, String(value));
  }

  // 3. Auditor Requirement: เพิ่ม Timestamp ที่มุมขวาบน (หรือท้ายเอกสาร)
  const currentTimestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
  body.appendParagraph(`Generated on: ${currentTimestamp} (Server Time)`).setFontSize(8).setItalic(true);

  doc.saveAndClose();

  // 4. แปลงไฟล์ Doc เป็น PDF
  const pdfBlob = copiedFile.getAs('application/pdf');
  pdfBlob.setName(outputFileName + '.pdf');
  const pdfFile = targetFolder.createFile(pdfBlob);

  // 5. ลบไฟล์ Doc ชั่วคราว
  copiedFile.setTrashed(true);

  // 6. ตั้งสิทธิ์ให้ทุกคนที่มี Link อ่านได้ (เพื่อแสดงในเว็บ)
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return pdfFile.getUrl();
}

/**
 * บันทึกไฟล์ Upload (Base64) ลง Google Drive
 */
function saveUploadedFile(base64Data, filename, mimeType) {
  const folder = DriveApp.getFolderById(CONFIG.FOLDERS.UPLOAD_FOLDER_ID);
  const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
  const blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/**
 * การตรวจสอบสิทธิ์เข้าถึงฝั่ง Backend (Route A - ฟอร์มปกติ)
 */
function checkRouteAAuth(lineUid, requiredScrKey) {
  if (!lineUid) return { allowed: false, message: 'Missing Line_UID' };

  const users = readAllRows(CONFIG.SHEETS.USERS_PROFILE);
  const user = users.find(u => String(u.Line_UID).trim() === String(lineUid).trim());

  if (!user) return { allowed: false, message: 'คุณไม่มีสิทธิ์เข้าใช้งานระบบ (ไม่พบใน Users Profile)' };
  
  const isActive = String(user.Is_Active).trim().toLowerCase();
  if (isActive !== 'yes' && isActive !== 'true' && isActive !== '1') {
    return { allowed: false, message: 'บัญชีผู้ใช้งานของคุณถูกระงับ (Is_Active = No)' };
  }

  if (requiredScrKey) {
    const scrVal = String(user[requiredScrKey]).trim().toLowerCase();
    if (scrVal !== 'yes' && scrVal !== 'true' && scrVal !== '1') {
      return { allowed: false, message: `คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ (${requiredScrKey})` };
    }
  }

  return { allowed: true, user: user };
}

/**
 * Format ผลลัพธ์กลับไปยัง Frontend เป็น ContentService JSON
 */
function jsonResponse(status, message, data = null) {
  const response = {
    status: status,
    message: message,
    data: data,
    timestamp: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT)
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
