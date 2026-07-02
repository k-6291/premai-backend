import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import factoryRoutes from './routes/factory.routes.js';
import modelRoutes from './routes/model.routes.js';
import predictRouter from './routes/predict.routes.js';
import machineRoutes from './routes/machine.routes.js';
import productionLineRoutes from './routes/productionLine.routes.js';
import sensorRoutes from './routes/sensor.routes.js';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ✅ الترتيب مهم: المسارات المحددة أولاً، العامة أخيراً
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictRouter);           // ✅ محدد - يجب أن يكون قبل العام
app.use('/api/production-lines', productionLineRoutes);  // ✅ محدد
app.use('/api', factoryRoutes);
app.use('/api', modelRoutes);
app.use('/api', machineRoutes);
app.use('/api', sensorRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ سيرفر ReliQ يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الواجهة متاحة على: ${process.env.CORS_ORIGIN}`);
});