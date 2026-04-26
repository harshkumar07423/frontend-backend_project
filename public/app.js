/* ============================================================
   app.js — BhumiSetu Frontend (MongoDB-backed API)
   ============================================================ */

const API_BASE = ""; // same origin — server serves frontend from /public

// ── UTILS ──────────────────────────────────────────────────────
function showLoading(el, text = "Loading…") {
  el.innerHTML = `<span class="spinner"></span> ${text}`;
}

// ── RECENT RECORDS (localStorage for UX persistence) ──────────
let recentRecords = JSON.parse(localStorage.getItem("recentRecords") || "[]");

function addRecentRecord(survey, owner) {
  recentRecords = recentRecords.filter(r => r.survey !== survey);
  recentRecords.unshift({ survey, owner });
  if (recentRecords.length > 4) recentRecords.pop();
  localStorage.setItem("recentRecords", JSON.stringify(recentRecords));
  renderRecentList();
}

function renderRecentList() {
  const container = document.getElementById("recentRecordsList");
  if (!container) return;

  if (recentRecords.length === 0) {
    container.innerHTML = '<span class="badge">— No records yet —</span>';
    return;
  }

  container.innerHTML = recentRecords.map(rec => `
    <div class="record-item">
      <span><i class="fas fa-map-pin"></i> <strong>${rec.survey}</strong> (${rec.owner || "—"})</span>
      <button class="reload-btn" data-survey="${rec.survey}">View</button>
    </div>
  `).join("");

  document.querySelectorAll(".reload-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const survey = btn.getAttribute("data-survey");
      document.getElementById("surveyNumber").value = survey;
      triggerLandSearch(survey);
      e.stopPropagation();
    });
  });
}

// ── LAND RECORD SEARCH ─────────────────────────────────────────
async function triggerLandSearch(surveyNum) {
  const resultDiv = document.getElementById("landRecordResult");
  showLoading(resultDiv, "Fetching from database…");

  try {
    const res = await fetch(`${API_BASE}/api/records/search?q=${encodeURIComponent(surveyNum)}`);
    const data = await res.json();

    if (data.success && data.record) {
      const r = data.record;
      addRecentRecord(r.surveyNumber, r.owner);
      resultDiv.innerHTML = `
        <i class="fas fa-check-circle" style="color:#2b7a4b;"></i>
        <strong>Land Record Found</strong><br>
        📍 <strong>Survey No:</strong> ${r.surveyNumber}<br>
        👤 <strong>Owner:</strong> ${r.owner}<br>
        📏 <strong>Area:</strong> ${r.area}<br>
        🏘️ <strong>Location:</strong> ${r.location}<br>
        🏷️ <strong>Property Tax ID:</strong> ${r.taxId}<br>
        💰 <strong>Assessed Value:</strong> ₹${r.propertyValue.toLocaleString()}<br>
        <span class="badge">✅ Fetched from MongoDB</span>
      `;
    } else {
      resultDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        No record found for "<strong>${surveyNum}</strong>".<br>
        💡 Try: <em>KH-12/456</em>, <em>SUR-987</em>, <em>PLOT/22A</em>
      `;
    }
  } catch (err) {
    resultDiv.innerHTML = `<i class="fas fa-times-circle"></i> Server error: ${err.message}`;
  }
}

document.getElementById("searchRecordBtn").addEventListener("click", () => {
  const val = document.getElementById("surveyNumber").value.trim();
  if (!val) {
    document.getElementById("landRecordResult").innerHTML =
      `<i class="fas fa-info-circle"></i> Please enter a Survey / Khasra number.`;
    return;
  }
  triggerLandSearch(val);
});

// ── PROPERTY TAX ───────────────────────────────────────────────
let currentTaxData = null;

async function updateTaxDisplay() {
  const propertyId     = document.getElementById("taxPropertyId").value.trim();
  const assessmentYear = document.getElementById("assessmentYear").value;
  const taxDiv         = document.getElementById("taxDueDisplay");
  const paymentSection = document.getElementById("paymentSection");
  const payNowBtn      = document.getElementById("payNowBtn");

  if (!propertyId) {
    taxDiv.innerHTML = `💡 Enter Property ID or Survey Number.`;
    paymentSection.style.display = "none";
    return;
  }

  showLoading(taxDiv, "Calculating tax from database…");

  try {
    const res  = await fetch(`${API_BASE}/api/tax?id=${encodeURIComponent(propertyId)}&year=${assessmentYear}`);
    const data = await res.json();

    if (!data.success) {
      taxDiv.innerHTML = `<i class="fas fa-times-circle"></i> ${data.error}`;
      paymentSection.style.display = "none";
      currentTaxData = null;
      return;
    }

    currentTaxData = data;

    const statusText = data.taxDue === 0
      ? `✅ No tax due. All clear!`
      : `⚠️ Total Tax Due: <strong style="font-size:1.2rem;">₹${data.taxDue.toLocaleString()}</strong> for ${assessmentYear}.`;

    taxDiv.innerHTML = `
      <i class="fas fa-chart-bar"></i> ${statusText}<br>
      <span style="font-size:0.75rem;">
        Last paid: ${data.lastTaxPaid} | Property Value: ₹${data.propertyValue.toLocaleString()}
      </span>
    `;

    paymentSection.style.display = "block";
    if (data.taxDue > 0) {
      payNowBtn.innerHTML = `<i class="fas fa-credit-card"></i> Pay ₹${data.taxDue.toLocaleString()} Now`;
      payNowBtn.disabled  = false;
    } else {
      payNowBtn.innerHTML = `<i class="fas fa-check-circle"></i> No Dues — Paid Up`;
      payNowBtn.disabled  = true;
    }
  } catch (err) {
    taxDiv.innerHTML = `<i class="fas fa-times-circle"></i> Server error: ${err.message}`;
    paymentSection.style.display = "none";
  }
}

document.getElementById("checkTaxBtn").addEventListener("click", updateTaxDisplay);

document.getElementById("taxPropertyId").addEventListener("input", () => {
  if (!document.getElementById("taxPropertyId").value.trim()) {
    document.getElementById("taxDueDisplay").innerHTML = `💡 Enter Property ID to calculate tax.`;
    document.getElementById("paymentSection").style.display = "none";
  }
});

// ── PAYMENT ────────────────────────────────────────────────────
document.getElementById("payNowBtn").addEventListener("click", async () => {
  const paymentMsg = document.getElementById("paymentMsg");

  if (!currentTaxData || currentTaxData.taxDue <= 0) {
    paymentMsg.innerHTML = "✨ No outstanding tax!";
    return;
  }

  const assessmentYear = document.getElementById("assessmentYear").value;
  paymentMsg.innerHTML = `<span class="spinner"></span> Processing payment…`;

  try {
    const res  = await fetch(`${API_BASE}/api/tax/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyNumber:   currentTaxData.surveyNumber,
        assessmentYear,
      }),
    });
    const data = await res.json();

    if (data.success) {
      paymentMsg.style.color = "#2b7a4b";
      paymentMsg.innerHTML = `
        ✅ <strong>₹${data.amountPaid.toLocaleString()}</strong> paid for ${data.paidForYear}.<br>
        🧾 Receipt ID: <strong>${data.receiptId}</strong><br>
        Thank you, <strong>${data.owner}</strong>! Record updated in MongoDB.
      `;
      // Refresh tax display after delay
      setTimeout(() => {
        updateTaxDisplay();
        setTimeout(() => { paymentMsg.innerHTML = ""; }, 4000);
      }, 1500);
    } else {
      paymentMsg.style.color = "#c0392b";
      paymentMsg.innerHTML = `❌ ${data.error}`;
    }
  } catch (err) {
    paymentMsg.style.color = "#c0392b";
    paymentMsg.innerHTML = `❌ Server error: ${err.message}`;
  }
});

