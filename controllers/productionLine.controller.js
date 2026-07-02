import pool, { query } from '../config/db.js';

// 🔹 جلب جميع سلاسل الإنتاج للمصنع
export const getAllProductionLines = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    
    const lines = await query(`
      SELECT 
        pl.id, 
        pl.name, 
        pl.color_code, 
        pl.created_at,
        COUNT(m.id) as machines_count
      FROM production_lines pl
      LEFT JOIN machines m ON pl.id = m.production_line_id
      WHERE pl.factory_id = ?
      GROUP BY pl.id, pl.name, pl.color_code, pl.created_at
      ORDER BY pl.created_at DESC
    `, [factoryId]);
    
    res.json(lines);
  } catch (err) {
    console.error('Error fetching production lines:', err);
    res.status(500).json({ error: 'فشل في جلب سلاسل الإنتاج' });
  }
};

// 🔹 إضافة سلسلة إنتاج جديدة
export const createProductionLine = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { name, color_code } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم السلسلة مطلوب' });
    }

    const result = await query(
      'INSERT INTO production_lines (factory_id, name, color_code) VALUES (?, ?, ?)',
      [factoryId, name.trim(), color_code || '#3b82f6']
    );

    res.status(201).json({ 
      message: 'تم إضافة سلسلة الإنتاج بنجاح',
      lineId: result.insertId 
    });
  } catch (err) {
    console.error('Error creating production line:', err);
    res.status(500).json({ error: 'فشل في إضافة سلسلة الإنتاج' });
  }
};

// 🔹 تحديث سلسلة إنتاج
export const updateProductionLine = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { id } = req.params;
    const { name, color_code } = req.body;

    const lineCheck = await query(
      'SELECT id FROM production_lines WHERE id = ? AND factory_id = ?',
      [id, factoryId]
    );

    if (!lineCheck.length) {
      return res.status(404).json({ error: 'السلسلة غير موجودة' });
    }

    await query(
      'UPDATE production_lines SET name = ?, color_code = ? WHERE id = ?',
      [name, color_code, id]
    );

    res.json({ message: 'تم تحديث سلسلة الإنتاج بنجاح' });
  } catch (err) {
    console.error('Error updating production line:', err);
    res.status(500).json({ error: 'فشل في تحديث سلسلة الإنتاج' });
  }
};

// 🔹 حذف سلسلة إنتاج
export const deleteProductionLine = async (req, res) => {
  try {
    const factoryId = req.user.factoryId;
    const { id } = req.params;

    const lineCheck = await query(
      'SELECT id FROM production_lines WHERE id = ? AND factory_id = ?',
      [id, factoryId]
    );

    if (!lineCheck.length) {
      return res.status(404).json({ error: 'السلسلة غير موجودة' });
    }

    // إزالة ربط الآلات بالسلسلة
    await query(
      'UPDATE machines SET production_line_id = NULL WHERE production_line_id = ?',
      [id]
    );

    // حذف السلسلة
    await query('DELETE FROM production_lines WHERE id = ?', [id]);

    res.json({ message: 'تم حذف سلسلة الإنتاج بنجاح' });
  } catch (err) {
    console.error('Error deleting production line:', err);
    res.status(500).json({ error: 'فشل في حذف سلسلة الإنتاج' });
  }
};