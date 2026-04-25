// models/LandRecord.js
const mongoose = require("mongoose");

const landRecordSchema = new mongoose.Schema(
  {
    surveyNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    owner:        { type: String, required: true, trim: true },
    area:         { type: String, required: true },
    location:     { type: String, required: true },
    taxId:        { type: String, required: true, unique: true, uppercase: true },
    lastTaxPaid:  { type: String, default: "2023" },
    propertyValue:{ type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Case-insensitive search helper
landRecordSchema.statics.findBySurveyOrTaxId = async function (id) {
  return this.findOne({
    $or: [
      { surveyNumber: id.toUpperCase() },
      { taxId: id.toUpperCase() },
    ],
  });
};

module.exports = mongoose.model("LandRecord", landRecordSchema);
