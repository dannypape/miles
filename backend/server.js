require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
// const authRoutes = require("./routes/auth");
// const venmoRoutes = require("./routes/venmo");
const { createServer } = require("http");
const { Server } = require("socket.io");

const User = require("./models/User"); // ✅ Import the User model
const MilesLog = require("./models/MilesLog"); // ✅ Import the MilesLog model

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const RankingSnapshot = require("./models/RankingSnapshot");
const PORT = process.env.PORT || 8090;
// const { getPreviousPositions } = require("./routes/miles");
// ✅ Enable CORS for frontend access
app.use(cors({
    origin: `http://localhost:8088`,  // Allow requests from Angular
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true
}));

app.use(express.json());

// ✅ MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in .env");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));


const authRoutes = require("./routes/auth");
const venmoRoutes = require("./routes/venmo")(io);
const milesRoutes = require("./routes/miles")(io);  // ✅ Now `io` is initialized before being passed
// const runnersRoute = require("./routes/runners");
const runnersRoutes = require("./routes/runners")(io);

// ✅ Define API Routes
app.use("/api/auth", authRoutes);
app.use("/api/miles", milesRoutes);
app.use("/api/venmo", venmoRoutes);
app.use("/api/runners", runnersRoutes);
// app.use("/api/user", authRoutes);

console.log("Routes registered: /api/user, /api/auth");

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

// ✅ Function to get total miles from DB
const getTotalMilesFromDatabase = async () => {
  const result = await MilesLog.aggregate([
      { $group: { _id: null, totalMiles: { $sum: "$miles" } } }
  ]);
  return result.length > 0 ? result[0].totalMiles : 0;
};

