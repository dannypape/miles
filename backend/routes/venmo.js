const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");  // ✅ Ensure auth middleware is used
const User = require("../models/User");
const VenmoBalance = require("../models/VenmoBalance");
const { io } = require("../server"); // ✅ Import io if not already available
const moment = require("moment-timezone");

module.exports = (io) => {  // ✅ Accept `io` from server.js
    // ✅ Route to get the latest Venmo balance
    router.get("/balance", async (req, res) => {
        try {
            const latestBalance = await VenmoBalance.findOne().sort({ updatedAt: -1 });
            
            if (!latestBalance) {
                return res.json({ balance: 0, milesNeeded: 0, conversionRate: 5 }); // ✅ Default conversion rate
            }

            const conversionRate = latestBalance.conversionRate || 5; // ✅ Use stored rate or default to 5
            const milesNeeded = Math.ceil(latestBalance.balance / conversionRate); // ✅ Calculate dynamically
    
            res.json({ balance: latestBalance.balance, milesNeeded, conversionRate }); // ✅ Return updated values
        } catch (err) {
            console.error("Error fetching Venmo balance:", err);
            res.status(500).json({ error: "Server error" }); 
        }
    });
    

    // ✅ Route to update Venmo Balance (Admins only)
    const mongoose = require("mongoose");

   
    router.put("/balance", auth, async (req, res) => {
        console.log("🔍 Incoming Venmo Balance Update Request:", req.body);
        console.log("🔍 Checking req.user in Venmo update:", req.user);  // ✅ Debugging log
    
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ error: "Unauthorized" });
        }
    
        try {
            const { balance } = req.body;
            let venmoData = await VenmoBalance.findOne({});
            let previousBalance = venmoData ? venmoData.balance : 0;
            let conversionRate = venmoData?.conversionRate || 5; // ✅ Keep existing rate

            let balanceDifference = balance - previousBalance;
            let additionalMiles = Math.ceil(balanceDifference / conversionRate);
    
            const updatedAtET = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
    
            if (!venmoData) {
                venmoData = new VenmoBalance({ 
                    balance, 
                    updatedBy: new mongoose.Types.ObjectId(req.user._id),  // ✅ Ensure ObjectId
                    updatedAt: updatedAtET 
                });
            } else {
                venmoData.balance = balance;
                venmoData.updatedBy = new mongoose.Types.ObjectId(req.user._id);  // ✅ Ensure ObjectId
                venmoData.updatedAt = updatedAtET;
            }
    
            await venmoData.save();
    
            console.log(`✅ Venmo balance updated! New: $${balance}, Previous: $${previousBalance}`);
            console.log(`📡 Emitting event: venmoBalanceUpdated -> Balance diff: $${balanceDifference}, Extra miles: ${additionalMiles}`);
    
            io.emit("venmoBalanceUpdated", {
                balance: venmoData.balance,
                milesNeeded: Math.ceil(balance / conversionRate),
                balanceDifference,
                additionalMiles,
                updatedAt: updatedAtET  // ✅ Send Eastern Time
            });
    
            res.json({
                message: "Balance updated",
                balance: venmoData.balance,
                milesNeeded: Math.ceil(balance / conversionRate),
                balanceDifference,
                additionalMiles,
                updatedAt: updatedAtET  // ✅ Send Eastern Time
            });
    
        } catch (error) {
            console.error("❌ Error updating Venmo balance:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    


    
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
            console.error("❌ Error updating conversion rate:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
    
    

    // ✅ Fetch balance history (Admins only)
    router.get("/balance/history", auth, async (req, res) => {
        try {
            const history = await VenmoBalance.find()
                .populate("updatedBy", "name email")
                .sort({ updatedAt: -1 });
            res.json(history);
        } catch (err) {
            console.error("Error fetching balance history:", err);
            res.status(500).json({ error: "Server error" });
        }
    });

    return router;  // ✅ Return router with `io` inside
};
