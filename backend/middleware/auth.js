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

        if (!token) {
            console.error("⛔ No token found in request.");
            return res.status(401).json({ error: "Unauthorized. Token required." });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("✅ Decoded Token:", decoded);  // ✅ Log the decoded token

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
            req.user = { userId: user._id.toString(), isAdmin: user.isAdmin, name: user.name };

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