import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from './routes/userRoutes.js'
import appointmentRoutes from "./routes/appointmentRoutes.js";
import cookieParser from "cookie-parser";

dotenv.config();
connectDB();

const app = express();


// middleware
// app.use(cors());
app.use(cors({
  origin: "http://localhost:5173", // your frontend
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use('/api/users', userRoutes)

// test route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});