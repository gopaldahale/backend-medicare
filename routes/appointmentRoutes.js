import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  updateAppointmentStatus
} from "../controllers/appointmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createAppointment);
router.get("/my", protect, getMyAppointments);
router.get("/doctor-appointment", protect, getDoctorAppointments);
router.patch("/:id/status", protect, updateAppointmentStatus);

export default router;