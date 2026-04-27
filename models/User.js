import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

// ─────────────────────────────────────────
// Sub-schemas
// ─────────────────────────────────────────

const addressSchema = new Schema({
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: { type: String, default: "IN" },
    pincode: String,
}, { _id: false });

const profileSchema = new Schema({
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },

    phone: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dateOfBirth: { type: Date },
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    address: addressSchema,
    avatar: String,
    bio: { type: String, maxlength: 500 },
}, { _id: false });

const doctorInfoSchema = new Schema({
    specialization: String,
    experience: { type: Number, min: 0 },
    qualification: [{ type: String }],
    registrationNumber: String,
    hospitalName: String,
    hospitalAddress: addressSchema,
    consultationFee: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    availableDays: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
    slotDurationMins: { type: Number, default: 30 },
    languages: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
}, { _id: false });

const patientInfoSchema = new Schema({
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
    },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    currentMedications: [{ type: String }],
    insuranceProvider: String,
    insurancePolicyNo: String,
}, { _id: false });

const securitySchema = new Schema({
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
}, { _id: false });

const subscriptionSchema = new Schema({
    plan: { type: String, enum: ["free", "basic", "pro", "enterprise"], default: "free" },
    status: { type: String, enum: ["active", "inactive", "cancelled", "past_due"], default: "active" },
    startDate: Date,
    endDate: Date,
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
}, { _id: false });

// ─────────────────────────────────────────
// Main Schema
// ─────────────────────────────────────────

const userSchema = new Schema(
    {
        // Identity
        username: { type: String, required: true, trim: true, minlength: 3 },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/.+\@.+\..+/, "Please enter valid email"],
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        role: {
            type: String,
            enum: ["patient", "doctor", "admin"],
            default: "patient",
        },

        // Profile
        profile: { type: profileSchema, default: () => ({}) },
        doctorInfo: { type: doctorInfoSchema, default: undefined },
        patientInfo: { type: patientInfoSchema, default: undefined },

        // Multi-tenancy
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

        // Security
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isBanned: { type: Boolean, default: false },
        bannedReason: String,
        security: { type: securitySchema, default: () => ({}) },

        // Tokens
        emailVerificationToken: { type: String, select: false },
        emailVerificationExpire: { type: Date, select: false },
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpire: { type: Date, select: false },

        // OAuth
        oAuthProviders: [{
            provider: String,
            providerId: String,
            _id: false,
        }],

        // Notifications
        notificationPreferences: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true },
        },

        // Subscription
        subscription: { type: subscriptionSchema, default: () => ({}) },

        // Tracking
        lastLogin: Date,
        lastLoginIp: String,

        // Soft delete
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// ─────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────

userSchema.index({ role: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ "subscription.plan": 1 });
userSchema.index({ deletedAt: 1 });

// ─────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────

userSchema.virtual("age").get(function () {
    if (!this.profile?.dateOfBirth) return null;
    return Math.floor((Date.now() - this.profile.dateOfBirth) / 3.156e10);
});

// ─────────────────────────────────────────
// Middleware (IMPORTANT 🔥)
// ─────────────────────────────────────────

// 🔐 Hash password before save
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});

// 🧠 Role-based validation
userSchema.pre("save", function () {
    if (this.role === "doctor" && !this.doctorInfo) {
        return (Error("Doctor info required"));
    }
});

// 🧹 Soft delete filter
userSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

// ─────────────────────────────────────────
// Methods
// ─────────────────────────────────────────

// 🔐 Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 🧹 Soft delete
userSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    this.isActive = false;
    return this.save();
};

const User = mongoose.model("users", userSchema);

export default User;