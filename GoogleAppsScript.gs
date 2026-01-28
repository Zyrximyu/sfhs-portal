// Google Apps Script - Deploy as Web App
// This script handles all backend operations for the Permit Request System

// Configuration
const SHEET_ID = '1YM5erSUW5taFaFMyj0F8RQB6D9DABHPS38Ml09a4VPA'; // Replace with your Google Sheet ID
const SHEET_NAME = 'Sheet1';
const EMAIL_FROM = 'sfhsqcdeped'; // Replace with your email

// Initialize Sheet
function initializeSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
  
  if (headers[0] !== 'RequestID') {
    sheet.getRange(1, 1, 1, 10).setValues([[
      'RequestID',
      'FullName',
      'Email',
      'GradeSection',
      'PermitType',
      'Reason',
      'Date',
      'Status',
      'AdminRemarks',
      'Timestamp'
    ]]);
  }
}

// Generate unique Request ID
function generateRequestID() {
  return 'REQ-' + new Date().getTime();
}

// Handle POST requests
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    switch(action) {
      case 'submitRequest':
        return submitRequest(params);
      case 'updateRequest':
        return updateRequest(params);
      case 'getPendingRequests':
        return getPendingRequests();
      case 'getUserRequests':
        return getUserRequests(params.email);
      case 'approveRequest':
        return approveRequest(params);
      case 'rejectRequest':
        return rejectRequest(params);
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Invalid action'
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Submit a new request
function submitRequest(params) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const requestID = generateRequestID();
  
  const newRow = [
    requestID,
    params.fullName,
    params.email,
    params.gradeSection,
    params.permitType,
    params.reason,
    params.date,
    'Pending',
    '',
    new Date()
  ];
  
  sheet.appendRow(newRow);
  
  // Send confirmation email to user
  sendConfirmationEmail(params.email, params.fullName, requestID);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Request submitted successfully',
    requestID: requestID
  })).setMimeType(ContentService.MimeType.JSON);
}

// Update request status
function updateRequest(params) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.requestID) {
      sheet.getRange(i + 1, 8).setValue(params.status); // Update status
      if (params.adminRemarks) {
        sheet.getRange(i + 1, 9).setValue(params.adminRemarks); // Update remarks
      }
      
      // Send notification email
      sendStatusEmail(params.email, params.fullName, params.permitType, params.status, params.adminRemarks);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Request updated successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Request not found'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get all pending requests (for admin)
function getPendingRequests() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const requests = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === 'Pending') { // Status column
      requests.push({
        requestID: data[i][0],
        fullName: data[i][1],
        email: data[i][2],
        gradeSection: data[i][3],
        permitType: data[i][4],
        reason: data[i][5],
        date: data[i][6],
        status: data[i][7],
        adminRemarks: data[i][8],
        timestamp: data[i][9]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    requests: requests
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get requests for a specific user
function getUserRequests(email) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const requests = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) { // Email column
      requests.push({
        requestID: data[i][0],
        fullName: data[i][1],
        email: data[i][2],
        gradeSection: data[i][3],
        permitType: data[i][4],
        reason: data[i][5],
        date: data[i][6],
        status: data[i][7],
        adminRemarks: data[i][8],
        timestamp: data[i][9]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    requests: requests
  })).setMimeType(ContentService.MimeType.JSON);
}

// Approve request
function approveRequest(params) {
  return updateRequest({
    requestID: params.requestID,
    status: 'Approved',
    email: params.email,
    fullName: params.fullName,
    permitType: params.permitType,
    adminRemarks: params.adminRemarks || 'Approved'
  });
}

// Reject request
function rejectRequest(params) {
  return updateRequest({
    requestID: params.requestID,
    status: 'Rejected',
    email: params.email,
    fullName: params.fullName,
    permitType: params.permitType,
    adminRemarks: params.adminRemarks || 'Rejected'
  });
}

// Send confirmation email
function sendConfirmationEmail(email, fullName, requestID) {
  const subject = 'Permit Request Submitted - San Francisco High School';
  const message = `
Dear ${fullName},

Your permit request has been successfully submitted and is now pending approval.

Request ID: ${requestID}

You will receive another email notification once the administration has reviewed your request.

Best regards,
San Francisco High School Administration
  `;
  
  try {
    GmailApp.sendEmail(email, subject, message);
  } catch(error) {
    Logger.log('Email error: ' + error);
  }
}

// Send status notification email
function sendStatusEmail(email, fullName, permitType, status, remarks) {
  const subject = `Permit Request ${status} - San Francisco High School`;
  const statusMessage = status === 'Approved' 
    ? 'has been APPROVED. You may proceed with your absence as planned.'
    : 'has been REJECTED. Please contact the administration for more information.';
  
  const message = `
Dear ${fullName},

Your permit request for ${permitType} ${statusMessage}

Status: ${status}
${remarks ? 'Admin Remarks: ' + remarks : ''}

If you have any questions, please contact the administration office.

Best regards,
San Francisco High School Administration
  `;
  
  try {
    GmailApp.sendEmail(email, subject, message);
  } catch(error) {
    Logger.log('Email error: ' + error);
  }
}

// Test function (optional)
function testDeployment() {
  Logger.log('Deployment test successful');
}
