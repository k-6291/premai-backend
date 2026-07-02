import { Router } from 'express';
import { getAllModels, createModel } from '../controllers/model.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/admin/models', verifyToken, isAdmin, getAllModels);
router.post('/admin/models', verifyToken, isAdmin, createModel);
router.get('/models', verifyToken, getAllModels);
export default router;