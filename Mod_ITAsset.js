/**
 * Mod_ITAsset.gs - Module for IT Asset Management
 * จัดการ Form 2.1 (Asset Movement), Form 2.2 (Asset Destroy), และ IT Asset Master Lookup
 */

const Mod_ITAsset = {

  /**
   * ดึงรายชื่อคอมพิวเตอร์และทรัพย์สินจาก 03_IT_Asset_Master สำหรับ Dropdown
   */
  getAssetMasterList: function() {
    const assets = readAllRows(CONFIG.SHEETS.IT_ASSET_MASTER);
    return assets.map(a => ({
      Computer_Name: a.Computer_Name,
      Asset_Type: a.Asset_Type,
      Status: a.Status
    }));
  },

  /**
   * [Form 2.1 - Get Latest Owner]
   * ดึงข้อมูลผู้ครอบครองคอมพิวเตอร์คนล่าสุดจาก 21_Asset_Movement
   */
  getLatestOwnerByComputer: function(computerName) {
    if (!computerName) return { found: false };

    const movements = readAllRows(CONFIG.SHEETS.ASSET_MOVEMENT);
    const compMoves = movements.filter(m => String(m.Computer_Name).trim() === String(computerName).trim());

    if (compMoves.length > 0) {
      const latest = compMoves[compMoves.length - 1];
      return {
        found: true,
        data: {
          Emp_Code: latest.Emp_Code,
          FullName: latest.FullName,
          Tel: latest.Tel || ''
        }
      };
    }
    return { found: false };
  },

  /**
   * [Form 2.1 - Submit Asset Movement]
   * บันทึกโอนย้ายทรัพย์สิน (ไม่มี PDF และไม่มีขั้นตอนอนุมัติ)
   */
  submitAssetMovement: function(payload, lineUid) {
    return withLock(() => {
      const moveId = 'MOVE_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      appendRow(CONFIG.SHEETS.ASSET_MOVEMENT, {
        'Move_ID': moveId,
        'Doc_Type': payload.Doc_Type, // '1-ส่งคืน' หรือ '2-รับมอบ'
        'Computer_Name': payload.Computer_Name,
        'Emp_Code': payload.Emp_Code,
        'FullName': payload.FullName,
        'Tel': payload.Tel || '',
        'Move_DateTime': payload.Move_DateTime || now,
        'Remark': payload.Remark || '',
        'Created_LineUID': lineUid,
        'Last_Update': now
      });

      writeSystemLog('Mod_ITAsset', 'INSERT_ASSET_MOVEMENT', lineUid, payload);

      return {
        moveId: moveId,
        message: 'บันทึกการโอนย้ายทรัพย์สินเรียบร้อยแล้ว'
      };
    });
  },

  /**
   * [Form 2.2 - Submit Asset Destroy]
   * บันทึกการทำลายสื่อบันทึกข้อมูล พร้อมอัปโหลดรูปภาพหลักฐานลง Google Drive
   */
  submitAssetDestroy: function(payload, lineUid) {
    return withLock(() => {
      const destroyId = 'DES_' + new Date().getTime();
      const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

      let uploadUrl = '';
      if (payload.ImageData) {
        try {
          const filename = `AssetDestroy_${destroyId}.jpg`;
          uploadUrl = saveUploadedFile(payload.ImageData, filename, 'image/jpeg');
        } catch (e) {
          Logger.log('Upload image failed: ' + e.message);
        }
      }

      appendRow(CONFIG.SHEETS.ASSET_DESTROY, {
        'Destroy_ID': destroyId,
        'Destroy_Date': now,
        'Remark': payload.Remark || '',
        'Upload_Link': uploadUrl,
        'Created_LineUID': lineUid,
        'Last_Update': now
      });

      writeSystemLog('Mod_ITAsset', 'INSERT_ASSET_DESTROY', lineUid, payload);

      return {
        destroyId: destroyId,
        message: 'บันทึกการทำลายสื่อบันทึกข้อมูลเรียบร้อยแล้ว',
        uploadUrl: uploadUrl
      };
    });
  }

};
