const sheetsApi = require("./sheetsService");

const SPREADSHEET_NAME = process.env.SPREADSHEET_NAME || "Budget Tracker — My Data";

const IGNORED_SHEETS = [
  "account_balance",
  "today", "weekly", "monthly", "yearly",
  "payables", "receivables",
  "history", "dashboard", "settings",
  "cash on hand",
];

const TAB_SCHEMA = [
  { name: "Account_Balance", cols: ["Total Balance"] },
  { name: "Today", cols: ["Date", "Timestamp", "Category", "Item Name", "Spendings", "Budget", "Source of Fund"] },
  { name: "Weekly", cols: ["Date", "Timestamp", "Category", "Item Name", "Spendings", "Budget", "Source of Fund"] },
  { name: "Monthly", cols: ["Date", "Timestamp", "Category", "Item Name", "Spendings", "Budget", "Source of Fund"] },
  { name: "Yearly", cols: ["Date", "Timestamp", "Category", "Item Name", "Spendings", "Budget", "Source of Fund"] },
  { name: "Payables", cols: ["Name", "Amount", "Description", "Date Managed", "Due Date", "Settled", "Balance", "Status"] },
  { name: "Receivables", cols: ["Name", "Amount", "Description", "Date Managed", "Due Date", "Settled", "Balance", "Status"] },
  { name: "Cash on Hand", cols: ["Date", "Description", "Amount In", "Amount Out", "Balance"] },
  { name: "Bank Account", cols: ["Deposit or Withdraw", "Amount", "Date", "Time", "Description", "Running Balance"] },
  { name: "Settings", cols: ["Key", "Value"] },
];

/**
 * Every exported function here takes `authClient` (the requesting user's
 * OAuth2Client, attached by the auth middleware as req.ctx.authClient) as its
 * first argument, and most take `spreadsheetId` as the second. Route handlers
 * pull both from req.ctx, so each user's data only ever touches their own sheet.
 */

/** Called once at login (see routes/auth.js) to create the user's sheet + tabs. */
async function ensureUserSpreadsheet(authClient, userId) {
  const id = await sheetsApi.findOrCreateSpreadsheet(authClient, SPREADSHEET_NAME);
  await ensureTabs(authClient, id);
  return id;
}

async function ensureTabs(authClient, spreadsheetId) {
  const meta = await sheetsApi.getSpreadsheetMeta(authClient, spreadsheetId);
  const existingNames = meta.sheets.map((s) => s.properties.title);

  for (const tab of TAB_SCHEMA) {
    if (existingNames.includes(tab.name)) continue;

    let sheetId;
    if (tab.name === "Account_Balance" && existingNames.includes("Sheet1")) {
      const s = meta.sheets.find((sh) => sh.properties.title === "Sheet1");
      sheetId = s.properties.sheetId;
      const google = require("../config/google");
      const sheetsClient = google.sheetsFor(authClient);
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ updateSheetProperties: { properties: { sheetId, title: "Account_Balance" }, fields: "title" } }],
        },
      });
    } else {
      sheetId = await sheetsApi.addSheet(authClient, spreadsheetId, tab.name);
    }

    await sheetsApi.setValues(authClient, spreadsheetId, `'${tab.name}'!A1`, [tab.cols]);
    if (tab.name === "Account_Balance") {
      await sheetsApi.setValues(authClient, spreadsheetId, `'${tab.name}'!A2`, [[0]]);
    }
    await sheetsApi.styleHeader(authClient, spreadsheetId, sheetId, tab.cols.length);
  }

  await rebuildBalanceFormula(authClient, spreadsheetId);
}

async function rebuildBalanceFormula(authClient, spreadsheetId) {
  const meta = await sheetsApi.getSpreadsheetMeta(authClient, spreadsheetId);
  const tokens = [];

  for (const s of meta.sheets) {
    const name = s.properties.title;
    if (IGNORED_SHEETS.includes(name.toLowerCase().trim())) continue;
    tokens.push(
      `(SUMIF('${name}'!A:A, "Deposit", '${name}'!B:B) - SUMIF('${name}'!A:A, "Withdrawal", '${name}'!B:B))`
    );
  }

  const cohExists = meta.sheets.some((s) => s.properties.title === "Cash on Hand");
  if (cohExists) {
    const cohVals = await sheetsApi.getValues(authClient, spreadsheetId, `'Cash on Hand'!A2:E2`);
    tokens.push(cohVals.length ? `'Cash on Hand'!E2` : "0");
  }

  const formula = tokens.length ? "=" + tokens.join("+") : "=0";
  await sheetsApi.setValues(authClient, spreadsheetId, `'Account_Balance'!A2`, [[formula]]);
}

