import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool, { query } from '../config/db.js';
// 🔹 التسجيل (خطوة واحدة)
export const register = async (req, res) => {
  try {
    const {
      email, password, factoryName, country, city, industryCategory,
      factorySize, employeeCount, automationLevel, mainMachineTypes,
      painPoints, managerName, managerTitle, phone
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!email || !password || !factoryName) {
      return res.status(400).json({ error: 'البريد وكلمة المرور واسم المصنع مطلوبة' });
    }

    // التحقق من عدم وجود البريد مسبقاً
    const exists = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(400).json({ error: 'البريد مسجل مسبقاً' });

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // بدء معاملة قاعدة البيانات
    const connection = await pool.getConnection(); // ✅ pool مستورد الآن
    
    try {
      await connection.beginTransaction();

      // 1. إنشاء المستخدم
      const [userResult] = await connection.execute(
        `INSERT INTO users (email, password_hash, factory_name, contact_phone, role, status) 
         VALUES (?, ?, ?, ?, 'factory_manager', 'pending')`,
        [email, hashedPassword, factoryName, phone]
      );
      const userId = userResult.insertId;

      // 2. إنشاء سجل المصنع
      await connection.execute(
        `INSERT INTO factories (user_id, name, location, industry_type) 
         VALUES (?, ?, ?, ?)`,
        [userId, factoryName, city, industryCategory]
      );

      // 3. إنشاء سجل التفاصيل الإضافية
      await connection.execute(
        `INSERT INTO factory_details (
          user_id, industry_category, factory_size, employee_count,
          automation_level, main_machine_types, pain_points
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, industryCategory, factorySize || 0, employeeCount || 0,
          automationLevel, JSON.stringify(mainMachineTypes || []),
          JSON.stringify(painPoints || [])
        ]
      );

      // 4. تسجيل في سجل الموافقات
      await connection.execute(
        `INSERT INTO approval_logs (user_id, action, notes) 
         VALUES (?, 'requested_info', 'تم إكمال التسجيل بنجاح - بانتظار المراجعة')`,
        [userId]
      );

      await connection.commit();

      res.status(201).json({ 
        message: 'تم إرسال طلبك بنجاح! سيتم مراجعته من قبل الإدارة.' 
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
  }
};

// 🔹 تتبع حالة التسجيل (اختياري)
export const getRegistrationStatus = async (req, res) => {
  try {
    const { tempId } = req.params;
    const tempData = await query(
      'SELECT created_at FROM registration_temp WHERE temp_id = ?', 
      [tempId]
    );
    
    if (!tempData.length) {
      return res.status(404).json({ status: 'expired', message: 'جلسة التسجيل منتهية' });
    }
    
    res.json({ status: 'active', message: 'اكمل الخطوة الثانية للتسجيل' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحقق من الحالة' });
  }
};

// 🔹 تسجيل الدخول (محدث)
// 🔹 تسجيل الدخول (محدث)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ✅ جلب المستخدم مع factory_id من جدول factories
    const users = await query(`
      SELECT 
        u.*, 
        f.id as factory_id,
        fd.industry_category, 
        fd.factory_size 
      FROM users u 
      LEFT JOIN factories f ON u.id = f.user_id
      LEFT JOIN factory_details fd ON u.id = fd.user_id
      WHERE u.email = ?`, 
      [email]
    );
    
    if (!users.length) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });

    // التحقق من حالة الحساب
    if (user.status === 'pending') {
      return res.status(200).json({ 
        status: 'pending', 
        message: 'حسابك قيد المراجعة من الإدارة. ستصلك رسالة عند الموافقة.' 
      });
    }
    if (user.status === 'rejected') {
      const rejection = await query(
        'SELECT notes FROM approval_logs WHERE user_id = ? AND action = "rejected" ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
      return res.status(200).json({ 
        status: 'rejected', 
        message: 'تم رفض تفعيل حسابك',
        reason: rejection[0]?.notes || 'لا يوجد سبب محدد'
      });
    }

    // ✅ إنشاء التوكن مع factory_id
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        factoryId: user.factory_id  // ✅ الآن factory_id موجود
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // تحديث آخر دخول
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    
    res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        factoryName: user.factory_name, 
        role: user.role,
        factoryId: user.factory_id,
        factoryDetails: {
          industry_category: user.industry_category,
          factory_size: user.factory_size
        }
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
  }
};

// 🔹 جلب الطلبات المعلقة (للأدمن)
export const getPendingUsers = async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        u.id, u.email, u.factory_name, u.contact_phone, u.created_at,
        fd.industry_category, fd.factory_size, fd.employee_count,
        fd.automation_level, fd.main_machine_types, fd.pain_points
      FROM users u
      LEFT JOIN factory_details fd ON u.id = fd.user_id
      WHERE u.status = 'pending' AND u.role = 'factory_manager'
      ORDER BY u.created_at DESC
    `);
    
    // تحويل الحقول JSON من نصوص إلى كائنات
    const formatted = users.map(u => ({
      ...u,
      main_machine_types: u.main_machine_types ? JSON.parse(u.main_machine_types) : [],
      pain_points: u.pain_points ? JSON.parse(u.pain_points) : []
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
};

// 🔹 تحديث حالة المستخدم (موافقة/رفض)
export const updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id: userId } = req.params;
    const adminId = req.user?.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة' });
    }

    // التحقق من وجود المستخدم
    const userCheck = await query('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!userCheck.length) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // ✅ استخدام getConnection بدلاً من أوامر SQL
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // تحديث حالة المستخدم
      await connection.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

      // تسجيل في سجل الموافقات
      await connection.execute(
        `INSERT INTO approval_logs (user_id, admin_id, action, notes) VALUES (?, ?, ?, ?)`,
        [userId, adminId, status, notes || null]
      );

      if (status === 'approved') {
        console.log(`✅ تم الموافقة على حساب: ${userCheck[0].email}`);
      } else {
        console.log(`❌ تم رفض حساب: ${userCheck[0].email}`);
      }

      await connection.commit();

      res.json({
        message: `تم ${status === 'approved' ? 'الموافقة' : 'الرفض'} بنجاح`,
        userEmail: userCheck[0].email
      });

    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'خطأ في تحديث الحالة' });
  }
};