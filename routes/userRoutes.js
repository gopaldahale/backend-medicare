import express from "express";
import {
  getDoctors,
  getFavoriteDoctors,
  toggleFavoriteDoctor,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get('/doctors', getDoctors)
router.get("/favorites", protect, getFavoriteDoctors);
router.patch("/favorites/:doctorId", protect, toggleFavoriteDoctor);

export default router