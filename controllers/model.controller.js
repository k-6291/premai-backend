import { query } from '../config/db.js';

export const getAllModels = async (req, res) => {
  try {
    const models = await query('SELECT * FROM models ORDER BY created_at DESC');
    res.json(models);
  } catch (err) { res.status(500).json({ error: 'خطأ في جلب الموديلات' }); }
};

export const createModel = async (req, res) => {
  try {
    const { name, description, target_machine_type, accuracy } = req.body;
    const result = await query(
      'INSERT INTO models (name, description, target_machine_type, accuracy) VALUES (?, ?, ?, ?)',
      [name, description || '', target_machine_type || 'general', accuracy || 'N/A']
    );
    res.status(201).json({ message: 'تم إضافة الموديل بنجاح', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'خطأ في الإضافة' }); }
};