// ✅ Handle WebSocket Connections
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("logMiles", async (data) => {
        console.log("📩 logMiles event received! Data:", data);

        if (!data || data.miles === undefined || data.miles <= 0) {
            console.error("❌ Invalid miles value in logMiles:", data);
            return;
        }

        if (!data.userId && !data.runnerId) {
            console.error("❌ Missing userId or runnerId in logMiles:", data);
            return;
        }

        try {
            let user = null;
            let runner = null;

            if (data.userId) {
                user = await User.findById(new ObjectId(data.userId));
                if (!user) {
                    console.error("❌ User not found:", data.userId);
                    return;
                }
            }

            if (data.runnerId) {
                runner = await Runner.findById(new ObjectId(data.runnerId));
                if (!runner) {
                    console.error("❌ Runner not found:", data.runnerId);
                    return;
                }
            }

            const newLog = new MilesLog({
                userId: user ? user._id : null,  // ✅ Ensure valid ObjectId or null
                runnerId: runner ? runner._id : null,  // ✅ Ensure valid ObjectId or null
                miles: data.miles,
                date: new Date(data.date),
                movedUp: false
            });

            await newLog.save();

            if (user) {
                user.totalMiles += data.miles;
                await user.save();
            }

            if (runner) {
                runner.totalMiles += data.miles;
                await runner.save();
            }

            const logs = await MilesLog.find()
                .populate("userId", "firstName lastName")
                .populate("runnerId", "firstName lastName");

            let groupedLogs = {};
            logs.forEach(log => {
                const id = log.userId ? log.userId._id.toString() : log.runnerId?._id?.toString();

                if (!id) {
                    console.warn("⚠️ Skipping log entry with missing ID:", log);
                    return;
                }

                const name = log.userId
                    ? `${log.userId.firstName} ${log.userId.lastName}`
                    : `${log.runnerId.firstName} ${log.runnerId.lastName}`;

                if (!groupedLogs[id]) {
                    groupedLogs[id] = {
                        userId: log.userId ? log.userId._id : null,
                        runnerId: log.runnerId ? log.runnerId._id : null,
                        userName: name,
                        totalMiles: 0,
                        logs: [],
                        movedUp: false
                    };
                }
                groupedLogs[id].totalMiles += log.miles;
                groupedLogs[id].logs.push({ date: log.date, miles: log.miles });
            });

            let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

            console.log("📡 Emitting updateMiles event with:", sortedUsers);
            io.emit("updateMiles", {
                totalMiles: logs.reduce((sum, log) => sum + log.miles, 0),
                logs,
                groupedLogs: sortedUsers
            });

        } catch (error) {
            console.error("❌ Error logging miles via WebSockets:", error);
        }
    });
    // socket.on("logMiles", async (data) => {
    //     console.log("📩 logMiles event received! Data:", data);

    //     if (!data || data.miles === undefined || data.miles <= 0) {
    //         console.error("❌ Invalid miles value in logMiles:", data);
    //         return;
    //     }

    //     if (!data.userId && !data.runnerId) {
    //         console.error("❌ Missing userId or runnerId in logMiles:", data);
    //         return;
    //     }

    //     try {
    //         let user = null;
    //         let runner = null;

    //         if (data.userId) {
    //             user = await User.findById(new ObjectId(data.userId));
    //             if (!user) {
    //                 console.error("❌ User not found:", data.userId);
    //                 return;
    //             }
    //         }

    //         if (data.runnerId) {
    //             runner = await Runner.findById(new ObjectId(data.runnerId));
    //             if (!runner) {
    //                 console.error("❌ Runner not found:", data.runnerId);
    //                 return;
    //             }
    //         }

    //         const newLog = new MilesLog({
    //             userId: user ? new ObjectId(user._id) : null,
    //             runnerId: runner ? new ObjectId(runner._id) : null,
    //             miles: data.miles,
    //             date: new Date(data.date),
    //             movedUp: false
    //         });

    //         await newLog.save();

    //         if (user) {
    //             user.totalMiles += data.miles;
    //             await user.save();
    //         }

    //         if (runner) {
    //             runner.totalMiles += data.miles;
    //             await runner.save();
    //         }

    //         const logs = await MilesLog.find()
    //             .populate("userId", "firstName lastName")
    //             .populate("runnerId", "firstName lastName");

    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const id = log.userId ? log.userId._id.toString() : log.runnerId._id.toString();
    //             const name = log.userId
    //                 ? `${log.userId.firstName} ${log.userId.lastName}`
    //                 : `${log.runnerId.firstName} ${log.runnerId.lastName}`;

    //             if (!groupedLogs[id]) {
    //                 groupedLogs[id] = {
    //                     userId: log.userId ? log.userId._id : null,
    //                     runnerId: log.runnerId ? log.runnerId._id : null,
    //                     userName: name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[id].totalMiles += log.miles;
    //             groupedLogs[id].logs.push({ date: log.date, miles: log.miles });
    //         });

    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

    //         console.log("📡 Emitting updateMiles event with:", sortedUsers);
    //         io.emit("updateMiles", {
    //             totalMiles: logs.reduce((sum, log) => sum + log.miles, 0),
    //             logs,
    //             groupedLogs: sortedUsers
    //         });

    //     } catch (error) {
    //         console.error("❌ Error logging miles via WebSockets:", error);
    //     }
    // });
    // socket.on("logMiles", async (data) => {
    //     console.log("📩 logMiles event received! Data:", data);

    //     if (!data || data.miles === undefined || data.miles <= 0) {
    //         console.error("❌ Invalid miles value in logMiles:", data);
    //         return;
    //     }

    //     if (!data.userId && !data.runnerId) {
    //         console.error("❌ Missing userId or runnerId in logMiles:", data);
    //         return;
    //     }

    //     try {
    //         let user = null;
    //         let runner = null;

    //         if (data.userId) {
    //             user = await User.findById(ObjectId(data.userId));
    //             if (!user) {
    //                 console.error("❌ User not found:", data.userId);
    //                 return;
    //             }
    //         }

    //         if (data.runnerId) {
    //             runner = await Runner.findById(ObjectId(data.runnerId));
    //             if (!runner) {
    //                 console.error("❌ Runner not found:", data.runnerId);
    //                 return;
    //             }
    //         }

    //         const newLog = new MilesLog({
    //             userId: user ? new ObjectId(user._id) : null,
    //             runnerId: runner ? new ObjectId(runner._id) : null,
    //             miles: data.miles,
    //             date: new Date(data.date),
    //             movedUp: false
    //         });

    //         await newLog.save();

    //         if (user) {
    //             user.totalMiles += data.miles;
    //             await user.save();
    //         }

    //         if (runner) {
    //             runner.totalMiles += data.miles;
    //             await runner.save();
    //         }

    //         const logs = await MilesLog.find()
    //             .populate("userId", "firstName lastName")
    //             .populate("runnerId", "firstName lastName");

    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const id = log.userId ? log.userId._id.toString() : log.runnerId._id.toString();
    //             const name = log.userId
    //                 ? `${log.userId.firstName} ${log.userId.lastName}`
    //                 : `${log.runnerId.firstName} ${log.runnerId.lastName}`;

    //             if (!groupedLogs[id]) {
    //                 groupedLogs[id] = {
    //                     userId: log.userId ? log.userId._id : null,
    //                     runnerId: log.runnerId ? log.runnerId._id : null,
    //                     userName: name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[id].totalMiles += log.miles;
    //             groupedLogs[id].logs.push({ date: log.date, miles: log.miles });
    //         });

    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

    //         console.log("📡 Emitting updateMiles event with:", sortedUsers);
    //         io.emit("updateMiles", {
    //             totalMiles: logs.reduce((sum, log) => sum + log.miles, 0),
    //             logs,
    //             groupedLogs: sortedUsers
    //         });

    //     } catch (error) {
    //         console.error("❌ Error logging miles via WebSockets:", error);
    //     }
    // });
    // socket.on("logMiles", async (data) => {
    //     console.log("📩 logMiles event received! Data:", data);

    //     // ✅ Validate required fields
    //     if (!data || data.miles === undefined || data.miles <= 0) {
    //         console.error("❌ Invalid miles value in logMiles:", data);
    //         return;
    //     }

    //     // ✅ Ensure either userId or runnerId is provided
    //     if (!data.userId && !data.runnerId) {
    //         console.error("❌ Missing userId or runnerId in logMiles:", data);
    //         return;
    //     }

    //     try {
    //         let user = null;
    //         let runner = null;

    //         if (data.userId) {
    //             user = await User.findById(ObjectId(data.userId));
    //             if (!user) {
    //                 console.error("❌ User not found:", data.userId);
    //                 return;
    //             }
    //         }

    //         if (data.runnerId) {
    //             runner = await Runner.findById(ObjectId(data.runnerId));
    //             if (!runner) {
    //                 console.error("❌ Runner not found:", data.runnerId);
    //                 return;
    //             }
    //         }

    //         // ✅ Create and save the miles log
    //         const newLog = new MilesLog({
    //             userId: user ? ObjectId(user._id) : null,
    //             runnerId: runner ? ObjectId(runner._id) : null,
    //             miles: data.miles,
    //             date: new Date(data.date),
    //             movedUp: false
    //         });

    //         await newLog.save();

    //         // ✅ Update total miles for user or runner
    //         if (user) {
    //             user.totalMiles += data.miles;
    //             await user.save();
    //         }

    //         if (runner) {
    //             runner.totalMiles += data.miles;
    //             await runner.save();
    //         }

    //         // ✅ Fetch updated logs
    //         const logs = await MilesLog.find()
    //             .populate("userId", "firstName lastName")
    //             .populate("runnerId", "firstName lastName");

    //         // ✅ Group logs correctly for real-time update
    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const id = log.userId ? log.userId._id.toString() : log.runnerId._id.toString();
    //             const name = log.userId
    //                 ? `${log.userId.firstName} ${log.userId.lastName}`
    //                 : `${log.runnerId.firstName} ${log.runnerId.lastName}`;

    //             if (!groupedLogs[id]) {
    //                 groupedLogs[id] = {
    //                     userId: log.userId ? log.userId._id : null,
    //                     runnerId: log.runnerId ? log.runnerId._id : null,
    //                     userName: name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[id].totalMiles += log.miles;
    //             groupedLogs[id].logs.push({ date: log.date, miles: log.miles });
    //         });

    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

    //         console.log("📡 Emitting updateMiles event with:", sortedUsers);
    //         io.emit("updateMiles", {
    //             totalMiles: logs.reduce((sum, log) => sum + log.miles, 0),
    //             logs,
    //             groupedLogs: sortedUsers
    //         });

    //     } catch (error) {
    //         console.error("❌ Error logging miles via WebSockets:", error);
    //     }
    // });
    // socket.on("logMiles", async (data) => {
    //     console.log("📩 logMiles event received! Data:", data);
    
    //     if (!data || !data.name || data.miles === undefined || data.miles <= 0) {
    //         console.error("❌ Invalid data received in logMiles:", data);
    //         return;
    //     }

    //     // ✅ Ensure either userId or runnerId is provided
    //     if (!data.userId && !data.runnerId) {
    //         console.error("❌ Missing userId or runnerId in logMiles:", data);
    //         return;
    //     }

    //     try {
    //         let user = null;
    //         let runner = null;

    //         if (data.userId) {
    //             user = await User.findById(data.userId);
    //             if (!user) {
    //                 console.error("❌ User not found:", data.userId);
    //                 return;
    //             }
    //         }

    //         if (data.runnerId) {
    //             runner = await Runner.findById(data.runnerId);
    //             if (!runner) {
    //                 console.error("❌ Runner not found:", data.runnerId);
    //                 return;
    //             }
    //         }

    //         const newLog = new MilesLog({
    //             userId: user ? ObjectId(user._id) : null,
    //             runnerId: runner ? ObjectId(runner._id) : null,
    //             miles: data.miles,
    //             date: new Date(data.date),
    //             movedUp: false
    //         });

    //         await newLog.save();

    //         if (user) {
    //             user.totalMiles += data.miles;
    //             await user.save();
    //         }

    //         if (runner) {
    //             runner.totalMiles += data.miles;
    //             await runner.save();
    //         }

    //         const logs = await MilesLog.find()
    //             .populate("userId", "firstName lastName")
    //             .populate("runnerId", "firstName lastName");

    //         let groupedLogs = {};
    //         logs.forEach(log => {
    //             const id = log.userId ? log.userId._id.toString() : log.runnerId._id.toString();
    //             const name = log.userId
    //                 ? `${log.userId.firstName} ${log.userId.lastName}`
    //                 : `${log.runnerId.firstName} ${log.runnerId.lastName}`;

    //             if (!groupedLogs[id]) {
    //                 groupedLogs[id] = {
    //                     userId: log.userId ? log.userId._id : null,
    //                     runnerId: log.runnerId ? log.runnerId._id : null,
    //                     userName: name,
    //                     totalMiles: 0,
    //                     logs: [],
    //                     movedUp: false
    //                 };
    //             }
    //             groupedLogs[id].totalMiles += log.miles;
    //             groupedLogs[id].logs.push({ date: log.date, miles: log.miles });
    //         });

    //         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

    //         // ✅ Emit updateMiles event for real-time UI update
    //         io.emit("updateMiles", {
    //             totalMiles: logs.reduce((sum, log) => sum + log.miles, 0),
    //             logs,
    //             groupedLogs: sortedUsers
    //         });

    //     } catch (error) {
    //         console.error("❌ Error logging miles:", error);
    //     }
    // });
