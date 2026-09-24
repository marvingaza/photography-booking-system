var FOLDER_NAME = 'LUMA Studio Bookings'; // Drive folder for generated PDFs
var STUDIO_NAME = 'LUMA Studio';

function doPost(e) {
  var response;
  try {
    var data = parseRequest(e);
    var validationError = validateBooking(data);

    if (validationError) {
      response = { success: false, message: validationError };
      return jsonResponse(response);
    }

    var bookingReference = generateBookingReference();
    var pdfBlob = generateConfirmationPdf(data, bookingReference);
    sendConfirmationEmail(data, bookingReference, pdfBlob);

    response = {
      success: true,
      bookingReference: bookingReference,
      message: 'Appointment confirmed and confirmation email sent.'
    };
  } catch (err) {
    // Log full technical detail privately; never expose it to the customer.
    Logger.log('doPost error: ' + err.message + '\n' + err.stack);
    response = {
      success: false,
      message: 'Unable to process your booking right now. Please try again shortly.'
    };
  }
  return jsonResponse(response);
}

/**
 * Handles a simple GET so visiting the Web App URL in a browser
 * confirms the deployment is live, instead of erroring.
 */
function doGet(e) {
  return jsonResponse({ success: true, message: 'Photography Booking API is running. Use POST to submit a booking.' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('empty_request_body');
  }
  return JSON.parse(e.postData.contents);
}

/* ---------------- Validation ---------------- */

function validateBooking(data) {
  if (!data) return 'No booking data received.';

  var required = ['fullName', 'email', 'contact', 'package', 'date', 'time', 'location', 'participants'];
  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    if (!data[key] && data[key] !== 0) {
      return 'Missing required field: ' + key + '.';
    }
  }

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) {
    return 'The email address provided is not valid.';
  }

  if (data.package === 'Other / Custom Request' && (!data.customRequest || !String(data.customRequest).trim())) {
    return 'Please describe your custom request.';
  }

  var participants = Number(data.participants);
  if (!isFinite(participants) || participants < 1 || Math.floor(participants) !== participants) {
    return 'Number of participants must be a valid positive whole number.';
  }

  var sessionDate = new Date(data.date + 'T00:00:00');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(sessionDate.getTime())) {
    return 'Session date is not valid.';
  }
  if (sessionDate < today) {
    return 'Session date cannot be in the past.';
  }

  return null; // no errors
}

/* ---------------- Booking reference ---------------- */

function generateBookingReference() {
  var year = new Date().getFullYear();
  var randomPart = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return 'PSB-' + year + '-' + randomPart;
}

/* ---------------- Document / PDF generation ---------------- */

function generateConfirmationPdf(data, bookingReference) {
  var doc = DocumentApp.create('Photography-Appointment-' + bookingReference);
  var body = doc.getBody();
  body.clear();

  body.appendParagraph(STUDIO_NAME.toUpperCase())
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph('Appointment Confirmation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  body.appendParagraph('Booking Reference: ' + bookingReference).setBold(true);
  body.appendParagraph('');

  body.appendParagraph('CUSTOMER INFORMATION').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph('Name: ' + data.fullName);
  body.appendParagraph('Email: ' + data.email);
  body.appendParagraph('Contact: ' + data.contact);
  body.appendParagraph('');

  body.appendParagraph('SESSION DETAILS').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph('Photography Package: ' + data.package);
  if (data.package === 'Other / Custom Request' && data.customRequest) {
    body.appendParagraph('Custom Request: ' + data.customRequest);
  }
  body.appendParagraph('Session Date: ' + formatDateForDisplay(data.date));
  body.appendParagraph('Session Time: ' + data.time);
  body.appendParagraph('Shoot Location: ' + data.location);
  body.appendParagraph('Number of Participants: ' + data.participants);
  body.appendParagraph('');

  if (data.weather) {
    body.appendParagraph('SESSION WEATHER').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph('Temperature: ' + data.weather.tempC + '°C');
    body.appendParagraph('Condition: ' + data.weather.condition);
    if (data.weather.humidity !== null && data.weather.humidity !== undefined) {
      body.appendParagraph('Humidity: ' + data.weather.humidity + '%');
    }
    body.appendParagraph('Wind: ' + data.weather.windKmh + ' km/h');
    body.appendParagraph('');
  }

  body.appendParagraph('STATUS: CONFIRMED').setBold(true);
  body.appendParagraph('');
  body.appendParagraph('Thank you for booking with us.');

  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs('application/pdf').setName('Photography-Appointment-' + bookingReference + '.pdf');

  // Move generated Doc + keep a copy of the PDF in a dedicated folder, then
  // remove the intermediate Google Doc so Drive doesn't accumulate clutter.
  var folder = getOrCreateFolder(FOLDER_NAME);
  folder.createFile(pdfBlob);
  docFile.setTrashed(true);

  return pdfBlob;
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function formatDateForDisplay(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

/* ---------------- Email ---------------- */

function sendConfirmationEmail(data, bookingReference, pdfBlob) {
  var subject = 'Photography Appointment Confirmation — ' + bookingReference;
  var body =
    'Hello ' + data.fullName + ',\n\n' +
    'Your photography session has been successfully confirmed.\n\n' +
    'Your appointment confirmation is attached to this email.\n\n' +
    'Booking Reference: ' + bookingReference + '\n\n' +
    'Thank you for choosing ' + STUDIO_NAME + '.\n\n' +
    'Regards,\n' + STUDIO_NAME;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    body: body,
    attachments: [pdfBlob]
  });
}