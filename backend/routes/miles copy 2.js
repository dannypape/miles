const express = require("express");
const MilesLog = require("../models/MilesLog");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const moment = require("moment-timezone");

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

// ✅ Export a function that accepts `io`
module.exports = (io) => {
    // 🔹 Log Miles (Create a new log)
    // router.post("/log", authenticateToken, async (req, res) => {
    //     const { miles } = req.body;
    //     if (!miles || miles <= 0) {
    //         return res.status(400).json({ error: "Miles must be greater than zero" });
    //     }
    
    //     try {
    //         const user = await User.findById(req.userId);
    //         if (!user) return res.status(404).json({ error: "User not found" });
    
    //         const timestampET = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
    
    //         const newLog = new MilesLog({
    //             userId: req.userId,
    //             miles,
    //             date: timestampET,
    //             movedUp: false  // ✅ Default to false, updated later
    //         });
    
    //         await newLog.save();
    
    //         // ✅ Emit the event to all clients
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);

    //         for (const user of sortedUsers) {
    //             await MilesLog.updateMany(
    //                 { userId: user.userId },
    //                 { $set: { movedUp: user.movedUp } }
    //             );
    //         }
    
    //         io.emit("updateMiles", { 
    //             totalMiles, 
    //             logs: logs.map(log => ({
    //                 ...log.toObject(),
    //                 date: moment(log.date).tz("America/New_York").format("YYYY-MM-DD HH:mm:ss")
    //             }))
    //         });
    
    //         res.json({ message: "Miles logged successfully", milesLog: newLog });
    //     } catch (error) {
    //         res.status(500).json({ error: "Failed to log miles" });
    //     }
    // });
    router.post("/log", authenticateToken, async (req, res) => {
        const { miles } = req.body;
        if (!miles || miles <= 0) {
            return res.status(400).json({ error: "Miles must be greater than zero" });
        }
    
        try {
            const user = await User.findById(req.userId);
            if (!user) return res.status(404).json({ error: "User not found" });
    
            const timestampET = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
    
            const newLog = new MilesLog({
                userId: req.userId,
                miles,
                date: timestampET,
                movedUp: false  // ✅ Default to false, updated later
            });
    
            await newLog.save();
    
            // Fetch all logs again
            const logs = await MilesLog.find().populate("userId", "name");
            const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
            // Group logs by user
            let groupedLogs = {};
            logs.forEach(log => {
                const userId = log.userId._id.toString();
                if (!groupedLogs[userId]) {
                    groupedLogs[userId] = {
                        userId,
                        userName: log.userId.name,
                        totalMiles: 0,
                        logs: [],
                        movedUp: log.movedUp || false
                    };
                }
                groupedLogs[userId].totalMiles += log.miles;
                groupedLogs[userId].logs.push(log);
            });
    
            let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
            // Fetch previous rankings
            const previousPositions = await getPreviousPositions();
    
            // ✅ Update `movedUp` based on previous ranking
            sortedUsers = sortedUsers.map((user, index) => {
                const previousPosition = previousPositions[user.userId];
                user.movedUp = previousPosition !== undefined && previousPosition > index;
                return user;
            });
    
            // ✅ Save `movedUp` flag to the database
            for (const user of sortedUsers) {
                await MilesLog.updateMany({ userId: user.userId }, { $set: { movedUp: user.movedUp } });
            }
            console.log("✅ Final groupedLogs before emitting:", sortedUsers);
            // ✅ Emit event with updated `movedUp`
            io.emit("updateMiles", { 
                totalMiles, 
                logs, 
                groupedLogs: sortedUsers 
            });
    

            
            res.json({ message: "Miles logged successfully", milesLog: newLog });
        } catch (error) {
            res.status(500).json({ error: "Failed to log miles" });
        }
    });
    
    // router.post("/log", authenticateToken, async (req, res) => {
    //     const { miles } = req.body;
    //     if (!miles || miles <= 0) {
    //         return res.status(400).json({ error: "Miles must be greater than zero" });
    //     }

    //     try {
    //         const user = await User.findById(req.userId);
    //         if (!user) return res.status(404).json({ error: "User not found" });

    //         const timestampET = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");

    //         const newLog = new MilesLog({
    //             userId: req.user.userId,
    //             miles,
    //             date: timestampET, // ✅ Store in Eastern Time
    //         });
    //         await newLog.save();

    //         // ✅ Emit the event to all clients
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    //         io.emit("updateMiles", { 
    //             totalMiles, 
    //             logs: logs.map(log => ({
    //                 ...log.toObject(),
    //                 date: moment(log.date).tz("America/New_York").format("YYYY-MM-DD HH:mm:ss") // Convert to ET
    //             }))
    //         });

    //         io.emit("newMilesLogged", { 
    //             name: user.name, 
    //             miles, 
    //             date: timestampET  // ✅ Include timestamp in ET
    //         });

    //         res.json({ message: "Miles logged successfully", milesLog: newLog });
    //     } catch (error) {
    //         res.status(500).json({ error: "Failed to log miles" });
    //     }
    // });

    // 🔹 Get Total Miles & All Logs
    // ✅ Fetch all miles logs and determine movedUp status
    // router.get("/", async (req, res) => {
    //     try {
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
    //         // Group logs by user
    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const userId = log.userId._id.toString();
    //             if (!groupedLogs[userId]) {
    //                 groupedLogs[userId] = {
    //                     userId,
    //                     userName: log.userId.name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[userId].totalMiles += log.miles;
    //             groupedLogs[userId].logs.push(log);
    //         });
    
    //         // Sort users by total miles
    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
    //         // Fetch previous positions
    //         const previousPositions = await getPreviousPositions();
    
    //         sortedUsers = sortedUsers.map((user, index) => {
    //             const previousPosition = previousPositions[user.userId] ?? index;
    //             user.movedUp = previousPosition > index;
    
    //             // ✅ Update movedUp field in the database
    //             MilesLog.updateMany({ userId: user.userId }, { $set: { movedUp: user.movedUp } }).exec();
    
    //             return user;
    //         });
    
    //         // ✅ Ensure `groupedLogs` is included in the response
    //         res.json({ totalMiles, logs, groupedLogs: sortedUsers });
    
    //     } catch (error) {
    //         console.error("Error fetching miles:", error);
    //         res.status(500).json({ error: "Internal server error" });
    //     }
    // });
    
    

