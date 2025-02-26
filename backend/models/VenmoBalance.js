const mongoose = require("mongoose");

const VenmoBalanceSchema = new mongoose.Schema({
    balance: { type: Number, required: true, default: 0 },
    conversionRate: { type: Number, default: 5 }, // ✅ Ensure default rate exists
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("VenmoBalance", VenmoBalanceSchema);