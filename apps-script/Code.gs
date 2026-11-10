/**
 * Emunah website backend — Google Apps Script
 *
 * What it does
 *  - Receives the three website forms (Share Your Testimony, Join the Collective, Contact Us)
 *    and saves each one as a row in this Google Sheet.
 *  - Emails emunahfc@gmail.com whenever something new arrives.
 *  - Testimonies arrive as "Pending". Nothing is shown on the website until the Status
 *    is changed to "Approved".
 *  - When a testimony is set to "Approved", it appears in the website's testimony library
 *    and the contributor is emailed to let them know it is live.
 *
 * Setup is described step by step in SETUP.md.
 */

// ---------- Settings ----------
const TEAM_EMAIL = 'emunahfc@gmail.com';
const TESTIMONIES_PAGE = 'https://emunahfellowship.com/#testimonies';

// Email sent to a contributor when their testimony goes live.
// DRAFT WORDING: to be approved by the Emunah team before launch.
const LIVE_EMAIL_SUBJECT = 'Your testimony is now live';
const LIVE_EMAIL_BODY =
  'Dear {name},\n\n' +
  'Thank you for sharing what the Lord has done. Your testimony, "{title}", ' +
  'is now live on the Emunah website:\n\n' +
  TESTIMONIES_PAGE + '\n\n' +
  'With gratitude,\n' +
  'The Emunah Team';

// ---------- Sheet layout ----------
const TABS = {
  testimony: {
    name: 'Testimonies',
    headers: ['Submitted', 'ID', 'Name', 'Email', 'Title', 'Categories', 'Testimony',
              'Publish As', 'Consent', 'Status', 'Published On', 'Contributor Notified']
  },
  join: {
    name: 'Collective Registrations',
    headers: ['Submitted', 'Full Name', 'Email', 'WhatsApp', 'Age Range', 'Birthday (Day Month)',
              'Gender', 'Church Affiliation', 'How They Would Like to Connect', 'Newsletter']
  },
  contact: {
    name: 'Contact Messages',
    headers: ['Submitted', 'Full Name', 'Email Address', 'Subject', 'Message']
  }
};
const T = TABS.testimony.headers;
const COL = name => T.indexOf(name) + 1; // 1-based column number in the Testimonies tab

// ---------- One-time setup (run once from the editor) ----------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(TABS).forEach(tab => {
    let sh = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
    sh.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  // Status dropdown on the Testimonies tab
  const t = ss.getSheetByName(TABS.testimony.name);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Approved', 'Declined'], true).build();
  t.getRange(2, COL('Status'), t.getMaxRows() - 1, 1).setDataValidation(rule);
  t.setColumnWidth(COL('Testimony'), 420);
  // Trigger that emails the contributor when a testimony is approved
  ScriptApp.getProjectTriggers()
    .filter(tr => tr.getHandlerFunction() === 'onStatusEdit')
    .forEach(tr => ScriptApp.deleteTrigger(tr));
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(ss).onEdit().create();
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

