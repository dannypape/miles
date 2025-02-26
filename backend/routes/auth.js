const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth"); // ✅ Add this line to import auth middleware
const nodemailer = require("nodemailer");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET; // Change this for security
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({ 
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use `true` for port 465, `false` for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Function to generate a refresh token
  function generateRefreshToken(userId) {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    // Store the refresh token in the database with the associated user ID
    // and an expiration date if desired
    User.updateOne({ _id: userId }, { refreshToken });
    return refreshToken;
  }

  router.post('/token', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).send('Refresh token is required');
    }

    // Find user with the matching refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(403).send('Invalid refresh token');
    }

    // Generate a new access token
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.json({ accessToken });
  });

//   router.post('/refresh', (req, res) => {
//     const refreshToken = req.headers.authorization?.split(' ')[1]; // Get token from headers
//     if (!refreshToken) return res.status(401).json({ message: 'No token provided' });
  
//     try {
//       const newToken = generateNewAccessToken(refreshToken);
//       res.json({ token: newToken });
//     } catch (err) {
//       res.status(403).json({ message: 'Invalid refresh token' });
//     }
//   });
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is required" });
        }

        // Verify Refresh Token
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Invalid or expired refresh token" });
            }

            // ✅ Add `await` inside an `async` function
            const user = await User.findById(decoded.userId);
            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }

            // Generate a new access token
            const newAccessToken = jwt.sign(
                { userId: user._id, isAdmin: user.isAdmin, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: "15m" }
            );

            const newRefreshToken = jwt.sign(
                { userId: user._id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: "7d" }
            );

            // Update user's refresh token in the database
            user.refreshToken = newRefreshToken;
            await user.save();

            res.json({ token: newAccessToken, refreshToken: newRefreshToken });
        });

    } catch (error) {
        console.error("❌ Refresh token error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// POST: Register user
router.post("/register", async (req, res) => {
    try {
        const { name, firstName, lastName, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(200).json({ // ✅ Use 200 instead of 400 to avoid error handling
                redirectToLogin: true,
                message: "Account already exists. Please log in."
            });
        }

// ✅ Generate a 6-digit verification code
const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

// let user = await User.findOne({ email });
// if (user) {
//     return res.status(400).json({ error: "User already exists" });
// }

const hashedPassword = await bcrypt.hash(password, 10);

user = new User({
    name,
    firstName,
    lastName,
    email,
    password: hashedPassword,
    verificationCode, // ✅ Store code
    isVerified: false, // ✅ Mark as unverified initially
    forcePasswordReset: false  
});

        await user.save();

        // ✅ Send verification email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Verify Your Account",
            text: `Your verification code is: ${verificationCode}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "User registered. Please check your email for the verification code." });

    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 🔹 User Login
router.post("/login", async (req, res) => {
    console.log("JWT_SECRET inside auth.js: login", process.env.JWT_SECRET);
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Ensure the user is verified
        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // ✅ If the user must reset their password, prevent login
        if (user.forcePasswordReset) {
            return res.status(200).json({
              message: "Password reset required",
              forcePasswordReset: true
            });
          }

        // ✅ Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin, name: user.name },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        await User.updateOne({ _id: user._id }, { refreshToken });

        res.json({ token, refreshToken, userId: user._id, name: user.name, isAdmin: user.isAdmin });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// router.post("/login", async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // ✅ Ensure the user is verified
//         if (!user.isVerified) {
//             return res.status(403).json({ message: "Please verify your email before logging in." });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: "Invalid credentials" });
//         }

//         // ✅ If the user must reset their password, prevent login
//         if (user.forcePasswordReset) {
//             return res.status(403).json({
//                 message: "Password reset required",
//                 forcePasswordReset: true  // ✅ Ensure this flag is returned
//             });
//         }

//         // ✅ Generate JWT Token
//         const token = jwt.sign(
//             { userId: user._id, isAdmin: user.isAdmin, name: user.name },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//         );

//         res.json({ token, userId: user._id, name: user.name, isAdmin: user.isAdmin });

//     } catch (error) {
//         console.error("❌ Login error:", error);
//         res.status(500).json({ error: "Server error" });
//     }
// });
// router.post("/login", async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // ✅ Ensure the user is verified
//         if (!user.isVerified) {
//             return res.status(403).json({ message: "Please verify your email before logging in." });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: "Invalid credentials" });
//         }

//         // ✅ If the user must reset their password, prevent login
//         if (user.forcePasswordReset) {
//             return res.status(403).json({
//                 message: "Password reset required",
//                 forcePasswordReset: true
//             });
//         }

//         // ✅ Generate JWT Token
//         const token = jwt.sign(
//             { userId: user._id, isAdmin: user.isAdmin, name: user.name },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//         );

//         res.json({ token, userId: user._id, name: user.name, isAdmin: user.isAdmin });

//     } catch (error) {
//         console.error("Login error:", error);
//         res.status(500).json({ error: "Server error" });
//     }
// });

// router.post("/login", async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) return res.status(404).json({ message: "User not found" });
//         if (!user.isVerified) return res.status(403).json({ message: "Please verify your email before logging in." });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//         if (user.forcePasswordReset) {
//             return res.status(403).json({ message: "Password reset required", forcePasswordReset: true });
//         }

//         const token = jwt.sign(
//             { userId: user._id, isAdmin: user.isAdmin, name: user.name }, // ✅ Include name
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//         );

//         res.json({ token, userId: user._id, name: user.name, isAdmin: user.isAdmin }); // ✅ Send name
//     } catch (error) {
//         console.error("Login error:", error);
//         res.status(500).json({ error: "Server error" });
//     }
// });


  

// ✅ Get the logged-in user's data
// router.get("/me", auth, async (req, res) => {
//     try {
//       const user = await User.findById(req.user.userId).select("-password"); // Exclude password
//       if (!user) return res.status(404).json({ error: "User not found" });
  
//       res.json(user);
//     } catch (err) {
//       console.error("Error fetching user profile:", err);
//       res.status(500).json({ error: "Server error" });
//     }
//   });

router.get("/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("❌ Error fetching user info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Admin user creation endpoint
// router.post("/create-user", auth, async (req, res) => {
//     try {
//       const { name, firstName, lastName, email, password, isAdmin } = req.body;
  
//       // ✅ Check if logged-in user is admin
//       const loggedInUser = await User.findById(req.user.userId);
//       if (!loggedInUser || !loggedInUser.isAdmin) {
//         return res.status(403).json({ error: "Access denied. Admins only." });
//       }
  
//       // ✅ Check if user already exists
//       let user = await User.findOne({ email });
//       if (user) {
//         return res.status(400).json({ error: "User already exists." });
//       }
  
//       // ✅ Hash password and save new user
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);
//       user = new User({ name, firstName, lastName, email, password: hashedPassword, isAdmin, forcePasswordReset: true, isVerified: true });
  
//       await user.save();
//       res.status(201).json({ message: "User created successfully!" });
  
//     } catch (error) {
//       console.error("Error creating user:", error);
//       res.status(500).json({ error: "Server error." });
//     }
//   });
router.post("/create-user", auth, async (req, res) => {
    try {
      const { name, firstName, lastName, email, password, isAdmin } = req.body;
  
      // ✅ Check if logged-in user is an admin
      const loggedInUser = await User.findById(req.user.userId);
      if (!loggedInUser || !loggedInUser.isAdmin) {
        return res.status(403).json({ error: "Access denied. Admins only." });
      }
  
      // ✅ Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ error: "User already exists." });
      }
  
      // ✅ Hash password and save new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = new User({ name, firstName, lastName, email, password: hashedPassword, isAdmin, forcePasswordReset: true, isVerified: true });
  
      await user.save();
      res.status(201).json({ message: "User created successfully!" });
  
    } catch (error) {
      console.error("❌ Error creating user:", error);
      res.status(500).json({ error: "Server error." });
    }
});


  // ✅ Verify Email Code
router.post("/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
  
      const user = await User.findOne({ email });
  
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.isVerified) return res.status(400).json({ message: "User already verified" });
      if (user.verificationCode !== code) return res.status(400).json({ message: "Invalid verification code" });
  
      user.isVerified = true;
      user.verificationCode = undefined; // Remove the code after verification
      await user.save();
  
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
// POST: Verify user account
router.post("/verify", async (req, res) => {
    try {
        const { email, verificationCode } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.isVerified) {
            return res.json({ message: "User already verified" });
        }

        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        // ✅ Mark user as verified
        user.isVerified = true;
        user.verificationCode = null; // Clear the code after successful verification

        await user.save();

        res.json({ message: "User verified successfully" });

    } catch (err) {
        console.error("Verification error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = verificationCode;
        user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 mins
        await user.save();

        // ✅ Send Email with Nodemailer
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${verificationCode}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Verification code sent to email." });
    } catch (err) {
        console.error("Forgot Password error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 🔹 Reset Password - Verify Code & Update Password
router.post("/reset-password", async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Stored Reset Code:", user.resetCode);
        console.log("Received Reset Code:", resetCode);
        console.log("Code Expiration:", new Date(user.resetCodeExpires));
        console.log("Current Time:", new Date());

        if (user.resetCode !== resetCode || Date.now() > user.resetCodeExpires) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        // ✅ Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        user.forcePasswordReset = false;
        await user.save();

        res.json({ message: "Password reset successful. You can now log in." });
    } catch (err) {
        console.error("Reset Password error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/reset-password-request", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit OTP
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 mins

        console.log("Before Saving:", user);
        await user.save();
        console.log("After Saving:", await User.findOne({ email })); // Check if it's saved

        // Send OTP via Email
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Your Password Reset Code",
            text: `Your password reset code is: ${resetCode}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Password reset code sent to your email." });
    } catch (err) {
        console.error("Reset Password Request error:", err);
        res.status(500).json({ error: "Server error" });
    }
});






  

module.exports = router;