// ✅ Helper function to fetch previous positions
// async function getPreviousPositions() {
//     const logs = await MilesLog.find().populate("userId", "name");
//     let groupedLogs = {};

//     logs.forEach(log => {
//         const userId = log.userId._id.toString();
//         if (!groupedLogs[userId]) {
//             groupedLogs[userId] = { totalMiles: 0 };
//         }
//         groupedLogs[userId].totalMiles += log.miles;
//     });

//     let sortedUsers = Object.entries(groupedLogs)
//         .sort(([, a], [, b]) => b.totalMiles - a.totalMiles)
//         .map(([userId], index) => ({ userId, index }));

//     return Object.fromEntries(sortedUsers.map(user => [user.userId, user.index]));
// }
    // router.get("/", async (req, res) => {
    //     try {
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);

    //         // let groupedLogs = {};
    //         // logs.forEach(log => {
    //         //     const userId = log.userId._id.toString();
    //         //     if (!groupedLogs[userId]) {
    //         //         groupedLogs[userId] = {
    //         //             userId,
    //         //             userName: log.userId.name,
    //         //             totalMiles: 0,
    //         //             logs: [],
    //         //             movedUp: false
    //         //         };
    //         //     }
    //         //     groupedLogs[userId].totalMiles += log.miles;
    //         //     groupedLogs[userId].logs.push(log);
    //         // });

    //         const logsET = logs.map(log => ({
    //             ...log.toObject(),
    //             date: moment(log.date).tz("America/New_York").format("YYYY-MM-DD HH:mm:ss")
    //         }));


    //         res.json({ totalMiles, logs: logsET });
    //     } catch (error) {
    //         console.error("Error fetching miles:", error);
    //         res.status(500).json({ error: "Internal server error" });
    //     }
    // });


    // router.get("/", async (req, res) => {
    //     try {
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
    //         // Group logs by user
    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const userId = log.userId._id.toString();
    //             if (!groupedLogs[userId]) {
    //                 groupedLogs[userId] = {
    //                     userId,
    //                     userName: log.userId.name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: log.movedUp || false  // Default state
    //                 };
    //             }
    //             groupedLogs[userId].totalMiles += log.miles;
    //             groupedLogs[userId].logs.push(log);
    //         });
    
    //         // Sort users by total miles
    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
    //         // Fetch previous positions from the database
    //         const previousPositions = await getPreviousPositions();
    
    //         // Track moved-up status
    //         sortedUsers = sortedUsers.map((user, index) => {
    //             const previousPosition = previousPositions[user.userId];
    //             user.movedUp = previousPosition !== undefined && previousPosition > index;
    //             return user;
    //         });
    
    //         // ✅ Store the latest rankings for future requests
    //         await storePreviousPositions(sortedUsers);
    
    //         res.json({ totalMiles, logs, groupedLogs: sortedUsers });
    //     } catch (error) {
    //         console.error("Error fetching miles:", error);
    //         res.status(500).json({ error: "Internal server error" });
    //     }
    // });
    // router.get("/", async (req, res) => {
    //     try {
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const userId = log.userId._id.toString();
    //             if (!groupedLogs[userId]) {
    //                 groupedLogs[userId] = {
    //                     userId,
    //                     userName: log.userId.name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[userId].totalMiles += log.miles;
    //             groupedLogs[userId].logs.push(log);
    //         });
    
    //         // Sort users by total miles
    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
    //         // Get previous positions from the database
    //         const previousPositions = await getPreviousPositions();
    //         sortedUsers = sortedUsers.map((user, index) => {
    //             const previousPosition = previousPositions[user.userId];
    //             user.movedUp = previousPosition !== undefined && previousPosition > index;
    
    //             // ✅ Save `movedUp` state to the database
    //             return { ...user };
    //         });
    
    //         // ✅ Save the movedUp flag in the database
    //         for (const user of sortedUsers) {
    //             await MilesLog.updateMany({ userId: user.userId }, { $set: { movedUp: user.movedUp } });
    //         }
    
    //         res.json({ totalMiles, logs, groupedLogs: sortedUsers });
    
    //     } catch (error) {
    //         console.error("Error fetching miles:", error);
    //         res.status(500).json({ error: "Internal server error" });
    //     }
    // });
    // router.get("/", async (req, res) => {
    //     try {
    //         const logs = await MilesLog.find().populate("userId", "name");
    //         const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const userId = log.userId._id.toString();
    //             if (!groupedLogs[userId]) {
    //                 groupedLogs[userId] = {
    //                     userId,
    //                     userName: log.userId.name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false  // Default to false
    //                 };
    //             }
    //             groupedLogs[userId].totalMiles += log.miles;
    //             groupedLogs[userId].logs.push(log);
    //         });
    
    //         // Sort users by total miles
    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
    //         // Fetch previous rankings
    //         const previousPositions = await getPreviousPositions();
    
    //         // ✅ Set `movedUp` based on previous position
    //         sortedUsers = sortedUsers.map((user, index) => {
    //             const previousPosition = previousPositions[user.userId];
    //             user.movedUp = previousPosition !== undefined && previousPosition > index;
    //             return user;
    //         });
    
    //         // ✅ Save `movedUp` in the database
    //         for (const user of sortedUsers) {
    //             await MilesLog.updateMany(
    //                 { userId: user.userId },
    //                 { $set: { movedUp: user.movedUp } }
    //             );
    //         }
    
    //         // ✅ Ensure API response includes `movedUp`
    //         res.json({ totalMiles, logs, groupedLogs: sortedUsers });
    
    //     } catch (error) {
    //         console.error("Error fetching miles:", error);
    //         res.status(500).json({ error: "Internal server error" });
    //     }
    // });
    router.get("/", async (req, res) => {
        try {
            const logs = await MilesLog.find().populate("userId", "name");
            const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
    
            let groupedLogs = {};
            logs.forEach(log => {
                const userId = log.userId._id.toString();
                if (!groupedLogs[userId]) {
                    groupedLogs[userId] = {
                        userId,
                        userName: log.userId.name,
                        totalMiles: 0,
                        logs: [],
                        movedUp: false  // Default to false
                    };
                }
                groupedLogs[userId].totalMiles += log.miles;
                groupedLogs[userId].logs.push(log);
            });
    
            // Sort users by total miles
            let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);
    
            // Fetch previous rankings
            const previousPositions = await getPreviousPositions();
    
            // ✅ Set `movedUp` based on previous position
            sortedUsers = sortedUsers.map((user, index) => {
                const previousPosition = previousPositions[user.userId];
                user.movedUp = previousPosition !== undefined && previousPosition > index;
                return user;
            });
    
            // ✅ Save `movedUp` flag in the database
            for (const user of sortedUsers) {
                await MilesLog.updateMany(
                    { userId: user.userId },
                    { $set: { movedUp: user.movedUp } }
                );
            }
    
            console.log("✅ Sending groupedLogs with movedUp:", sortedUsers);
            res.json({ totalMiles, logs, groupedLogs: sortedUsers });
    
        } catch (error) {
            console.error("Error fetching miles:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    
    
    
    // ✅ Helper function to fetch previous positions
    async function getPreviousPositions() {
        const previousLogs = await MilesLog.find().populate("userId", "name");
        let groupedLogs = {};
    
        previousLogs.forEach(log => {
            const userId = log.userId._id.toString();
            if (!groupedLogs[userId]) {
                groupedLogs[userId] = { totalMiles: 0 };
            }
            groupedLogs[userId].totalMiles += log.miles;
        });
    
        let sortedUsers = Object.entries(groupedLogs)
            .sort(([, a], [, b]) => b.totalMiles - a.totalMiles)
            .map(([userId], index) => ({ userId, index }));
    
        return Object.fromEntries(sortedUsers.map(user => [user.userId, user.index]));
    }
    
    // ✅ Store the current ranking for future comparisons
    async function storePreviousPositions(sortedUsers) {
        for (const user of sortedUsers) {
            await MilesLog.updateMany({ userId: user.userId }, { $set: { movedUp: user.movedUp } });
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
            logEntry.date = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss"); // ✅ Ensure ET format
            await logEntry.save();

            // Emit event to update UI after miles update
            io.emit("mileUpdate", { 
                entryId, 
                miles,
                updatedAt: logEntry.date  // ✅ Send updated timestamp in ET 
            });

            res.json({ message: "Miles updated successfully", updatedMiles: logEntry });
        } catch (err) {
            console.error("Error updating miles:", err);
            res.status(500).json({ error: "Server error" });
        }
    });

    return router; // ✅ Return the router with socket events included
};
