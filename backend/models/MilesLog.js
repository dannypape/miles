const mongoose = require("mongoose");

const milesLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Runner", default: null },
    miles: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    movedUp: { type: Boolean, default: false }
});

// ✅ Ensure at least one of userId or runnerId is set
milesLogSchema.pre("save", function (next) {
    if (!this.userId && !this.runnerId) {
        return next(new Error("Either userId or runnerId is required"));
    }
    next();
});

module.exports = mongoose.model("MilesLog", milesLogSchema);