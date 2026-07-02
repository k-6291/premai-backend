import pool, { query } from '../config/db.js';

// 🔹 جلب جميع مستشعرات المصنع
export const getSensors = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    const sensors = await query(`
      SELECT 
        s.id, s.name, s.type, s.protocol, 
        s.connection_address, s.register_address,
        s.status, s.last_value, s.created_at,
        s.machine_id,
        m.name as machine_name,
        m.id as machine_id_ref
      FROM sensors s
      LEFT JOIN machines m ON s.machine_id = m.id
      WHERE m.factory_id = ? OR s.machine_id IS NULL
      ORDER BY s.created_at DESC
    `, [factoryId]);

    // فلترة المستشعرات: إما تابعة لمصنع المستخدم أو غير مرتبطة
    const filtered = sensors.filter(s => {
      if (!s.machine_id) return true; // غير مرتبط
      // تحقق أن الآلة تابعة للمصنع
      return true; // تم الفلترة في SQL
    });

    res.json(filtered);
  } catch (err) {
    console.error('Error fetching sensors:', err);
    res.status(500).json({ error: 'فشل في جلب المستشعرات' });
  }
};

// 🔹 إضافة مستشعر جديد
export const createSensor = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { 
      name, type, protocol, 
      connection_address, register_address,
      machine_id, description 
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !type) {
      return res.status(400).json({ error: 'اسم المستشعر ونوعه مطلوبان' });
    }

    // التحقق من أن الآلة تابعة للمصنع (إذا تم تحديدها)
    if (machine_id) {
      const machineCheck = await query(
        'SELECT id FROM machines WHERE id = ? AND factory_id = ?',
        [machine_id, factoryId]
      );
      if (!machineCheck.length) {
        return res.status(400).json({ error: 'الآلة المحددة غير موجودة أو غير تابعة لمصنعك' });
      }
    }

    const result = await query(
      `INSERT INTO sensors (machine_id, name, type, protocol, connection_address, register_address, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'offline')`,
      [
        machine_id || null,
        name,
        type,
        protocol || 'modbus_tcp',
        connection_address || null,
        register_address || null
      ]
    );

    res.status(201).json({
      message: 'تم إضافة المستشعر بنجاح',
      sensorId: result.insertId
    });
  } catch (err) {
    console.error('Error creating sensor:', err);
    res.status(500).json({ error: 'فشل في إضافة المستشعر' });
  }
};

// 🔹 تحديث مستشعر
export const updateSensor = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { id } = req.params;
    const { 
      name, type, protocol, 
      connection_address, register_address,
      machine_id, status
    } = req.body;

    // التحقق من ملكية المستشعر
    const sensorCheck = await query(`
      SELECT s.id FROM sensors s
      LEFT JOIN machines m ON s.machine_id = m.id
      WHERE s.id = ? AND (m.factory_id = ? OR s.machine_id IS NULL)
    `, [id, factoryId]);

    if (!sensorCheck.length) {
      return res.status(404).json({ error: 'المستشعر غير موجود' });
    }

    await query(
      `UPDATE sensors 
       SET name = ?, type = ?, protocol = ?, 
           connection_address = ?, register_address = ?,
           machine_id = ?, status = ?
       WHERE id = ?`,
      [
        name, type, protocol,
        connection_address || null, register_address || null,
        machine_id || null, status || 'offline',
        id
      ]
    );

    res.json({ message: 'تم تحديث المستشعر بنجاح' });
  } catch (err) {
    console.error('Error updating sensor:', err);
    res.status(500).json({ error: 'فشل في تحديث المستشعر' });
  }
};

// 🔹 حذف مستشعر
export const deleteSensor = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { id } = req.params;

    // التحقق من الملكية
    const sensorCheck = await query(`
      SELECT s.id FROM sensors s
      LEFT JOIN machines m ON s.machine_id = m.id
      WHERE s.id = ? AND (m.factory_id = ? OR s.machine_id IS NULL)
    `, [id, factoryId]);

    if (!sensorCheck.length) {
      return res.status(404).json({ error: 'المستشعر غير موجود' });
    }

    await query('DELETE FROM sensors WHERE id = ?', [id]);

    res.json({ message: 'تم حذف المستشعر بنجاح' });
  } catch (err) {
    console.error('Error deleting sensor:', err);
    res.status(500).json({ error: 'فشل في حذف المستشعر' });
  }
};

// 🔹 اختبار الاتصال (محاكاة)
export const testConnection = async (req, res) => {
  try {
    const { id } = req.params;
    
    // محاكاة اختبار الاتصال (80% نجاح)
    const success = Math.random() > 0.2;
    
    if (success) {
      // تحديث الحالة إلى online
      await query(
        "UPDATE sensors SET status = 'online', last_value = ? WHERE id = ?",
        [(Math.random() * 100).toFixed(2), id]
      );
      
      res.json({
        success: true,
        message: '✅ تم الاتصال بنجاح',
        lastValue: (Math.random() * 100).toFixed(2)
      });
    } else {
      await query("UPDATE sensors SET status = 'error' WHERE id = ?", [id]);
      
      res.json({
        success: false,
        message: '❌ فشل الاتصال - تحقق من العنوان والبروتوكول'
      });
    }
  } catch (err) {
    console.error('Error testing connection:', err);
    res.status(500).json({ error: 'فشل في اختبار الاتصال' });
  }
};

// 🔹 جلب آلات المصنع (لاختيار الآلة عند إضافة مستشعر)
export const getFactoryMachines = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    const machines = await query(`
      SELECT id, name 
      FROM machines 
      WHERE factory_id = ?
      ORDER BY name
    `, [factoryId]);

    res.json(machines);
  } catch (err) {
    console.error('Error fetching factory machines:', err);
    res.status(500).json({ error: 'فشل في جلب الآلات' });
  }
};