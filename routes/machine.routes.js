import { Router } from 'express';
import { 
  getMachines,
  getMachineById,
  getMachineSensors,
  getMachineHistory,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineReadings,
  updateMachinePrediction
} from '../controllers/machine.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// ✅ المسارات المحددة أولاً (قبل العامة)
router.get('/machines/:id', verifyToken, getMachineById);
router.get('/machines/:id/sensors', verifyToken, getMachineSensors);
router.get('/machines/:id/history', verifyToken, getMachineHistory);
router.get('/machines/:id/readings', verifyToken, getMachineReadings);
router.patch('/machines/:id/prediction', verifyToken, updateMachinePrediction);
router.put('/machines/:id', verifyToken, updateMachine);
router.delete('/machines/:id', verifyToken, deleteMachine);

// ✅ المسارات العامة
router.get('/machines', verifyToken, getMachines);
router.post('/machines', verifyToken, createMachine);

export default router;