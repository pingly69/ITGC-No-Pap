/**
 * Code.gs - Main API Router & Entry Point (GAS Web App)
 * ทำหน้าที่เป็น API Router (doGet/doPost) ส่งคืน ContentService JSON เท่านั้น
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, httpMethod) {
  try {
    let params = {};
    if (httpMethod === 'GET') {
      params = e.parameter || {};
    } else {
      if (e.postData && e.postData.contents) {
        try {
          params = JSON.parse(e.postData.contents);
        } catch (parseErr) {
          params = e.parameter || {};
        }
      } else {
        params = e.parameter || {};
      }
    }

    const action = params.action || '';
    const lineUid = params.lineUid || params.Created_LineUID || params.Line_UID || '';

    // Route Actions
    switch (action) {

      // --- USER AUTH & MASTER DATA ---
      case 'get_user_profile': {
        const auth = checkRouteAAuth(lineUid, null);
        if (!auth.allowed) return jsonResponse('error', auth.message);
        return jsonResponse('success', 'User profile retrieved', auth.user);
      }

      case 'get_notifications': {
        const notifs = Mod_Notify.getNotifications();
        return jsonResponse('success', 'Notifications loaded', notifs);
      }

      case 'get_master_data': {
        const assets = Mod_ITAsset.getAssetMasterList();
        const profiles = Mod_PhysicalSecurity.getApproveProfiles();
        return jsonResponse('success', 'Master data loaded', { assets: assets, approveProfiles: profiles });
      }

      // --- MODULE 1: ACCESS CONTROL ---
      case 'get_latest_employee': {
        const res = Mod_AccessControl.getLatestEmployeeRecord(params.empCode);
        return jsonResponse('success', 'Employee search completed', res);
      }

      case 'submit_uar': {
        const auth = checkRouteAAuth(lineUid, 'Scr_01');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_AccessControl.submitUAR(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'get_uar_deeplink': {
        const record = Mod_AccessControl.getUARForApprove(params.req_id, lineUid);
        return jsonResponse('success', 'UAR record fetched for Deep Link', record);
      }

      case 'submit_uar_approve': {
        const res = Mod_AccessControl.submitUARApprove(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'get_access_review_details': {
        const auth = checkRouteAAuth(lineUid, 'Scr_03');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_AccessControl.getAccessReviewDetails(params.computerName);
        return jsonResponse('success', 'Access review details fetched', res);
      }

      case 'submit_access_review': {
        const auth = checkRouteAAuth(lineUid, 'Scr_03');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_AccessControl.submitAccessReview(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 2: IT ASSET ---
      case 'get_latest_owner_computer': {
        const res = Mod_ITAsset.getLatestOwnerByComputer(params.computerName);
        return jsonResponse('success', 'Latest owner fetched', res);
      }

      case 'submit_asset_movement': {
        const auth = checkRouteAAuth(lineUid, 'Scr_04');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_ITAsset.submitAssetMovement(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'submit_asset_destroy': {
        const auth = checkRouteAAuth(lineUid, 'Scr_05');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_ITAsset.submitAssetDestroy(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 3: OUTSOURCE ---
      case 'get_contracts': {
        const auth = checkRouteAAuth(lineUid, 'Scr_06');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const contracts = Mod_Outsource.getContracts();
        return jsonResponse('success', 'Contracts fetched', contracts);
      }

      case 'add_contract': {
        const auth = checkRouteAAuth(lineUid, 'Scr_06');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Outsource.addContract(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'update_contract': {
        const auth = checkRouteAAuth(lineUid, 'Scr_06');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Outsource.updateContract(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'delete_contract': {
        const auth = checkRouteAAuth(lineUid, 'Scr_06');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Outsource.deleteContract(params.contractId, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 4: CHANGE MANAGEMENT ---
      case 'get_change_requests': {
        const auth = checkRouteAAuth(lineUid, 'Scr_07');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const reqs = Mod_ChangeMgmt.getChangeRequests();
        return jsonResponse('success', 'Change requests fetched', reqs);
      }

      case 'submit_change_request': {
        const auth = checkRouteAAuth(lineUid, 'Scr_07');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_ChangeMgmt.submitChangeRequest(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'update_it_progress': {
        const auth = checkRouteAAuth(lineUid, 'Scr_07');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_ChangeMgmt.updateITProgress(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'get_uat_deeplink': {
        const record = Mod_ChangeMgmt.getUATRecordForDeepLink(params.req_id, lineUid);
        return jsonResponse('success', 'UAT record fetched for Deep Link', record);
      }

      case 'submit_uat_signoff': {
        const res = Mod_ChangeMgmt.submitUATSignOff(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'submit_deploy_signoff': {
        const auth = checkRouteAAuth(lineUid, 'Scr_10');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_ChangeMgmt.submitDeploySignOff(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 5: BACKUP & RECOVERY ---
      case 'submit_backup_log': {
        const auth = checkRouteAAuth(lineUid, 'Scr_11');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Backup.submitBackupLog(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'submit_recovery_test': {
        const auth = checkRouteAAuth(lineUid, 'Scr_12');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Backup.submitRecoveryTest(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 6: BCP & DRP ---
      case 'submit_drp_test': {
        const auth = checkRouteAAuth(lineUid, 'Scr_13');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_DRP.submitDRPTest(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'get_drp_deeplink': {
        const record = Mod_DRP.getDRPForApprove(params.req_id, lineUid);
        return jsonResponse('success', 'DRP record fetched for Deep Link', record);
      }

      case 'submit_approve_drp': {
        const res = Mod_DRP.submitApproveDRP(payload, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 7: PHYSICAL SECURITY ---
      case 'submit_server_room_req': {
        // Form 7.1 is Public Access - no checkRouteAAuth required
        const res = Mod_PhysicalSecurity.submitServerRoomRequest(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'get_server_room_deeplink': {
        const record = Mod_PhysicalSecurity.getServerRoomForApprove(params.req_id, lineUid);
        return jsonResponse('success', 'Server room record fetched for Deep Link', record);
      }

      case 'submit_approve_server_room': {
        const res = Mod_PhysicalSecurity.submitApproveServerRoom(params, lineUid);
        return jsonResponse('success', res.message, res);
      }

      // --- MODULE 8: NOTIFY BOARD ---
      case 'delete_notification': {
        const auth = checkRouteAAuth(lineUid, 'Scr_17');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Notify.deleteNotification(params.logId, lineUid);
        return jsonResponse('success', res.message, res);
      }

      case 'clear_all_notifications': {
        const auth = checkRouteAAuth(lineUid, 'Scr_17');
        if (!auth.allowed) return jsonResponse('error', auth.message);
        const res = Mod_Notify.clearAllNotifications(lineUid);
        return jsonResponse('success', res.message, res);
      }

      default:
        return jsonResponse('error', `Unknown or missing action parameter: '${action}'`);
    }

  } catch (error) {
    Logger.log('Global Error in handleRequest: ' + error.stack);
    return jsonResponse('error', error.message || 'An unexpected server error occurred');
  }
}
