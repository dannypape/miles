const express = require("express");
const MilesLog = require("../models/MilesLog");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const moment = require("moment-timezone");
const RankingSnapshot = require("../models/RankingSnapshot");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to Verify Token
function authenticateToken(req, res, next) {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
        req.userId = decoded.userId;

        console.log("✅ Authenticated userId from token:", req.userId); // 🔍 Debugging

        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// ✅ Export a function that accepts `io`
module.exports = (io) => {
    
    // In the backend (miles.js)
    router.post("/log", authenticateToken, async (req, res) => {
        
    
        try {
            const { miles, date, runnerId, userId } = req.body;
    
            if (!miles || miles <= 0) {
                return res.status(400).json({ error: "Miles must be greater than zero" });
            }
            // const logDate = date ? new Date(date) : new Date(); // ✅ Use the provided d
            // let logData = { miles, date: logDate };

            // ✅ Ensure logDate is properly formatted
            const logDate = date ? new Date(date) : new Date();

            // ✅ If userId is not provided in body, use the one from authentication
            const logUserId = userId || req.userId;
            
            // ✅ Ensure either userId or runnerId is set
            if (!logUserId && !runnerId) {
                console.error("❌ No userId or runnerId provided. Cannot log miles.");
                return res.status(400).json({ error: "Either userId or runnerId must be provided." });
            }

            // console.log("📌 Logging miles for:", { userId: logUserId, runnerId, miles, date: logDate });
            console.log("📌 Creating new miles log:", { userId: logUserId, runnerId, miles, date: logDate });


            const newLog = new MilesLog({
                userId: logUserId || null,
                runnerId: runnerId || null,
                miles,
                date: logDate, // ✅ Ensure the correct date is saved
                movedUp: false
            });
            await newLog.save();

            console.log("✅ Successfully logged miles:", newLog);
    
            res.json({ message: "Miles logged successfully", milesLog: newLog });
        } catch (error) {
            res.status(500).json({ error: "Failed to log miles" });
        }
    });
    router.get("/", async (req, res) => {
        try {
            const logs = await MilesLog.find()
                .populate("userId", "firstName lastName")
                .populate("runnerId", "firstName lastName");  // ✅ Ensure runners are populated
    
            const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
            let groupedLogs = {};
            logs.forEach(log => {
                // ✅ Fix: Ensure runnerId is properly populated
                const id = log.userId ? log.userId._id.toString() : log.runnerId ? log.runnerId._id.toString() : null;
                
                if (!id) {
                    console.warn("⚠️ Skipping log entry due to missing userId and runnerId:", log);
                    return;
                }
    
                const name = log.userId
                    ? `${log.userId.firstName} ${log.userId.lastName}`
                    : log.runnerId
                    ? `${log.runnerId.firstName} ${log.runnerId.lastName}`
                    : "Unknown";
    
                if (!groupedLogs[id]) {
                    groupedLogs[id] = {
                        userId: log.userId ? log.userId._id : null,
                        runnerId: log.runnerId ? log.runnerId._id : null,
                        userName: name,  // ✅ Fix: Display runner names correctly
                        totalMiles: 0,
                        logs: [],
                        movedUp: false,
                        type: log.userId ? "user" : "runner"  // ✅ Add a type field
                    };
                }
    
                groupedLogs[id].totalMiles += log.miles;
                groupedLogs[id].logs.push({
                    _id: log.id,
                    date: log.date,
                    miles: log.miles
                });
            });

            Object.values(groupedLogs).forEach(entry => {
                entry.logs.sort((a, b) => new Date(b.date) - new Date(a.date)); // ✅ Sort logs by date descending (most recent first)
            });
    
            let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
            res.json({
                totalMiles,
                logs,
                groupedLogs: sortedUsers
            });
    
        } catch (error) {
            console.error("❌ Error fetching miles:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    
    async function getPreviousPositions() {
        const previousLogs = await RankingSnapshot.find({}, { userId: 1, position: 1, movedUp: 1 });
    
        let previousPositions = {};
        previousLogs.forEach(log => {
            previousPositions[log.userId] = {
                position: log.position,
                movedUp: log.movedUp ?? false // Ensure `movedUp` is always set
            };
        });
    
        console.log("📌 Retrieved Previous Rankings from DB:", previousPositions);
        return previousPositions;
    }
    
    // ✅ Store the current ranking for future comparisons
    async function storePreviousPositions(sortedUsers) {
        console.log("💾 Storing previous rankings with movedUp...");
    
        for (const user of sortedUsers) {
            await RankingSnapshot.findOneAndUpdate(
                { userId: user.userId },
                { 
                    $set: { 
                        position: sortedUsers.indexOf(user), 
                        movedUp: user.movedUp // ✅ Ensure `movedUp` is stored correctly
                    } 
                },
                { upsert: true, new: true }
            );
        }
    }
    
    // 🔹 Get User-Specific Miles Log
    router.get("/user", auth, async (req, res) => {
        try {
            const userLogs = await MilesLog.find({ userId: req.user.id });

            const logsET = userLogs.map(log => ({
                ...log.toObject(),
                date: moment(log.date).tz("America/New_York").format("YYYY-MM-DD HH:mm:ss")
            }));

            const userMiles = userLogs.reduce((sum, log) => sum + log.miles, 0);
            res.json({ totalMiles: userMiles, logs: logsET });
        } catch (error) {
            console.error("Error fetching user miles:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    router.put("/update", auth, async (req, res) => {
        try {
            console.log("🛠 Received Update Request:", req.body); // ✅ Log full request body
            
            const user = await User.findById(req.user.userId);
            if (!user || !user.isAdmin) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { entryId, miles, date } = req.body;

            // if (!entryId || miles == null || miles < 0) {
            //     return res.status(400).json({ error: "Invalid input" });
            // }
            if (!entryId) {
                console.error("❌ Missing entryId in request body:", req.body); // ✅ Debug log
                return res.status(400).json({ error: "Missing entryId in request." });
            }
            if (miles == null || miles < 0) {
                return res.status(400).json({ error: "Miles must be a positive number." });
            }
            if (!date) {
                return res.status(400).json({ error: "Date is required." });
            }

            const logEntry = await MilesLog.findById(entryId);
            if (!logEntry) {
                return res.status(404).json({ error: "Miles log entry not found" });
            }

            const formattedDate = moment(date, ["YYYY-MM-DD", "M/D/YYYY"], true);
            if (!formattedDate.isValid()) {
                return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD or M/D/YYYY" });
            }

            logEntry.miles = miles;
            logEntry.date = formattedDate.toDate();
            await logEntry.save();

            // Emit event to update UI after miles update
            io.emit("mileUpdate", { 
                entryId, 
                miles,
                updatedAt: moment(logEntry.date).format("YYYY-MM-DD HH:mm:ss")  // ✅ Send updated timestamp in ET 
            });

            res.json({ message: "Miles updated successfully", updatedMiles: logEntry });
        } catch (err) {
            console.error("Error updating miles:", err);
            res.status(500).json({ error: "Server error" });
        }
    });

    return router; // ✅ Return the router with socket events included
};

