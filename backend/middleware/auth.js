// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// module.exports = async (req, res, next) => {
//     try {
//         const authHeader = req.header("Authorization");
//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             return res.status(401).json({ error: "No token, authorization denied." });
//         }

//         const token = authHeader.split(" ")[1];
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         const user = await User.findById(decoded.userId); // ✅ Ensure user exists
//         if (!user) {
//             return res.status(404).json({ error: "User not found." });
//         }

//         console.log("✅ Authenticated User:", user.name, "ID:", user._id);

//         // ✅ Fix: Store `_id` instead of `userId`
//         req.user = { _id: user._id, isAdmin: user.isAdmin, name: user.name };

//         next();
//     } catch (err) {
//         console.error("❌ Auth error:", err);
//         res.status(403).json({ error: "Invalid or expired token." });
//     }
// };
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// module.exports = async (req, res, next) => {
//     try {
//         const authHeader = req.header("Authorization");

//         // ✅ Ensure the token exists
//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             console.warn("⚠️ No token provided in request.");
//             return res.status(401).json({ error: "No token, authorization denied." });
//         }

//         const token = authHeader.split(" ")[1];

//         try {
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);

//             // ✅ Ensure the token contains `userId`
//             if (!decoded.userId) {
//                 console.error("❌ JWT does not contain userId.");
//                 return res.status(403).json({ error: "Invalid token structure." });
//             }

//             // ✅ Fetch the user from DB
//             const user = await User.findById(decoded.userId);
//             if (!user) {
//                 console.warn("⚠️ User not found for token:", decoded.userId);
//                 return res.status(404).json({ error: "User not found." });
//             }

//             console.log("✅ Authenticated User:", user.name, "| ID:", user._id);

//             // ✅ Store `_id` instead of `userId` for consistency
//             // req.user = { userId: user._id, isAdmin: user.isAdmin, name: user.name };
//             req.user = {
//                 _id: user._id.toString(),  // Ensure _id is a string
//                 isAdmin: user.isAdmin,
//                 name: user.name
//               };
//             next();
//         } catch (tokenError) {
//             console.error("❌ JWT Verification Failed:", tokenError.message);
//             return res.status(401).json({ error: "Token expired. Please log in again." });
//         }

//     } catch (err) {
//         console.error("❌ Auth error:", err);
//         res.status(500).json({ error: "Internal server error." });
//     }
// };

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("⚠️ No token provided in request.");
            return res.status(401).json({ error: "No token, authorization denied." });
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("🔍 Decoded JWT Token:", decoded); // ✅ Log the decoded token

            if (!decoded.userId) {
                console.error("❌ JWT does not contain userId.");
                return res.status(403).json({ error: "Invalid token structure." });
            }

            console.log("🔍 Searching for user in DB with ID:", decoded.userId);

            // ✅ Ensure `ObjectId` type is used
            const user = await User.findById(new mongoose.Types.ObjectId(decoded.userId)).select("-password");

            if (!user) {
                console.warn("⚠️ User not found in database.");
                return res.status(404).json({ error: "User not found." });
            }

            console.log("✅ Authenticated User:", user.name, "| ID:", user._id);
            req.user = { userId: user._id, isAdmin: user.isAdmin, name: user.name };

            next();
        } catch (tokenError) {
            console.error("❌ JWT Verification Failed:", tokenError.message);
            return res.status(401).json({ error: "Token expired or invalid." });
        }

    } catch (err) {
        console.error("❌ Auth error:", err);
        res.status(500).json({ error: "Internal server error." });
    }
};