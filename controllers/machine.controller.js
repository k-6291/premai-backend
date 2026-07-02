import pool, { query } from '../config/db.js';

// 🔹 جلب جميع آلات المصنع (الاسم: getMachines)
export const getMachines = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    if (!factoryId) {
      return res.status(400).json({ error: 'لم يتم العثور على معرف المصنع' });
    }

    const machines = await query(`
      SELECT 
        m.id, m.name, m.description, m.status, m.rul_days,
        m.connected_at, m.model_id, m.production_line_id,
        pl.name as production_line_name,
        pl.color_code as line_color,
        mdl.name as model_name,
        sr.predicted_rul, sr.health_score, sr.timestamp as last_reading_time,
        (SELECT COUNT(*) FROM sensor_readings WHERE machine_id = m.id) as readings_count
      FROM machines m
      LEFT JOIN production_lines pl ON m.production_line_id = pl.id
      LEFT JOIN models mdl ON m.model_id = mdl.id
      LEFT JOIN (
        SELECT machine_id, predicted_rul, health_score, timestamp,
               ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY timestamp DESC) as rn
        FROM sensor_readings
      ) sr ON m.id = sr.machine_id AND sr.rn = 1
      WHERE m.factory_id = ?
      ORDER BY m.connected_at DESC
    `, [factoryId]);

    res.json(machines);
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ error: 'خطأ في جلب الآلات' });
  }
};

// 🔹 إضافة آلة جديدة (مع ربط خفي بمودلنا الحقيقي)
export const createMachine = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { 
      name, 
      description, 
      production_line_id, 
      model_id,
      sensors
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'اسم الآلة مطلوب' });
    }

    // ✅ المنطق الخفي: نستخدم المودل الحقيقي دائماً (id = 1)
    const REAL_MODEL_ID = 1;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. إنشاء الآلة وربطها بالمودل الحقيقي
      const [machineResult] = await connection.execute(
        `INSERT INTO machines (factory_id, production_line_id, name, description, model_id, status, rul_days) 
         VALUES (?, ?, ?, ?, ?, 'green', 365)`,
        [factoryId, production_line_id || null, name, description || '', REAL_MODEL_ID]
      );
      const machineId = machineResult.insertId;

      // 2. إضافة المستشعرات المرتبطة
      if (sensors && sensors.length > 0) {
        for (const sensor of sensors) {
          await connection.execute(
            `INSERT INTO sensors (machine_id, name, type, protocol, connection_address, status) 
             VALUES (?, ?, ?, ?, ?, 'online')`,
            [
              machineId,
              sensor.name,
              sensor.type,
              sensor.protocol || 'modbus_tcp',
              sensor.connection_address || null
            ]
          );
        }
      }

      // 3. إنشاء mapping بين المستشعرات ومدخلات المودل
      const sensorMapping = {
        'temperature': ['S1_Temp', 'S2_Bearing_Temp', 'S3_Ambient'],
        'vibration': ['S4_Vibration'],
        'pressure': ['S5_Oil_Pressure'],
        'rpm': ['S6_RPM']
      };

      const [allSensors] = await connection.execute(
        'SELECT id, name, type FROM sensors WHERE machine_id = ?',
        [machineId]
      );

      for (const sensor of allSensors) {
        const possibleInputs = sensorMapping[sensor.type] || [];
        if (possibleInputs.length > 0) {
          const modelInputName = possibleInputs[0];
          await connection.execute(
            `INSERT INTO model_sensor_mapping (machine_id, model_input_name, sensor_id) 
             VALUES (?, ?, ?)`,
            [machineId, modelInputName, sensor.id]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        message: 'تم إضافة الآلة بنجاح وربطها بمودل التنبؤ الذكي',
        machineId,
        modelUsed: 'RUL_Predictor_Model_V2'
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error creating machine:', err);
    res.status(500).json({ error: 'خطأ في إضافة الآلة', details: err.message });
  }
};

// 🔹 تحديث آلة
export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, production_line_id, status } = req.body;

    await query(
      `UPDATE machines 
       SET name = ?, description = ?, production_line_id = ?, status = ?
       WHERE id = ? AND factory_id = ?`,
      [name, description, production_line_id || null, status, id, req.user.factoryId]
    );

    res.json({ message: 'تم تحديث الآلة بنجاح' });
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ error: 'خطأ في تحديث الآلة' });
  }
};

// 🔹 حذف آلة
export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'DELETE FROM machines WHERE id = ? AND factory_id = ?',
      [id, req.user.factoryId]
    );

    res.json({ message: 'تم حذف الآلة بنجاح' });
  } catch (err) {
    console.error('Error deleting machine:', err);
    res.status(500).json({ error: 'خطأ في حذف الآلة' });
  }
};