// ---------- Account Balance ----------

async function getAccountBalance(authClient, spreadsheetId) {
  const vals = await sheetsApi.getValues(authClient, spreadsheetId, `'Account_Balance'!A2`);
  const v = vals[0] ? vals[0][0] : 0;
  return Number(v) || 0;
}

async function saveEditedBalance(authClient, spreadsheetId, newBalance) {
  await sheetsApi.setValues(authClient, spreadsheetId, `'Account_Balance'!A2`, [[Number(newBalance)]]);
  await rebuildBalanceFormula(authClient, spreadsheetId);
  return "Success";
}

// ---------- Sources of Funds ----------

async function getSourcesOfFunds(authClient, spreadsheetId) {
  const meta = await sheetsApi.getSpreadsheetMeta(authClient, spreadsheetId);
  const sources = [];

  for (const s of meta.sheets) {
    const name = s.properties.title;
    const lname = name.toLowerCase().trim();
    if (IGNORED_SHEETS.includes(lname)) continue;

    const vals = await sheetsApi.getValues(authClient, spreadsheetId, `'${name}'!F2`);
    const balance = vals.length ? Number(vals[0][0]) || 0 : 0;
    sources.push({ name, balance });
  }

  sources.push({ name: "Cash on Hand", balance: await getCashOnHandBalance(authClient, spreadsheetId), isCash: true });
  return sources;
}

async function getCashOnHandBalance(authClient, spreadsheetId) {
  const vals = await sheetsApi.getValues(authClient, spreadsheetId, `'Cash on Hand'!E2`);
  return vals.length ? Number(vals[0][0]) || 0 : 0;
}

async function createSourceOfFundTab(authClient, spreadsheetId, sourceName) {
  const existingId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, sourceName);
  if (existingId !== null) return "Exists";

  const walletCols = ["Deposit or Withdraw", "Amount", "Date", "Time", "Description", "Running Balance"];
  const sheetId = await sheetsApi.addSheet(authClient, spreadsheetId, sourceName);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sourceName}'!A1`, [walletCols]);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sourceName}'!A2`, [
    ["Deposit", 0, new Date().toISOString().slice(0, 10), new Date().toISOString(), "Opening account balance tracker line", 0],
  ]);
  await sheetsApi.styleHeader(authClient, spreadsheetId, sheetId, walletCols.length);
  await rebuildBalanceFormula(authClient, spreadsheetId);
  return "Created";
}

async function addCashOnHandTransaction(authClient, spreadsheetId, dateStr, desc, amountIn, amountOut) {
  const sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, "Cash on Hand");
  const existing = await sheetsApi.getValues(authClient, spreadsheetId, `'Cash on Hand'!A2:E2`);
  const hadPrevious = existing.length > 0;

  await sheetsApi.insertRowBefore(authClient, spreadsheetId, sheetId, 2);

  const balFormula = hadPrevious ? "=C2-D2+E3" : "=C2-D2";

  await sheetsApi.setValues(authClient, spreadsheetId, `'Cash on Hand'!A2:E2`, [
    [dateStr, desc || "", Number(amountIn) || 0, Number(amountOut) || 0, balFormula],
  ]);
}

async function processWalletTransaction(authClient, spreadsheetId, sourceName, actionType, amount, dateStr, desc, skipCashMirror) {
  const num = Number(amount);
  const isWithdrawal = ["withdraw", "withdrawal"].includes(String(actionType).toLowerCase());

  if (sourceName === "Cash on Hand") {
    const amtIn = actionType === "deposit" ? num : 0;
    const amtOut = isWithdrawal ? num : 0;
    await addCashOnHandTransaction(authClient, spreadsheetId, dateStr, desc, amtIn, amtOut);
    await rebuildBalanceFormula(authClient, spreadsheetId);
    return "Success";
  }

  const sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, sourceName);
  if (sheetId === null) return `Error: Source tab '${sourceName}' not found.`;

  const displayActionType = isWithdrawal ? "Withdrawal" : "Deposit";

  await sheetsApi.insertRowBefore(authClient, spreadsheetId, sheetId, 2);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sourceName}'!A2:E2`, [
    [displayActionType, num, dateStr, new Date().toISOString(), desc || ""],
  ]);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sourceName}'!F2`, [[`=IF(A2="Deposit", F3+B2, F3-B2)`]]);

  if (!skipCashMirror) {
    if (isWithdrawal) {
      await addCashOnHandTransaction(authClient, spreadsheetId, dateStr, `Withdrawn from ${sourceName}${desc ? " - " + desc : ""}`, num, 0);
    } else {
      await addCashOnHandTransaction(authClient, spreadsheetId, dateStr, `Deposited into ${sourceName}${desc ? " - " + desc : ""}`, 0, num);
    }
  }

  await rebuildBalanceFormula(authClient, spreadsheetId);
  return "Success";
}