// ── ADD NEW RECORD FORM ────────────────────────────────────────
document.getElementById("addRecordBtn").addEventListener("click", async () => {
  const form = document.getElementById("addRecordForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
});

document.getElementById("submitNewRecord").addEventListener("click", async () => {
  const msg = document.getElementById("addRecordMsg");
  const payload = {
    surveyNumber:  document.getElementById("newSurveyNo").value.trim(),
    owner:         document.getElementById("newOwner").value.trim(),
    area:          document.getElementById("newArea").value.trim(),
    location:      document.getElementById("newLocation").value.trim(),
    taxId:         document.getElementById("newTaxId").value.trim(),
    propertyValue: parseInt(document.getElementById("newValue").value, 10),
    lastTaxPaid:   document.getElementById("newLastPaid").value,
  };

  if (!payload.surveyNumber || !payload.owner || !payload.taxId || !payload.propertyValue) {
    msg.style.color = "#c0392b";
    msg.innerHTML = "❌ Survey No, Owner, Tax ID and Property Value are required.";
    return;
  }

  msg.innerHTML = `<span class="spinner"></span> Saving to MongoDB…`;

  try {
    const res  = await fetch(`${API_BASE}/api/records`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      msg.style.color = "#2b7a4b";
      msg.innerHTML   = `✅ Record saved! Survey: <strong>${data.record.surveyNumber}</strong>`;
      // Clear form
      ["newSurveyNo","newOwner","newArea","newLocation","newTaxId","newValue"].forEach(id => {
        document.getElementById(id).value = "";
      });
    } else {
      msg.style.color = "#c0392b";
      msg.innerHTML   = `❌ ${data.error}`;
    }
  } catch (err) {
    msg.style.color = "#c0392b";
    msg.innerHTML   = `❌ Server error: ${err.message}`;
  }
});

// ── NAVIGATION ─────────────────────────────────────────────────
document.getElementById("navHome").addEventListener("click", e => {
  e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" });
});
document.getElementById("navRecords").addEventListener("click", e => {
  e.preventDefault(); document.getElementById("landRecordCard").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("navTax").addEventListener("click", e => {
  e.preventDefault(); document.getElementById("taxCard").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("navAdd").addEventListener("click", e => {
  e.preventDefault(); document.getElementById("addRecordCard").scrollIntoView({ behavior: "smooth" });
});

// ── INIT ───────────────────────────────────────────────────────
window.addEventListener("load", () => {
  renderRecentList();
});
