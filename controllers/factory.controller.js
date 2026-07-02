import { query } from '../config/db.js';

// جلب جميع المصانع المعتمدة
export const getAllFactories = async (req, res) => {
  try {
    const factories = await query(`
      SELECT f.*, u.email as owner_email 
      FROM factories f 
      JOIN users u ON f.user_id = u.id 
      WHERE u.status = 'approved'
      ORDER BY f.created_at DESC
    `);
    res.json(factories);
  } catch (err) {
    console.error('Error fetching factories:', err);
    res.status(500).json({ error: 'خطأ في جلب المصانع' });
  }
};

// إضافة مصنع جديد (يدوياً من الأدمن)
export const createFactory = async (req, res) => {
  try {
    const { name, location, industry_type, contact_email, contact_phone } = req.body;
    
    // نحتاج user_id لمصنع، نستخدم أدمن كمالك مؤقت أو نبحث عن مستخدم بالبريد
    let userId = req.user?.id; // الأدمن الذي يضيف
    if (contact_email) {
      const user = await query('SELECT id FROM users WHERE email = ? AND status = "approved"', [contact_email]);
      if (user.length) userId = user[0].id;
    }

    const result = await query(
      `INSERT INTO factories (user_id, name, location, industry_type) VALUES (?, ?, ?, ?)`,
      [userId, name, location, industry_type]
    );
    
    res.status(201).json({ 
      message: 'تم إضافة المصنع بنجاح', 
      factoryId: result.insertId 
    });
  } catch (err) {
    console.error('Error creating factory:', err);
    res.status(500).json({ error: 'خطأ في إضافة المصنع' });
  }
};

// حذف مصنع
export const deleteFactory = async (req, res) => {
  try {
    await query('DELETE FROM factories WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف المصنع بنجاح' });
  } catch (err) {
    console.error('Error deleting factory:', err);
    res.status(500).json({ error: 'خطأ في حذف المصنع' });
  }
};