//   socket.on("logMiles", async (data) => {
//     console.log("📩 logMiles event received! Data:", data);

//     if (!data || !data.name || data.miles === undefined || data.miles <= 0) {
//         console.error("❌ Invalid data received in logMiles:", data);
//         return;
//     }

//     try {
//         let user = await User.findOne({ name: data.name });

//         if (!user) {
//             console.error("❌ User not found:", data.name);
//             return;
//         }

//         console.log(`ℹ️ Checking for duplicate submissions for ${user.name} (ID: ${user._id})`);

//         // ✅ Prevent duplicate logs within 5 seconds
//         const lastLog = await MilesLog.findOne({ userId: user._id }).sort({ createdAt: -1 });

//         if (lastLog) {
//             const now = new Date();
//             const lastLogTime = new Date(lastLog.createdAt);
//             const timeDiff = (now - lastLogTime) / 1000; // Convert to seconds

//             if (lastLog.miles === data.miles && timeDiff < 5) {
//                 console.log("⚠️ Duplicate submission detected. Skipping insert.");
//                 return;
//             }
//         }

//         console.log(`✅ Logging miles for ${user.name} (ID: ${user._id})`);

//         const newLog = new MilesLog({ userId: user._id, miles: data.miles });
//         await newLog.save();

//         const totalMiles = await getTotalMilesFromDatabase();
//         const logs = await MilesLog.find().populate("userId", "name");