// ---------- Budget Tracker ----------

async function addItemToDatabase(authClient, spreadsheetId, timeframe, selectedDate, category, itemName, spendings, budget, sourceName) {
  const sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, timeframe);
  if (sheetId === null) return `Error: Tab '${timeframe}' does not exist.`;

  const spendAmt = Number(spendings) || 0;

  await sheetsApi.insertRowBefore(authClient, spreadsheetId, sheetId, 2);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${timeframe}'!A2:G2`, [
    [selectedDate, new Date().toISOString(), category, itemName, spendAmt, Number(budget) || 0, sourceName || ""],
  ]);

  if (sourceName && spendAmt > 0) {
    const cleanSource = sourceName.trim();
    const desc = `${category} — ${itemName}`;

    if (cleanSource.toLowerCase() === "cash on hand") {
      await addCashOnHandTransaction(authClient, spreadsheetId, selectedDate, desc, 0, spendAmt);
    } else {
      await processWalletTransaction(authClient, spreadsheetId, cleanSource, "withdrawal", spendAmt, selectedDate, desc, true);
    }
    await rebuildBalanceFormula(authClient, spreadsheetId);
  }

  return "Success";
}

async function getTodaySpendings(authClient, spreadsheetId) {
  const rows = await sheetsApi.getValues(authClient, spreadsheetId, `'Today'!A2:G`);
  const today = new Date().toISOString().slice(0, 10);

  return rows
    .filter((row) => String(row[0] || "").slice(0, 10) === today)
    .map((row) => ({
      itemName: String(row[3] || ""),
      spendings: Number(row[4]) || 0,
      budget: Number(row[5]) || 0,
    }));
}

// ---------- Debt & Credit Ledger ----------

async function getDebtTotals(authClient, spreadsheetId) {
  async function colG(name) {
    const rows = await sheetsApi.getValues(authClient, spreadsheetId, `'${name}'!G2:G`);
    return rows.reduce((t, r) => t + (Number(r[0]) || 0), 0);
  }
  return { payables: await colG("Payables"), receivables: await colG("Receivables") };
}

async function addDebtRecord(authClient, spreadsheetId, type, name, amount, desc, dateStart, dateDue) {
  let sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, type);
  if (sheetId === null) {
    const debtCols = ["Name", "Amount", "Description", "Date Managed", "Due Date", "Settled", "Balance", "Status"];
    sheetId = await sheetsApi.addSheet(authClient, spreadsheetId, type);
    await sheetsApi.setValues(authClient, spreadsheetId, `'${type}'!A1`, [debtCols]);
    await sheetsApi.styleHeader(authClient, spreadsheetId, sheetId, debtCols.length);
  }

  await sheetsApi.insertRowBefore(authClient, spreadsheetId, sheetId, 2);
  await sheetsApi.setValues(authClient, spreadsheetId, `'${type}'!A2:H2`, [
    [name, Number(amount) || 0, desc || "", dateStart, dateDue, 0, "=B2-F2", "Unpaid"],
  ]);

  return "Success";
}

async function getDebtDirectory(authClient, spreadsheetId, type) {
  const rows = await sheetsApi.getValues(authClient, spreadsheetId, `'${type}'!A2:H`);
  const records = [];

  rows.forEach((row, i) => {
    const bal = Number(row[6]) || 0;
    const status = row[7];
    if (bal <= 0 || status === "Paid") return;
    records.push({
      id: `${type}|${i + 2}`,
      name: row[0],
      dueDate: row[4] || "No Due Date",
      balance: bal,
    });
  });

  return records;
}

