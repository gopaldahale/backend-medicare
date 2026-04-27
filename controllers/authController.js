import User from "../models/User.js";
import jwt from "jsonwebtoken";


// Register User 
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // 🔹 Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Check existing user
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // 🔹 Prepare data based on role
    let userData = {
      username,
      email,
      password,
      role,
    };

    // 👉 If doctor → add doctorInfo (minimal for now)
    if (role === "doctor") {
      userData.doctorInfo = {
        specialization: "General",
        experience: 0,
      };
    }

    // 👉 If patient → add patientInfo (optional)
    if (role === "patient") {
      userData.patientInfo = {};
    }

    // 🔹 Create user
    const user = await User.create(userData);

    // 🔹 Send safe response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message, // 🔥 show real error for debugging
    });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 1. Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    // 🔹 2. Find user (IMPORTANT: include password)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 🔹 3. Compare password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 🔹 4. Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔐 SET COOKIE
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true in https - false on localhost http
      sameSite: "lax",
      // maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 🔹 5. Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Current User 
export const getMe = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    res.json({ user });

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Logout user 
export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,       // ⚠️ must match
    sameSite: "lax"
  });

  res.json({ success: true, message: 'Logged out successfully!' });
};

