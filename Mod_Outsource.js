/**
 * Mod_Outsource.gs - Module for Outsourcing Control
 * จัดการ Form 3.1 (Contract Management) การทำ CRUD สัญญา และ Soft Delete
 */

const Mod_Outsource = {

  /**
   * ดึงรายการสัญญาทั้งหมด (แสดงเฉพาะ Is_Active !== False)
   */
  getContracts: function() {
    const contracts = readAllRows(CONFIG.SHEETS.OUTSOURCE);
    return contracts.filter(c => String(c.Is_Active).toLowerCase() !== 'false');
  },

  /**
   * บันทึกสัญญาใหม่
   */
  addContract: function(payload, lineUid) {
    return withLock(() => {
      const contractId = 'CON_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      let pdfUrl = '';
      if (payload.PDFData) {
        try {
          const filename = `Contract_${contractId}.pdf`;
          pdfUrl = saveUploadedFile(payload.PDFData, filename, 'application/pdf');
        } catch (e) {
          Logger.log('Upload PDF failed: ' + e.message);
        }
      } else if (payload.PDF_Upload_Link) {
        pdfUrl = payload.PDF_Upload_Link;
      }

      appendRow(CONFIG.SHEETS.OUTSOURCE, {
        'Contract_ID': contractId,
        'Vendor_Name': payload.Vendor_Name || '',
        'Contract_No': payload.Contract_No || '',
        'Subject': payload.Subject || '',
        'Start_Date': payload.Start_Date || '',
        'End_Date': payload.End_Date || '',
        'Budget': payload.Budget || '',
        'name_contract': payload.name_contract || '',
        'email_contract': payload.email_contract || '',
        'TEL_contract': payload.TEL_contract || '',
        'Contract_Type': payload.Contract_Type || 'รายปี',
        'PDF_Upload_Link': pdfUrl,
        'Is_Active': 'True',
        'Last_Update': now
      });

      writeSystemLog('Mod_Outsource', 'INSERT_CONTRACT', lineUid, payload);

      return {
        contractId: contractId,
        message: 'บันทึกสัญญาใหม่เรียบร้อยแล้ว'
      };
    });
  },

  /**
   * แก้ไขข้อมูลสัญญา
   */
  updateContract: function(payload, lineUid) {
    return withLock(() => {
      const contractId = payload.Contract_ID;
      if (!contractId) throw new Error('Contract_ID is required for update');

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      let pdfUrl = payload.PDF_Upload_Link;
      if (payload.PDFData) {
        try {
          const filename = `Contract_${contractId}.pdf`;
          pdfUrl = saveUploadedFile(payload.PDFData, filename, 'application/pdf');
        } catch (e) {
          Logger.log('Upload PDF failed: ' + e.message);
        }
      }

      const updateData = {
        'Vendor_Name': payload.Vendor_Name,
        'Contract_No': payload.Contract_No,
        'Subject': payload.Subject,
        'Start_Date': payload.Start_Date,
        'End_Date': payload.End_Date,
        'Budget': payload.Budget,
        'name_contract': payload.name_contract,
        'email_contract': payload.email_contract,
        'TEL_contract': payload.TEL_contract,
        'Contract_Type': payload.Contract_Type,
        'PDF_Upload_Link': pdfUrl,
        'Last_Update': now
      };

      updateRow(CONFIG.SHEETS.OUTSOURCE, 'Contract_ID', contractId, updateData);

      writeSystemLog('Mod_Outsource', 'UPDATE_CONTRACT', lineUid, payload);

      return {
        success: true,
        message: 'ปรับปรุงข้อมูลสัญญาเรียบร้อยแล้ว'
      };
    });
  },

  /**
   * Soft Delete สัญญา (ปรับ Is_Active = False)
   */
  deleteContract: function(contractId, lineUid) {
    return withLock(() => {
      if (!contractId) throw new Error('Contract_ID is required for deletion');

      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      updateRow(CONFIG.SHEETS.OUTSOURCE, 'Contract_ID', contractId, {
        'Is_Active': 'False',
        'Last_Update': now
      });

      writeSystemLog('Mod_Outsource', 'SOFT_DELETE_CONTRACT', lineUid, { Contract_ID: contractId });

      return {
        success: true,
        message: 'ลบรายการสัญญา (Soft Delete) เรียบร้อยแล้ว'
      };
    });
  }

};
