module.exports = (io) => {
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Ensure admin access
const Runner = require("../models/Runner");
const User = require("../models/User");  // ✅ Import User model
const MilesLog = require("../models/MilesLog");  // ✅ Import MilesLog model
const moment = require("moment-timezone");
// ✅ Middleware to check admin access
const isAdmin = async (req, res, next) => {
    // try {
    //     console.log("🔍 Checking Admin Access - Decoded Token:", req.user);

    //     if (!req.user || !req.user._id) {
    //         console.error("❌ Missing user ID in request.");
    //         return res.status(401).json({ error: "Unauthorized. Missing admin user ID." });
    //     }

    //     // ✅ Fetch the user from DB using the decoded token
    //     const user = await User.findById(req.user._id);
    //     if (!user) {
    //         console.error("❌ User not found in database.");
    //         return res.status(404).json({ error: "User not found." });
    //     }

    //     if (!user.isAdmin) {
    //         console.error("❌ Unauthorized. User is not an admin.");
    //         return res.status(403).json({ error: "Unauthorized. Admins only." });
    //     }

    //     console.log("✅ Admin check passed for:", user.name);
    //     next();
    // } catch (error) {
    //     console.error("❌ Admin check error:", error);
    //     res.status(500).json({ error: "Internal server error" });
    // }
    try {
        console.log("🔍 Checking Admin Access - Decoded Token:", req.user); // ✅ Log `req.user`

        if (!req.user || !req.user.userId) {
            console.error("❌ Missing user ID in request.");
            return res.status(401).json({ error: "Unauthorized. Missing admin user ID." });
        }

        // ✅ Fetch the user from DB using the decoded token
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.error("❌ User not found in database.");
            return res.status(404).json({ error: "User not found." });
        }

        if (!user.isAdmin) {
            console.error("❌ Unauthorized. User is not an admin.");
            return res.status(403).json({ error: "Unauthorized. Admins only." });
        }

        console.log("✅ Admin check passed for:", user.name);
        next();
    } catch (error) {
        console.error("❌ Admin check error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

router.post("/:runnerId/log", auth, async (req, res) => {
    try {
        const { miles, date } = req.body;
        const { runnerId } = req.params;

        if (!miles || miles <= 0) {
            return res.status(400).json({ error: "Miles must be greater than zero" });
        }

        if (!date) {
            return res.status(400).json({ error: "Date is required" });
        }

        // ✅ Correctly parse the date from the request
        const logDate = moment(date, ["YYYY-MM-DD", "M/D/YYYY"], true).isValid() 
            ? moment(date, ["YYYY-MM-DD", "M/D/YYYY"]).toDate()
            : moment().toDate();  // ✅ Fallback to current date if invalid

        const newLog = new MilesLog({
            runnerId,
            miles,
            date: logDate, // ✅ Save correctly parsed date
            movedUp: false
        });

        await newLog.save();

        const runner = await Runner.findById(runnerId);
        if (runner) {
            runner.totalMiles += miles;
            await runner.save();
        }

        // Fetch the latest logs for this runner to send in the WebSocket event
        const updatedLogs = await MilesLog.find({ runnerId }).sort({ date: -1 });

        io.emit("updateMiles", { 
            runnerId, 
            miles, 
            date: moment(logDate).format("M/D/YYYY"),  // ✅ Ensure formatted date
            totalMiles: runner.totalMiles,
            logs: updatedLogs.map(log => ({
                date: moment(log.date).format("M/D/YYYY"),  // ✅ Format each log entry
                miles: log.miles
            }))
        });

        res.json({ message: "Miles logged successfully for runner!", milesLog: newLog });
    } catch (error) {
        console.error("❌ Error logging miles for runner:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Create a new runner (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
    try {
        const { firstName, lastName } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "First name and last name are required" });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized. Missing admin user ID." });
        }

        const newRunner = new Runner({
            firstName,
            lastName,
            createdBy: req.user._id // ✅ FIX: Ensure `createdBy` is set correctly
        });

        await newRunner.save();
        res.status(201).json(newRunner);
    } catch (error) {
        console.error("❌ Error adding runner:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ Update a runner's miles (Admin only)
router.put("/:id", auth, isAdmin, async (req, res) => {
    try {
        const { miles } = req.body;
        if (miles <= 0) {
            return res.status(400).json({ error: "Miles must be greater than zero" });
        }

        const runner = await Runner.findById(req.params.id);
        if (!runner) {
            return res.status(404).json({ error: "Runner not found" });
        }

        // ✅ Log the miles in the MilesLog collection
        const newLog = new MilesLog({
            runnerId: runner._id,  // ✅ Ensure runnerId is correctly set
            userId: null,          // ✅ No user ID, since it's a runner
            miles: miles,
            date: new Date(),
            movedUp: false
        });

        await newLog.save();  // ✅ Store the miles log

        // ✅ Update the runner's total miles
        runner.totalMiles += miles;
        await runner.save();

        // ✅ Fetch and return the updated runner data
        const updatedRunner = await Runner.findById(req.params.id);
        res.json(updatedRunner);
    } catch (error) {
        console.error("Error updating runner miles:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Delete a runner (Admin only)
router.delete("/:id", auth, isAdmin, async (req, res) => {
    try {
        const runner = await Runner.findById(req.params.id);
        if (!runner) {
            return res.status(404).json({ error: "Runner not found" });
        }

        await runner.deleteOne();
        res.json({ message: "Runner deleted successfully" });
    } catch (error) {
        console.error("Error deleting runner:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Get all runners (Admin only)
router.get("/", auth, isAdmin, async (req, res) => {
    try {
        const runners = await Runner.find().sort({ totalMiles: -1 });

        // ✅ Fetch logs for each runner
        const runnerIds = runners.map(runner => runner._id);
        const logs = await MilesLog.find({ runnerId: { $in: runnerIds } })
                                   .sort({ date: -1 });

        // ✅ Attach logs to each runner
        const runnersWithLogs = runners.map(runner => ({
            ...runner.toObject(),
            logs: logs.filter(log => log.runnerId.toString() === runner._id.toString())
        }));

        res.json(runnersWithLogs);
    } catch (error) {
        console.error("❌ Error fetching runners:", error);
        res.status(500).json({ error: "Server error" });
    }
});

return router;
};