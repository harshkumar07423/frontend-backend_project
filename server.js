// server.js — BhumiSetu Backend (Express + MongoDB)
require("dotenv").config();
const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const path      = require("path");
const LandRecord = require("./models/LandRecord");

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bhumisetu";

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── MongoDB Connection ──────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected:", MONGO_URI))
  .catch(err => { console.error("❌ MongoDB error:", err.message); process.exit(1); });

// ── HELPERS ─────────────────────────────────────────────────────
function computeTaxDue(propertyValue, lastPaidYear, assessmentYear) {
  const lastPaid = parseInt(lastPaidYear, 10);
  const current  = parseInt(assessmentYear, 10);
  if (isNaN(lastPaid) || isNaN(current)) return Math.round(propertyValue * 0.02);
  const yearsDue = current - lastPaid;
  if (yearsDue <= 0) return 0;
  return Math.round(propertyValue * 0.02 * yearsDue);
}

// ══════════════════════════════════════════════════════════════════
//  LAND RECORD ROUTES
// ══════════════════════════════════════════════════════════════════

// GET /api/records — list all records
app.get("/api/records", async (req, res) => {
  try {
    const records = await LandRecord.find().sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/records/search?q=KH-12/456
app.get("/api/records/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ success: false, error: "Query required" });

  try {
    const record = await LandRecord.findBySurveyOrTaxId(q);
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/records/:surveyNumber — single record
app.get("/api/records/:surveyNumber", async (req, res) => {
  try {
    const record = await LandRecord.findOne({ surveyNumber: req.params.surveyNumber.toUpperCase() });
    if (!record) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/records — add a new land record
app.post("/api/records", async (req, res) => {
  try {
    const record = new LandRecord(req.body);
    await record.save();
    res.status(201).json({ success: true, record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "Survey number or Tax ID already exists" });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/records/:surveyNumber — update a record
app.put("/api/records/:surveyNumber", async (req, res) => {
  try {
    const record = await LandRecord.findOneAndUpdate(
      { surveyNumber: req.params.surveyNumber.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  PROPERTY TAX ROUTES
// ══════════════════════════════════════════════════════════════════

// GET /api/tax?id=PTX-1001&year=2025
app.get("/api/tax", async (req, res) => {
  const { id, year } = req.query;
  if (!id) return res.status(400).json({ success: false, error: "Property ID required" });

  try {
    const record = await LandRecord.findBySurveyOrTaxId(id);
    if (!record) return res.status(404).json({ success: false, error: "Property not found" });

    const assessYear = year || new Date().getFullYear().toString();
    const taxDue = computeTaxDue(record.propertyValue, record.lastTaxPaid, assessYear);

    res.json({
      success: true,
      surveyNumber:  record.surveyNumber,
      owner:         record.owner,
      taxId:         record.taxId,
      propertyValue: record.propertyValue,
      lastTaxPaid:   record.lastTaxPaid,
      assessmentYear: assessYear,
      taxDue,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tax/pay — process tax payment
app.post("/api/tax/pay", async (req, res) => {
  const { surveyNumber, assessmentYear } = req.body;
  if (!surveyNumber || !assessmentYear)
    return res.status(400).json({ success: false, error: "surveyNumber and assessmentYear required" });

  try {
    const record = await LandRecord.findOne({ surveyNumber: surveyNumber.toUpperCase() });
    if (!record) return res.status(404).json({ success: false, error: "Property not found" });

    const taxDue = computeTaxDue(record.propertyValue, record.lastTaxPaid, assessmentYear);
    if (taxDue <= 0) return res.json({ success: true, message: "No dues. Already paid up.", taxDue: 0 });

    // Mark tax as paid — update DB
    record.lastTaxPaid = assessmentYear;
    await record.save();

    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}`;
    res.json({
      success: true,
      message: `Payment of ₹${taxDue.toLocaleString()} processed for ${assessmentYear}.`,
      receiptId,
      amountPaid: taxDue,
      owner: record.owner,
      surveyNumber: record.surveyNumber,
      paidForYear: assessmentYear,
      newLastTaxPaid: record.lastTaxPaid,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Fallback → serve frontend ────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`🚀 BhumiSetu server running at http://localhost:${PORT}`)
);
