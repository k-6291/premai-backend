import { Router } from 'express';
import pool, { query } from '../config/db.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// 🔹 جلب جميع المستشعرات الخاصة بالمصنع
router.get('/sensors', verifyToken, async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    const sensors = await query(`
      SELECT s.*, m.name as machine_name
      FROM sensors s
      JOIN machines m ON s.machine_id = m.id
      WHERE m.factory_id = ?
      ORDER BY s.created_at DESC
    `, [factoryId]);
    
    res.json(sensors);
  } catch (err) {
    console.error('Error fetching sensors:', err);
    res.status(500).json({ error: 'فشل في جلب المستشعرات' });
  }
});

// 🔹 جلب أنواع المستشعرات المتاحة
router.get('/sensor-types', verifyToken, async (req, res) => {
  try {
    const sensorTypes = await query('SELECT * FROM sensor_types ORDER BY name');
    res.json(sensorTypes);
  } catch (err) {
    console.error('Error fetching sensor types:', err);
    res.status(500).json({ error: 'فشل في جلب أنواع المستشعرات' });
  }
});

// 🔹 إضافة موديل جديد مع المستشعرات المرتبطة (للأدمن)
router.post('/admin/models', verifyToken, isAdmin, async (req, res) => {
  const { name, description, target_machine_type, accuracy, sensor_types } = req.body;
  
  if (!name || !sensor_types || sensor_types.length === 0) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول واختيار مستشعر واحد على الأقل' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [modelResult] = await connection.execute(
      `INSERT INTO models (name, description, target_machine_type, accuracy, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [name, description, target_machine_type, accuracy]
    );
    const modelId = modelResult.insertId;

    if (sensor_types && sensor_types.length > 0) {
      const values = sensor_types.map(sensorId => [modelId, sensorId]);
      await connection.query(
        'INSERT INTO model_sensors (model_id, sensor_type_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'تم إضافة الموديل والمستشعرات بنجاح', modelId });
  } catch (err) {
    await connection.rollback();
    console.error('Error creating model:', err);
    res.status(500).json({ error: 'فشل في إضافة الموديل' });
  } finally {
    connection.release();
  }
});

// 🔹 جلب الموديلات مع المستشعرات (للأدمن)
router.get('/admin/models', verifyToken, isAdmin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT m.*, 
             JSON_ARRAYAGG(JSON_OBJECT('id', st.id, 'name', st.name, 'type_key', st.type_key)) as sensors
      FROM models m
      LEFT JOIN model_sensors ms ON m.id = ms.model_id
      LEFT JOIN sensor_types st ON ms.sensor_type_id = st.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    
    const models = rows.map(row => ({
      ...row,
      sensors: row.sensors ? JSON.parse(row.sensors) : []
    }));
    
    res.json(models);
  } catch (err) {
    console.error('Error fetching models:', err);
    res.status(500).json({ error: 'فشل في جلب الموديلات' });
  }
});

// 🔹 ✅ Endpoint عام لسوق الموديلات (بدون مصادقة) - المسار الصحيح
router.get('/marketplace/models', async (req, res) => {
  try {
    // جلب البيانات بشكل مسطح (بدون JSON_ARRAYAGG)
    const rows = await query(`
      SELECT m.id, m.name, m.description, m.target_machine_type, m.accuracy, m.status,
             st.id as sensor_id, st.name as sensor_name, st.type_key as sensor_type_key
      FROM models m
      LEFT JOIN model_sensors ms ON m.id = ms.model_id
      LEFT JOIN sensor_types st ON ms.sensor_type_id = st.id
      WHERE m.status = 'active'
      ORDER BY m.created_at DESC
    `);

    // تجميع البيانات باستخدام JavaScript
    const modelsMap = {};
    
    for (const row of rows) {
      if (!modelsMap[row.id]) {
        modelsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          target_machine_type: row.target_machine_type,
          accuracy: row.accuracy,
          status: row.status,
          sensors: []
        };
      }
      
      if (row.sensor_id) {
        modelsMap[row.id].sensors.push({
          id: row.sensor_id,
          name: row.sensor_name,
          type_key: row.sensor_type_key
        });
      }
    }

    const models = Object.values(modelsMap);
    res.json(models);
    
  } catch (err) {
    console.error('Error fetching marketplace models:', err);
    res.status(500).json({ error: 'فشل في جلب الموديلات', details: err.message });
  }
});




// 🔹 جلب الموديلات المحملة للمصنع الحالي
// 🔹 جلب الموديلات المحملة للمصنع الحالي (بدون JSON_ARRAYAGG)
// 🔹 جلب الموديلات المحملة للمصنع الحالي (مع type_key)
router.get('/downloaded-models', verifyToken, async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    const rows = await query(`
      SELECT dm.model_id, dm.downloaded_at,
             m.name, m.description, m.accuracy, m.target_machine_type,
             st.id as sensor_id, st.name as sensor_name, st.type_key as sensor_type_key
      FROM downloaded_models dm
      JOIN models m ON dm.model_id = m.id
      LEFT JOIN model_sensors ms ON m.id = ms.model_id
      LEFT JOIN sensor_types st ON ms.sensor_type_id = st.id
      WHERE dm.factory_id = ?
      ORDER BY dm.downloaded_at DESC
    `, [factoryId]);

    const modelsMap = {};
    
    for (const row of rows) {
      if (!modelsMap[row.model_id]) {
        modelsMap[row.model_id] = {
          model_id: row.model_id,
          downloaded_at: row.downloaded_at,
          name: row.name,
          description: row.description,
          accuracy: row.accuracy,
          target_machine_type: row.target_machine_type,
          sensors: []
        };
      }
      
      if (row.sensor_id) {
        const exists = modelsMap[row.model_id].sensors.some(s => s.id === row.sensor_id);
        if (!exists) {
          modelsMap[row.model_id].sensors.push({
            id: row.sensor_id,
            name: row.sensor_name,
            type_key: row.sensor_type_key // ✅ مهم جداً
          });
        }
      }
    }

    res.json(Object.values(modelsMap));
  } catch (err) {
    console.error('Error fetching downloaded models:', err);
    res.status(500).json({ error: 'فشل في جلب الموديلات المحملة' });
  }
});

// 🔹 حفظ موديل كمحمّل
router.post('/downloaded-models', verifyToken, async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { model_id } = req.body;

    if (!model_id) {
      return res.status(400).json({ error: 'model_id مطلوب' });
    }

    // التحقق من وجود الموديل
    const modelExists = await query('SELECT id FROM models WHERE id = ?', [model_id]);
    if (!modelExists.length) {
      return res.status(404).json({ error: 'الموديل غير موجود' });
    }

    // حفظ التحميل (مع تجاهل التكرار)
    await query(
      `INSERT IGNORE INTO downloaded_models (factory_id, model_id) 
       VALUES (?, ?)`,
      [factoryId, model_id]
    );

    res.status(201).json({ 
      message: 'تم حفظ الموديل كمحمّل بنجاح',
      model_id 
    });
  } catch (err) {
    console.error('Error saving downloaded model:', err);
    res.status(500).json({ error: 'فشل في حفظ الموديل' });
  }
});

// 🔹 حذف موديل من المحملين
router.delete('/downloaded-models/:modelId', verifyToken, async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { modelId } = req.params;

    await query(
      'DELETE FROM downloaded_models WHERE factory_id = ? AND model_id = ?',
      [factoryId, modelId]
    );

    res.json({ message: 'تم حذف الموديل من المحملين' });
  } catch (err) {
    console.error('Error deleting downloaded model:', err);
    res.status(500).json({ error: 'فشل في حذف الموديل' });
  }
});


import { 
  getSensors, 
  createSensor, 
  updateSensor, 
  deleteSensor,
  testConnection,
  getFactoryMachines
} from '../controllers/sensor.controller.js';

// 🔹 إدارة المستشعرات (محمية)
router.get('/sensors/list', verifyToken, getSensors);
router.post('/sensors', verifyToken, createSensor);
router.put('/sensors/:id', verifyToken, updateSensor);
router.delete('/sensors/:id', verifyToken, deleteSensor);
router.post('/sensors/:id/test', verifyToken, testConnection);
router.get('/factory/machines', verifyToken, getFactoryMachines);

export default router;