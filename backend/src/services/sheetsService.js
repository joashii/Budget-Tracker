const google = require("../config/google");

async function findOrCreateSpreadsheet(authClient, name) {
  const drive = google.driveFor(authClient);
  const sheets = google.sheetsFor(authClient);

  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and trashed=false and mimeType='application/vnd.google-apps.spreadsheet'`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const created = await sheets.spreadsheets.create({
    requestBody: { properties: { title: name } },
  });
  return created.data.spreadsheetId;
}

async function getSpreadsheetMeta(authClient, spreadsheetId) {
  const sheets = google.sheetsFor(authClient);
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data;
}

async function getSheetIdByName(authClient, spreadsheetId, sheetName) {
  const meta = await getSpreadsheetMeta(authClient, spreadsheetId);
  const found = meta.sheets.find((s) => s.properties.title === sheetName);
  return found ? found.properties.sheetId : null;
}

async function addSheet(authClient, spreadsheetId, title) {
  const sheets = google.sheetsFor(authClient);
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  return res.data.replies[0].addSheet.properties.sheetId;
}

async function getValues(authClient, spreadsheetId, range) {
  const sheets = google.sheetsFor(authClient);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

async function setValues(authClient, spreadsheetId, range, values, valueInputOption = "USER_ENTERED") {
  const sheets = google.sheetsFor(authClient);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption,
    requestBody: { values },
  });
}

async function insertRowBefore(authClient, spreadsheetId, sheetId, rowIndex1Based) {
  const sheets = google.sheetsFor(authClient);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex1Based - 1, endIndex: rowIndex1Based },
            inheritFromBefore: false,
          },
        },
      ],
    },
  });
}

async function deleteRow(authClient, spreadsheetId, sheetId, rowIndex1Based) {
  const sheets = google.sheetsFor(authClient);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex1Based - 1, endIndex: rowIndex1Based },
          },
        },
      ],
    },
  });
}

async function styleHeader(authClient, spreadsheetId, sheetId, numCols) {
  const sheets = google.sheetsFor(authClient);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb("#0E1629"),
                textFormat: { bold: true, foregroundColor: hexToRgb("#91A9FC"), fontSize: 11 },
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
          },
        },
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
            bottom: { style: "SOLID_MEDIUM", color: hexToRgb("#3E527F") },
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ],
    },
  });
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

module.exports = {
  findOrCreateSpreadsheet,
  getSpreadsheetMeta,
  getSheetIdByName,
  addSheet,
  getValues,
  setValues,
  insertRowBefore,
  deleteRow,
  styleHeader,
};
