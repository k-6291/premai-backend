import { Router } from 'express';
import { getAllFactories, createFactory, deleteFactory } from '../controllers/factory.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// جميع المسارات محمية وتتطلب أدمن
router.get('/admin/factories', verifyToken, isAdmin, getAllFactories);
router.post('/admin/factories', verifyToken, isAdmin, createFactory);
router.delete('/admin/factories/:id', verifyToken, isAdmin, deleteFactory);

export default router;