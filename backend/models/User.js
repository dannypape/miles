const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String},
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    resetCode: String, 
    resetCodeExpires: Date,
    forcePasswordReset: { type: Boolean, default: false } 
});

module.exports = mongoose.model("User", UserSchema);
