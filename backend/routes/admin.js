const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");  // ✅ Ensure auth middleware is used
const User = require("../models/User");
const Runner = require("../models/Runner");
const MilesLog = require("../models/MilesLog");
const VenmoBalance = require("../models/VenmoBalance");
const mongoose = require("mongoose");

module.exports = (io) => {

    // ✅ Delete all users except the admin
    router.delete("/users", auth, async (req, res) => {
        try {
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            const adminId = req.user.userId; // Get the admin's ID

            // Delete all users except the admin
            await User.deleteMany({ _id: { $ne: adminId } });

            // Reset miles for all users except the admin
            await MilesLog.deleteMany({ userId: { $ne: adminId } });

            io.emit("usersUpdated");  // ✅ Notify clients of the update

            res.json({ message: "All users (except admin) deleted and miles reset" });
        } catch (error) {
            console.error("Error deleting users:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // ✅ Delete all runners
    router.delete("/runners", auth, async (req, res) => {
        try {
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            await Runner.deleteMany({});
            await MilesLog.deleteMany({ runnerId: { $exists: true } });

            io.emit("runnersUpdated");  // ✅ Notify clients of the update

            res.json({ message: "All runners deleted and miles reset" });
        } catch (error) {
            console.error("Error deleting runners:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // ✅ Update the dollar-to-mile conversion rate
    router.put("/miles-conversion", auth, async (req, res) => {
        try {
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            const { conversionRate } = req.body;
            if (!conversionRate || conversionRate <= 0) {
                return res.status(400).json({ error: "Invalid conversion rate" });
            }

            let venmoData = await VenmoBalance.findOne({});
            if (!venmoData) {
                venmoData = new VenmoBalance({
                    balance: 0,
                    conversionRate,
                    updatedBy: new mongoose.Types.ObjectId(req.user._id),
                });
            } else {
                venmoData.conversionRate = conversionRate;
                venmoData.updatedBy = new mongoose.Types.ObjectId(req.user._id);
            }

            await venmoData.save();
            io.emit("milesConversionUpdated", { conversionRate });

            res.json({ message: "Miles conversion rate updated", conversionRate });
        } catch (error) {
            console.error("Error updating miles conversion rate:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
};