// ---------- Receiving forms ----------
function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false }); }
  if (data.hp) return reply({ ok: true }); // spam trap filled in: ignore quietly

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();
    if (data.type === 'testimony') {
      const id = Utilities.getUuid().slice(0, 8);
      ss.getSheetByName(TABS.testimony.name).appendRow([
        now, id, clean(data.name), clean(data.email), clean(data.title),
        clean((data.categories || []).slice(0, 2).join(', ')), clean(data.testimony, 20000),
        data.publish === 'Anonymously' ? 'Anonymously' : 'With name',
        data.consent ? 'Yes' : 'No', 'Pending', '', ''
      ]);
      notifyTeam('New testimony awaiting review: ' + clean(data.title),
        'A new testimony has been submitted and is waiting for review.\n\n' +
        'Title: ' + data.title + '\nFrom: ' + data.name + '\n\n' +
        'Open the Emunah Sheet, read it in the Testimonies tab, and set its Status to Approved to publish it.\n\n' +
        ss.getUrl());
    } else if (data.type === 'join') {
      ss.getSheetByName(TABS.join.name).appendRow([
        now, clean(data.name), clean(data.email), clean(data.whatsapp), clean(data.ageRange),
        clean(data.birthday), clean(data.gender), clean(data.church),
        clean((data.connect || []).join(', ')), data.newsletter ? 'Yes' : 'No'
      ]);
      notifyTeam('New Join the Collective registration: ' + clean(data.name),
        'Name: ' + data.name + '\nEmail: ' + data.email + '\nWhatsApp: ' + data.whatsapp +
        '\nAge range: ' + data.ageRange + '\nBirthday: ' + data.birthday + '\nGender: ' + data.gender +
        '\nChurch: ' + data.church + '\nWould like to: ' + (data.connect || []).join(', ') +
        '\nNewsletter: ' + (data.newsletter ? 'Yes' : 'No'), data.email);
    } else if (data.type === 'contact') {
      ss.getSheetByName(TABS.contact.name).appendRow([
        now, clean(data.name), clean(data.email), clean(data.subject), clean(data.message, 20000)
      ]);
      notifyTeam('Website message: ' + clean(data.subject),
        'From: ' + data.name + ' <' + data.email + '>\n\n' + data.message, data.email);
    }
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// ---------- Serving approved testimonies to the website ----------
function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== 'testimonies') return reply({ ok: true });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.testimony.name);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, T.length).getValues() : [];
  const tz = Session.getScriptTimeZone();
  const out = rows
    .filter(r => String(r[COL('Status') - 1]).trim() === 'Approved')
    .map(r => {
      const when = r[COL('Published On') - 1] || r[COL('Submitted') - 1];
      return {
        title: String(r[COL('Title') - 1]),
        body: String(r[COL('Testimony') - 1]),
        name: r[COL('Publish As') - 1] === 'Anonymously' ? null : String(r[COL('Name') - 1]),
        categories: String(r[COL('Categories') - 1]).split(',').map(s => s.trim()).filter(Boolean),
        date: when instanceof Date ? Utilities.formatDate(when, tz, "yyyy-MM-dd'T'HH:mm:ss") : String(when)
      };
    });
  return reply({ testimonies: out });
}

// ---------- Approving a testimony ----------
function onStatusEdit(e) {
  const range = e.range, sh = range.getSheet();
  if (sh.getName() !== TABS.testimony.name || range.getRow() < 2) return;
  if (range.getColumn() > COL('Status') || range.getLastColumn() < COL('Status')) return;
  const first = range.getRow(), last = range.getLastRow();
  for (let row = first; row <= last; row++) {
    const status = String(sh.getRange(row, COL('Status')).getValue()).trim();
    if (status !== 'Approved') continue;
    if (!sh.getRange(row, COL('Published On')).getValue()) sh.getRange(row, COL('Published On')).setValue(new Date());
    if (sh.getRange(row, COL('Contributor Notified')).getValue()) continue; // email already sent once
    const email = String(sh.getRange(row, COL('Email')).getValue()).trim();
    if (!email) continue;
    const name = String(sh.getRange(row, COL('Name')).getValue()).trim().split(' ')[0] || 'friend';
    const title = String(sh.getRange(row, COL('Title')).getValue()).trim();
    MailApp.sendEmail({
      to: email,
      subject: LIVE_EMAIL_SUBJECT,
      body: LIVE_EMAIL_BODY.replace('{name}', name).replace('{title}', title),
      name: 'Emunah',
      replyTo: TEAM_EMAIL
    });
    sh.getRange(row, COL('Contributor Notified')).setValue(new Date());
  }
}

// ---------- Helpers ----------
function notifyTeam(subject, body, replyTo) {
  const opts = { to: TEAM_EMAIL, subject: subject, body: body, name: 'Emunah Website' };
  if (replyTo && /@/.test(replyTo)) opts.replyTo = replyTo;
  MailApp.sendEmail(opts);
}
function clean(v, max) {
  let s = String(v == null ? '' : v).slice(0, max || 2000).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formulas being injected
  return s;
}
function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
