import express from 'express';
import {
  register,              // ✅ الدالة الجديدة
  login,
  getPendingUsers,
  updateStatus,
  getRegistrationStatus
} from '../controllers/auth.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// 🔹 التسجيل (خطوة واحدة)
router.post('/register', register);

// 🔹 تتبع حالة التسجيل (اختياري)
router.get('/register/status/:tempId', getRegistrationStatus);

// 🔹 مصادقة
router.post('/login', login);

// 🔹 إدارة الأدمن (محمية)
router.get('/admin/pending-users', verifyToken, isAdmin, getPendingUsers);
router.patch('/admin/users/:id/status', verifyToken, isAdmin, updateStatus);

export default router;