// 🔹 جلب آخر 24 قراءة لآلة (للمودل)
export const getMachineReadings = async (req, res) => {
  try {
    const { id } = req.params;
    
    const readings = await query(`
      SELECT 
        s1_temp, s2_bearing_temp, s3_ambient, 
        s4_vibration, s5_oil_pressure, s6_rpm, is_working
      FROM sensor_readings
      WHERE machine_id = ?
      ORDER BY timestamp DESC
      LIMIT 24
    `, [id]);

    if (readings.length < 24) {
      return res.status(400).json({ 
        error: `لا توجد قراءات كافية. المطلوب: 24، المتاح: ${readings.length}` 
      });
    }

    const formattedReadings = readings.reverse().map(r => [
      parseFloat(r.s1_temp),
      parseFloat(r.s2_bearing_temp),
      parseFloat(r.s3_ambient),
      parseFloat(r.s4_vibration),
      parseFloat(r.s5_oil_pressure),
      parseFloat(r.s6_rpm),
      parseInt(r.is_working)
    ]);

    res.json({ readings: formattedReadings });
  } catch (err) {
    console.error('Error fetching readings:', err);
    res.status(500).json({ error: 'خطأ في جلب القراءات' });
  }
};

// 🔹 تحديث تنبؤ الآلة
export const updateMachinePrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const { predicted_rul, health_score, status } = req.body;

    await query(`
      UPDATE sensor_readings 
      SET predicted_rul = ?, health_score = ?
      WHERE machine_id = ? AND timestamp = (
        SELECT MAX(timestamp) FROM (
          SELECT timestamp FROM sensor_readings WHERE machine_id = ?
        ) as t
      )
    `, [predicted_rul, health_score, id, id]);

    await query(`
      UPDATE machines 
      SET status = ?, rul_days = ?
      WHERE id = ?
    `, [status, Math.floor(predicted_rul / 24), id]);

    res.json({ message: 'تم تحديث التنبؤ بنجاح' });
  } catch (err) {
    console.error('Error updating prediction:', err);
    res.status(500).json({ error: 'خطأ في تحديث التنبؤ' });
  }
};


// 🔹 جلب تفاصيل آلة واحدة
export const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const factoryId = req.user.factoryId;

    const machines = await query(`
      SELECT 
        m.id, m.name, m.description, m.status, m.rul_days,
        m.connected_at, m.model_id, m.production_line_id,
        pl.name as production_line_name,
        pl.color_code as line_color,
        mdl.name as model_name,
        mdl.accuracy as model_accuracy,
        sr.predicted_rul, sr.health_score, sr.timestamp as last_reading_time
      FROM machines m
      LEFT JOIN production_lines pl ON m.production_line_id = pl.id
      LEFT JOIN models mdl ON m.model_id = mdl.id
      LEFT JOIN (
        SELECT machine_id, predicted_rul, health_score, timestamp,
               ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY timestamp DESC) as rn
        FROM sensor_readings
      ) sr ON m.id = sr.machine_id AND sr.rn = 1
      WHERE m.id = ? AND m.factory_id = ?
    `, [id, factoryId]);

    if (!machines.length) {
      return res.status(404).json({ error: 'الآلة غير موجودة' });
    }

    res.json(machines[0]);
  } catch (err) {
    console.error('Error fetching machine:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات الآلة' });
  }
};

// 🔹 جلب مستشعرات آلة معينة
export const getMachineSensors = async (req, res) => {
  try {
    const { id } = req.params;
    const factoryId = req.user.factoryId;

    // التحقق من ملكية الآلة
    const machineCheck = await query(
      'SELECT id FROM machines WHERE id = ? AND factory_id = ?',
      [id, factoryId]
    );

    if (!machineCheck.length) {
      return res.status(404).json({ error: 'الآلة غير موجودة' });
    }

    const sensors = await query(`
      SELECT id, name, type, protocol, status, last_value, connection_address
      FROM sensors
      WHERE machine_id = ?
      ORDER BY name
    `, [id]);

    res.json(sensors);
  } catch (err) {
    console.error('Error fetching machine sensors:', err);
    res.status(500).json({ error: 'خطأ في جلب المستشعرات' });
  }
};

// 🔹 جلب سجل القراءات التاريخية لآلة
export const getMachineHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const factoryId = req.user.factoryId;
    const limit = parseInt(req.query.limit) || 50;

    // التحقق من ملكية الآلة
    const machineCheck = await query(
      'SELECT id FROM machines WHERE id = ? AND factory_id = ?',
      [id, factoryId]
    );

    if (!machineCheck.length) {
      return res.status(404).json({ error: 'الآلة غير موجودة' });
    }

    const readings = await query(`
      SELECT 
        timestamp,
        s1_temp as temperature,
        s4_vibration as vibration,
        s5_oil_pressure as pressure,
        predicted_rul,
        health_score
      FROM sensor_readings
      WHERE machine_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, [id, limit]);

    res.json(readings);
  } catch (err) {
    console.error('Error fetching machine history:', err);
    res.status(500).json({ error: 'خطأ في جلب السجل' });
  }
};