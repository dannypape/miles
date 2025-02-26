module.exports = function(io) {
    const express = require("express");
    const MilesLog = require("../models/MilesLog");
    const User = require("../models/User");
    const jwt = require("jsonwebtoken");
    const auth = require("../middleware/auth");

    const router = express.Router();
    const JWT_SECRET = process.env.JWT_SECRET;

    // Middleware to Verify Token
    function authenticateToken(req, res, next) {
        const token = req.header("Authorization");
        if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

        try {
            const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
            req.userId = decoded.userId;
            next();
        } catch (error) {
            res.status(401).json({ error: "Invalid token" });
        }
    }

    // ✅ Admin-only route to update a miles entry
    router.put("/update", auth, async (req, res) => {
        try {
            const user = await User.findById(req.user.userId);
            if (!user || !user.isAdmin) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { entryId, miles } = req.body;

            if (!entryId || miles == null || miles < 0) {
                return res.status(400).json({ error: "Invalid input" });
            }

            const logEntry = await MilesLog.findById(entryId);
            if (!logEntry) {
                return res.status(404).json({ error: "Miles log entry not found" });
            }

            logEntry.miles = miles;
            await logEntry.save();

            // Emit event to update UI after miles update
            io.emit("mileUpdate", { 
                entryId, 
                miles 
            });

            res.json({ message: "Miles updated successfully", updatedMiles: logEntry });
        } catch (err) {
            console.error("Error updating miles:", err);
            res.status(500).json({ error: "Server error" });
        }
    });

    // 🔹 Log Miles (Create a new log)
    router.post("/log", authenticateToken, async (req, res) => {
        const { miles } = req.body;
        if (!miles || miles <= 0) {
            return res.status(400).json({ error: "Miles must be greater than zero" });
        }

        try {
            const user = await User.findById(req.userId);
            if (!user) return res.status(404).json({ error: "User not found" });

            const newLog = new MilesLog({ userId: req.userId, miles });
            await newLog.save();

            // Calculate updated total miles
            const totalMiles = await MilesLog.aggregate([
                { $group: { _id: null, totalMiles: { $sum: "$miles" } } }
            ]);

            const updatedTotal = totalMiles.length ? totalMiles[0].totalMiles : 0;

            // Emit event for real-time updates
            io.emit("mileSubmission", {
                userId: req.userId,
                name: user.name,
                miles,
                totalMiles: updatedTotal
            });

            res.json({ message: "Miles logged successfully", milesLog: newLog, totalMiles: updatedTotal });
        } catch (error) {
            console.error("Miles logging error:", error);
            res.status(500).json({ error: "Failed to log miles" });
        }
    });

    // 🔹 Get Total Miles & All Logs
    router.get("/", async (req, res) => {
        try {
            const logs = await MilesLog.find().populate("userId", "name"); // Fetch logs with user names
            const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
            res.json({ totalMiles, logs });
        } catch (error) {
            console.error("Error fetching miles:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // 🔹 Get User-Specific Miles Log
    router.get("/user", auth, async (req, res) => {
        try {
            const userLogs = await MilesLog.find({ userId: req.user.userId });
            const userMiles = userLogs.reduce((sum, log) => sum + log.miles, 0);
            res.json({ totalMiles: userMiles });
        } catch (error) {
            console.error("Error fetching user miles:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};
