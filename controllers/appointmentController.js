import Appointment from "../models/Appointment.js";

// Create appointment (patient only)
export const createAppointment = async (req, res) => {
    try {
        const {
            doctorId,
            date,
            startTime,
            endTime,
            department,
        type,
            reason,
        } = req.body;

        // ✅ Basic validation
        if (!doctorId || !date || !startTime || !endTime || !department || !reason) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Date validation
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return res.status(400).json({
                message: "Cannot book appointment in the past",
            });
        }

        // ✅ Same-day time validation
        const now = new Date();

        if (selectedDate.toDateString() === now.toDateString()) {
            const [hours, minutes] = startTime.split(":").map(Number);

            const appointmentTime = new Date(selectedDate);
            appointmentTime.setHours(hours, minutes, 0, 0);

            if (appointmentTime < now) {
                return res.status(400).json({
                    message: "Cannot book past time for today",
                });
            }
        }

        // ✅ Create appointment
        const appointment = await Appointment.create({
            patient: req.user.id,
            doctor: doctorId,
            date: selectedDate, // ensure proper Date format
            startTime,
            endTime,
            department,
            type,
            reason,
        });

        res.status(201).json({
            message: "Appointment created",
            appointment,
        });

    } catch (error) {
        console.error("CREATE APPOINTMENT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// Get patient appointments
export const getMyAppointments = async (req, res) => {
    try {
        let query = {};
        let populateField = "doctor";
        let populateSelection = "username email doctorInfo";

        if (req.user.role === "doctor") {
            query = { doctor: req.user.id };
            populateField = "patient";
            populateSelection = "username email profile";
        } else {
            query = { patient: req.user.id };
        }

        const appointments = await Appointment.find(query)
            .populate(populateField, populateSelection)
            .sort({ date: 1, startTime: 1 });

        res.json(appointments);
        // console.log("REQ USER ID:", req.user.id);

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Get doctor appointments
export const getDoctorAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctor: req.user.id,
        }).populate("patient", "username email profile");

        res.json(appointments);

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/appointments/:id/status
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "confirmed" | "cancelled" | "completed" ...

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // 🔐 Only the assigned doctor can update
        // if (appointment.doctor.toString() !== req.user.id) {
        //   return res.status(403).json({ message: "Not authorized" });
        // }

        if (
            appointment.doctor.toString() !== req.user.id &&
            appointment.patient.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        appointment.status = status;

        // optional audit fields
        if (status === "cancelled") {
            appointment.cancelledBy = req.user.id;
        }

        await appointment.save();

        res.json({ message: "Status updated", appointment });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

export const rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime } = req.body;

        if (!date || !startTime || !endTime) {
            return res.status(400).json({ message: "Date, start time and end time are required" });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (
            appointment.patient.toString() !== req.user.id &&
            appointment.doctor.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (["completed", "cancelled", "no-show"].includes(appointment.status)) {
            return res.status(400).json({ message: "This appointment cannot be rescheduled" });
        }

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            return res.status(400).json({ message: "Cannot reschedule to a past date" });
        }

        appointment.date = selectedDate;
        appointment.startTime = startTime;
        appointment.endTime = endTime;
        appointment.status = "pending";

        await appointment.save();
        res.json({ message: "Appointment rescheduled", appointment });
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
};

export const updateAppointmentNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Only doctor can add notes" });
        }

        appointment.notes = (notes || "").trim();
        await appointment.save();

        res.json({ message: "Notes updated", appointment });
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
};