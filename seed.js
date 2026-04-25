// seed.js — Run once: node seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const LandRecord = require("./models/LandRecord");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bhumisetu";

const seedData = [
  { surveyNumber: "KH-12/456",  owner: "Arjun Mehta",    area: "0.75 acre",   location: "Village Rampur",    taxId: "PTX-1001", lastTaxPaid: "2024", propertyValue: 1250000 },
  { surveyNumber: "SUR-987",    owner: "Priya Singh",     area: "1200 sq ft",  location: "Greenfield Colony", taxId: "PTX-2102", lastTaxPaid: "2023", propertyValue: 890000  },
  { surveyNumber: "PLOT/22A",   owner: "Ramesh K.",       area: "2.5 acres",   location: "Industrial Zone",   taxId: "PTX-3345", lastTaxPaid: "2025", propertyValue: 3200000 },
  { surveyNumber: "KH-78/09",   owner: "Sunita Devi",     area: "0.5 acre",    location: "Kheda Village",     taxId: "PTX-4521", lastTaxPaid: "2022", propertyValue: 650000  },
  { surveyNumber: "SUR-1122",   owner: "Vikram Jadhav",   area: "850 sq yd",   location: "Nagpur Urban",      taxId: "PTX-6789", lastTaxPaid: "2024", propertyValue: 1850000 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB:", MONGO_URI);

  // Clear existing
  await LandRecord.deleteMany({});
  console.log("🗑️  Cleared existing records.");

  const inserted = await LandRecord.insertMany(seedData);
  console.log(`🌱 Inserted ${inserted.length} land records:`);
  inserted.forEach(r => console.log(`   • ${r.surveyNumber} — ${r.owner}`));

  await mongoose.disconnect();
  console.log("✅ Done. Database seeded successfully!");
}

seed().catch(err => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});
