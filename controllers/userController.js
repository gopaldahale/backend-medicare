import User from "../models/User.js";

// Get Doctor 
export const getDoctors = async (req, res) => {
  try {
    let favoriteDoctors = [];
    if (req.user?.id) {
      const currentUser = await User.findById(req.user.id).select("favoriteDoctors");
      favoriteDoctors = currentUser?.favoriteDoctors?.map((id) => id.toString()) || [];
    }

    const doctors = await User.find({ role: "doctor" }).select("username email doctorInfo");
    const doctorsWithFavorite = doctors.map((doctor) => ({
      ...doctor.toObject(),
      isFavorite: favoriteDoctors.includes(doctor._id.toString()),
    }));

    res.json(doctorsWithFavorite);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getFavoriteDoctors = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "favoriteDoctors",
      "username email doctorInfo"
    );
    res.json(user?.favoriteDoctors || []);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleFavoriteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const index = user.favoriteDoctors.findIndex(
      (favId) => favId.toString() === doctorId
    );

    let isFavorite = false;
    if (index > -1) {
      user.favoriteDoctors.splice(index, 1);
    } else {
      user.favoriteDoctors.push(doctorId);
      isFavorite = true;
    }

    await user.save();

    res.json({
      message: isFavorite ? "Doctor added to favorites" : "Doctor removed from favorites",
      isFavorite,
      favoriteDoctors: user.favoriteDoctors,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};