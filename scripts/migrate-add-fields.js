import mongoose from "mongoose";
import User from "../models/User.js"; // adjust path
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const runMigration = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("DB connected");

        const result = await User.updateMany(
            { profile: { $exists: false } }, // ✅ check whole object
            {
                $set: {
                    profile: {
                        firstName: "",
                        lastName: ""
                    }
                }
            }
        );

        console.log("Migration done:", result);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runMigration();