//         // ✅ Fetch previous rankings
//         // const previousPositions = await getPreviousPositions();

//         // ✅ Recalculate user rankings
//         let groupedLogs = {};
//         logs.forEach(log => {
//             const userId = log.userId._id.toString();
//             if (!groupedLogs[userId]) {
//                 groupedLogs[userId] = {
//                     userId,
//                     userName: log.userId.name,
//                     totalMiles: 0,
//                     logs: [],
//                     movedUp: false // Default to false
//                 };
//             }
//             groupedLogs[userId].totalMiles += log.miles;
//             groupedLogs[userId].logs.push(log);
//         });

//         let sortedUsers = Object.values(groupedLogs).sort((a, b) => b.totalMiles - a.totalMiles);

//         const previousPositions = await getPreviousPositions();  // ✅ Fetch stored rankings
//         console.log("📌 Retrieved Previous Rankings with movedUp:", previousPositions);
// // ✅ Ensure movedUp persists after refresh
// if (Object.keys(previousPositions).length === 0) {
//     console.log("🚨 No previous rankings found. Setting all movedUp to false.");
//     sortedUsers.forEach(user => user.movedUp = false);
// }

// sortedUsers = sortedUsers.map((user, index) => {
//     const prev = previousPositions[user.userId];

//     // ✅ Ensure `movedUp` persists across refresh
//     user.movedUp = prev?.position > index ? true : prev?.movedUp ?? false;