async function processDebtPayment(authClient, spreadsheetId, idStr, paymentAmount, sourceName, ledgerType) {
  const [sheetName, rowNumStr] = idStr.split("|");
  const rowNum = Number(rowNumStr);
  const sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, sheetName);
  if (sheetId === null) return "Error: Sheet not found.";

  const pmt = Number(paymentAmount) || 0;
  const settledVals = await sheetsApi.getValues(authClient, spreadsheetId, `'${sheetName}'!F${rowNum}`);
  const settled = settledVals.length ? Number(settledVals[0][0]) || 0 : 0;
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sheetName}'!F${rowNum}`, [[settled + pmt]]);

  const balVals = await sheetsApi.getValues(authClient, spreadsheetId, `'${sheetName}'!G${rowNum}`);
  const newBal = balVals.length ? Number(balVals[0][0]) : 0;
  await sheetsApi.setValues(authClient, spreadsheetId, `'${sheetName}'!H${rowNum}`, [[newBal <= 0 ? "Paid" : "Partially Paid"]]);

  if (sourceName && pmt > 0) {
    const nameVals = await sheetsApi.getValues(authClient, spreadsheetId, `'${sheetName}'!A${rowNum}`);
    const debtorName = nameVals.length ? nameVals[0][0] : "Unknown";
    const today = new Date().toISOString().slice(0, 10);

    if (ledgerType === "Receivables") {
      const desc = `Receivable collected — ${debtorName}`;
      if (sourceName.toLowerCase() === "cash on hand") {
        await addCashOnHandTransaction(authClient, spreadsheetId, today, desc, pmt, 0);
      } else {
        await processWalletTransaction(authClient, spreadsheetId, sourceName, "deposit", pmt, today, desc, true);
      }
    } else {
      const desc = `Payable settled — ${debtorName}`;
      if (sourceName.toLowerCase() === "cash on hand") {
        await addCashOnHandTransaction(authClient, spreadsheetId, today, desc, 0, pmt);
      } else {
        await processWalletTransaction(authClient, spreadsheetId, sourceName, "withdrawal", pmt, today, desc, true);
      }
    }
    await rebuildBalanceFormula(authClient, spreadsheetId);
  }

  return "Success";
}

async function deleteDebtRecord(authClient, spreadsheetId, idStr) {
  const [sheetName, rowNumStr] = idStr.split("|");
  const sheetId = await sheetsApi.getSheetIdByName(authClient, spreadsheetId, sheetName);
  if (sheetId === null) return "Error: Sheet not found.";
  await sheetsApi.deleteRow(authClient, spreadsheetId, sheetId, Number(rowNumStr));
  return "Success";
}

// ---------- Notification settings (Settings tab replaces PropertiesService) ----------
// Simplified to a single daily reminder (sent at a fixed 8PM PH time by Vercel
// Cron - see vercel.json) instead of a user-chosen list of times.

async function getNotifSettings(authClient, spreadsheetId) {
  const rows = await sheetsApi.getValues(authClient, spreadsheetId, `'Settings'!A2:B`);
  const row = rows.find((r) => r[0] === "notifSettings");
  if (!row) return { enabled: false, notifyEmail: "" };
  try {
    const parsed = JSON.parse(row[1]);
    return { enabled: !!parsed.enabled, notifyEmail: parsed.notifyEmail || "" };
  } catch {
    return { enabled: false, notifyEmail: "" };
  }
}

async function saveNotifSettings(authClient, spreadsheetId, settings) {
  const rows = await sheetsApi.getValues(authClient, spreadsheetId, `'Settings'!A2:B`);
  const idx = rows.findIndex((r) => r[0] === "notifSettings");
  const rowNum = idx === -1 ? rows.length + 2 : idx + 2;
  await sheetsApi.setValues(authClient, spreadsheetId, `'Settings'!A${rowNum}:B${rowNum}`, [["notifSettings", JSON.stringify(settings)]]);
  return "Success";
}

module.exports = {
  ensureUserSpreadsheet,
  ensureTabs,
  rebuildBalanceFormula,
  getAccountBalance,
  saveEditedBalance,
  getSourcesOfFunds,
  createSourceOfFundTab,
  processWalletTransaction,
  addItemToDatabase,
  getTodaySpendings,
  getDebtTotals,
  addDebtRecord,
  getDebtDirectory,
  processDebtPayment,
  deleteDebtRecord,
  getNotifSettings,
  saveNotifSettings,
};
