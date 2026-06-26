const express = require("express");
const budgetService = require("../services/budgetService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: String(err.message || err) });
    }
  };
}

// req.ctx = { authClient, spreadsheetId, userId, email } (set by requireAuth)

router.get("/spreadsheet-url", handle((req) => ({
  url: `https://docs.google.com/spreadsheets/d/${req.ctx.spreadsheetId}`,
})));

// ---- Account balance ----
router.get("/balance", handle(async (req) => {
  const v = await budgetService.getAccountBalance(req.ctx.authClient, req.ctx.spreadsheetId);
  return { balance: v };
}));
router.put("/balance", handle((req) =>
  budgetService.saveEditedBalance(req.ctx.authClient, req.ctx.spreadsheetId, req.body.balance)
));

// ---- Sources of funds ----
router.get("/sources", handle((req) =>
  budgetService.getSourcesOfFunds(req.ctx.authClient, req.ctx.spreadsheetId)
));
router.post("/sources", handle((req) =>
  budgetService.createSourceOfFundTab(req.ctx.authClient, req.ctx.spreadsheetId, req.body.sourceName)
));
router.post("/sources/transaction", handle((req) => {
  const { sourceName, actionType, amount, date, description, isCashTransfer } = req.body;
  // skipCashMirror = true by default: a deposit/withdrawal only affects the
  // chosen wallet (new income/expense, not physical cash moving around).
  // Only mirror into Cash on Hand when the user explicitly checks
  // "this is a cash transfer" (isCashTransfer === true).
  const skipCashMirror = !isCashTransfer;
  return budgetService.processWalletTransaction(
    req.ctx.authClient, req.ctx.spreadsheetId, sourceName, actionType, amount, date, description, skipCashMirror
  );
}));

// ---- Budget items ----
router.post("/items", handle((req) => {
  const { timeframe, date, category, itemName, spendings, budget, sourceName } = req.body;
  return budgetService.addItemToDatabase(
    req.ctx.authClient, req.ctx.spreadsheetId, timeframe, date, category, itemName, spendings, budget, sourceName
  );
}));
router.get("/items/today", handle((req) =>
  budgetService.getTodaySpendings(req.ctx.authClient, req.ctx.spreadsheetId)
));

// ---- Debt & credit ----
router.get("/debts/totals", handle((req) =>
  budgetService.getDebtTotals(req.ctx.authClient, req.ctx.spreadsheetId)
));
router.get("/debts/:type", handle((req) =>
  budgetService.getDebtDirectory(req.ctx.authClient, req.ctx.spreadsheetId, req.params.type)
));
router.post("/debts/:type", handle((req) => {
  const { name, amount, description, dateStart, dateDue } = req.body;
  return budgetService.addDebtRecord(
    req.ctx.authClient, req.ctx.spreadsheetId, req.params.type, name, amount, description, dateStart, dateDue
  );
}));
router.post("/debts/payment", handle((req) => {
  const { id, paymentAmount, sourceName, ledgerType } = req.body;
  return budgetService.processDebtPayment(req.ctx.authClient, req.ctx.spreadsheetId, id, paymentAmount, sourceName, ledgerType);
}));
router.delete("/debts/:id", handle((req) =>
  budgetService.deleteDebtRecord(req.ctx.authClient, req.ctx.spreadsheetId, req.params.id)
));

// ---- Notification settings ----
router.get("/notifications", handle((req) =>
  budgetService.getNotifSettings(req.ctx.authClient, req.ctx.spreadsheetId)
));
router.put("/notifications", handle((req) =>
  budgetService.saveNotifSettings(req.ctx.authClient, req.ctx.spreadsheetId, req.body)
));

module.exports = router;
