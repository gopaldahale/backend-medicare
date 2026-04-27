import User from "../models/User.js";

// Get Doctor 
export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select("username email doctorInfo");

    res.json(doctors);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};