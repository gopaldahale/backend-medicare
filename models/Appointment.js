import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },

        // ─── Scheduling ───────────────────────────────────────────────
        date: {
            type: Date,
            required: true,
        },
        startTime: {
            type: String, // "09:00", "14:30"
            required: true,
        },
        endTime: {
            type: String, // "09:30", "15:00"
            required: true,
        },
        duration: {
            type: Number, // in minutes e.g. 30
            default: 30,
        },

        // ─── Appointment Details ───────────────────────────────────────
        type: {
            type: String,
            enum: ["in-person", "online", "emergency"],
            default: "in-person",
        },
        department: {
            type: String, // "Cardiology", "Orthopedics", etc.
            required: true,
        },
        reason: {
            type: String, // Chief complaint / reason for visit
            required: true,
        },
        symptoms: [String], // ["fever", "headache"]

        // ─── Status & Workflow ─────────────────────────────────────────
        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "checked-in",
                "in-progress",
                "completed",
                "cancelled",
                "no-show",
            ],
            default: "pending",
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        cancellationReason: String,

        // ─── Medical Notes ─────────────────────────────────────────────
        notes: {
            type: String, // General notes (pre-appointment)
        },
        diagnosis: String,       // Filled after consultation
        prescription: [
            {
                medicine: String,
                dosage: String,
                duration: String,
                instructions: String,
            },
        ],
        followUpRequired: {
            type: Boolean,
            default: false,
        },
        followUpDate: Date,

        // ─── Online Appointment ────────────────────────────────────────
        meetingLink: String,     // Populated if type === "online"

        // ─── Payment ──────────────────────────────────────────────────
        fee: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "refunded"],
            default: "unpaid",
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "card", "insurance", "online"],
        },

        // ─── Reminders ────────────────────────────────────────────────
        reminderSent: {
            type: Boolean,
            default: false,
        },
        reminderSentAt: Date,
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

// ─── Indexes for common queries ──────────────────────────────────
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// ─── Virtual: full appointment datetime ──────────────────────────
appointmentSchema.virtual("appointmentDateTime").get(function () {
    const [hours, minutes] = this.startTime.split(":").map(Number);
    const dt = new Date(this.date);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
});

// ─── Pre-save: prevent double-booking ────────────────────────────
appointmentSchema.pre("save", async function () {
    if (this.isNew || this.isModified("date") || this.isModified("startTime")) {
        const conflict = await mongoose.model("appointments").findOne({
            doctor: this.doctor,
            date: this.date,
            startTime: this.startTime,
            status: { $nin: ["cancelled", "no-show"] },
            _id: { $ne: this._id },
        });

        if (conflict) {
            throw new Error("Doctor already has an appointment at this time.");
        }
    }
});

const Appointment = mongoose.model("appointments", appointmentSchema);
export default Appointment;