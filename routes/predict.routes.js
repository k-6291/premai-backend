import { Router } from 'express';

const router = Router();

const AI_SERVICE_URL = 'http://localhost:8000/predict';

// 🔹 التنبؤ بالعمر المتبقي (يتصل بخدمة الذكاء الاصطناعي)
router.post('/', async (req, res) => {
  try {
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('❌ خطأ في الاتصال بخدمة الذكاء الاصطناعي:', err.message);
    res.status(500).json({ error: 'خدمة الذكاء الاصطناعي غير متاحة حالياً' });
  }
});

export default router;