//     return user;
// });

// await storePreviousPositions(sortedUsers);  // ✅ Persist updated rankings
        
//         // ✅ Update `movedUp` flag in the database
//         for (const user of sortedUsers) {
//             await MilesLog.updateMany({ userId: user.userId }, { $set: { movedUp: user.movedUp } });
//         }
        
//         // ✅ Now emit the update with correct `movedUp` values
        
//         console.log("🚀 Emitting updateMiles with groupedLogs:", sortedUsers.map(user => ({
//             userName: user.userName,
//             movedUp: user.movedUp
//         })));
//         // console.log("📡 Emitting updateMiles WebSocket event...", { totalMiles, logs, groupedLogs });
//         io.emit("updateMiles", {
//             totalMiles: totalMiles,
//             logs: logs,
//             groupedLogs: sortedUsers.map(user => ({
//                 userId: user.userId,
//                 userName: user.userName,
//                 totalMiles: user.totalMiles,
//                 movedUp: user.movedUp ?? false,  // Ensure movedUp is always included
//                 logs: user.logs
//             })),
//             lastSubmission: { user: user.name, miles: data.miles }
//         });
        
//         console.log("📢 Emitting updateMiles with movedUp:", sortedUsers.map(user => ({
//             userId: user.userId,
//             userName: user.userName,
//             movedUp: user.movedUp
//         })));

//     } catch (error) {
//         console.error("❌ Error logging miles:", error);
//     }
// });



    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});










// ✅ Start Server
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
