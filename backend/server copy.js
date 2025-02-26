require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const milesRoutes = require("./routes/miles");
const venmoRoutes = require("./routes/venmo");
const { createServer } = require("http");
const { Server } = require("socket.io");

const User = require("./models/User"); // ✅ Import the User model


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT || 8090;

app.use(cors({
    origin: `http://localhost:8088`,  // Allow requests from Angular
    methods: "GET,POST,PUT,DELETE",  // Allowed HTTP methods
    allowedHeaders: "Content-Type,Authorization",  // Allowed headers
    credentials: true  // Allow cookies and authentication headers
  }));

// const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;  // Get MongoDB URI from .env

if (!MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in .env");
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/miles", milesRoutes);
app.use("/api/venmo", venmoRoutes);

app.use("/api/user", authRoutes);

io.on("connection", (socket) => {
    console.log("User connecteds");

    // socket.on("logMiles", (data) => {
    //     io.emit("updateMiles", data);
    // });
    // socket.on("logMiles", (data) => {
    //     console.log("DATA: ",data)
    //     if (data && data.totalMiles !== undefined) {
    //         io.emit("updateMiles", data);
    //     } else {
    //         console.error("Received invalid data in logMiles:", data);
    //     }
    // });
    socket.on("logMiles", async (data) => {
      console.log("DATA: ", data);
        if (!data || !data.name || data.miles === undefined || data.miles <= 0) {
          console.error("❌ Invalid data received in logMiles:", data);
          return;
        }
      
        try {
          // Update the database
          let user = await User.findOne({ name: data.name });
      
          if (user) {
            user.milesRan += data.miles;
          } else {
            user = new User({ name: data.name, milesRan: data.miles });
          }
      
          await user.save();
      
          // Fetch updated data and broadcast it
          const users = await User.find();
          const totalMiles = users.reduce((sum, u) => sum + u.milesRan, 0);
      
          io.emit("updateMiles", { totalMiles, allUsers: users });
        } catch (error) {
          console.error("❌ Error updating miles in MongoDB:", error);
        }
      });
      
    

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// httpServer.listen(5000, () => console.log("Server running on port 5000"));
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));


// const express = require("express");
// const cors = require("cors");
// const http = require("http");
// const { Server } = require("socket.io");

// // Import Routes
// const venmoRoutes = require("./routes/venmo");
// const milesRoutes = require("./routes/miles");

// const app = express();
// const PORT = process.env.PORT || 5001;

// // Enable CORS
// app.use(cors({
//   origin: "http://localhost:4200", // Allow requests from Angular frontend
//   methods: "GET,POST,PUT,DELETE",
//   allowedHeaders: "Content-Type,Authorization",
//   credentials: true
// }));

// // Middleware
// app.use(express.json()); // Parse JSON requests

// // Register API Routes
// app.use("/api/venmo", venmoRoutes);
// app.use("/api/miles", milesRoutes);

// // Create HTTP Server
// const server = http.createServer(app);

// // WebSocket Setup
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:4200",
//     methods: ["GET", "POST"]
//   }
// });

// // WebSocket Events
// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   socket.on("logMiles", (data) => {
//     if (data && data.totalMiles !== undefined) {
//       io.emit("updateMiles", data);
//     } else {
//       console.error("Invalid data received in logMiles:", data);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

// // Start the server
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
