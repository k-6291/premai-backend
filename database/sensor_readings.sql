-- جدول قراءات المستشعرات (Time-Series Data)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machine_id INT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- المستشعرات الـ 7 المطلوبة للمودل
  s1_temp DECIMAL(10,2) NOT NULL,        -- حرارة المحرك
  s2_bearing_temp DECIMAL(10,2) NOT NULL, -- حرارة المحامل
  s3_ambient DECIMAL(10,2) NOT NULL,     -- حرارة الجو
  s4_vibration DECIMAL(10,4) NOT NULL,   -- الاهتزاز
  s5_oil_pressure DECIMAL(10,2) NOT NULL, -- ضغط الزيت
  s6_rpm DECIMAL(10,2) NOT NULL,         -- سرعة الدوران
  is_working TINYINT(1) NOT NULL,        -- حالة التشغيل
  
  -- الحقول المحسوبة
  predicted_rul DECIMAL(10,2) DEFAULT NULL, -- العمر المتبقي المتوقع
  health_score DECIMAL(5,2) DEFAULT NULL,   -- نسبة الصحة
  
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  INDEX idx_machine_timestamp (machine_id, timestamp DESC)
);

-- إضافة بيانات تجريبية (قراءات حقيقية لآلة m1)
-- سنضيف 24 قراءة (آخر 4 ساعات) لاختبار المودل
INSERT INTO sensor_readings (machine_id, timestamp, s1_temp, s2_bearing_temp, s3_ambient, s4_vibration, s5_oil_pressure, s6_rpm, is_working) VALUES
(1, NOW() - INTERVAL 23 HOUR, 75.2, 60.1, 24.5, 3.5, 48.3, 1450, 1),
(1, NOW() - INTERVAL 22 HOUR, 75.5, 60.3, 24.6, 3.6, 48.1, 1448, 1),
(1, NOW() - INTERVAL 21 HOUR, 76.0, 60.8, 24.7, 3.7, 47.9, 1445, 1),
(1, NOW() - INTERVAL 20 HOUR, 76.5, 61.2, 24.8, 3.8, 47.7, 1442, 1),
(1, NOW() - INTERVAL 19 HOUR, 77.0, 61.7, 24.9, 3.9, 47.5, 1440, 1),
(1, NOW() - INTERVAL 18 HOUR, 77.5, 62.1, 25.0, 4.0, 47.3, 1438, 1),
(1, NOW() - INTERVAL 17 HOUR, 78.0, 62.6, 25.1, 4.1, 47.1, 1435, 1),
(1, NOW() - INTERVAL 16 HOUR, 78.5, 63.0, 25.2, 4.2, 46.9, 1432, 1),
(1, NOW() - INTERVAL 15 HOUR, 79.0, 63.5, 25.3, 4.3, 46.7, 1430, 1),
(1, NOW() - INTERVAL 14 HOUR, 79.5, 63.9, 25.4, 4.4, 46.5, 1428, 1),
(1, NOW() - INTERVAL 13 HOUR, 80.0, 64.4, 25.5, 4.5, 46.3, 1425, 1),
(1, NOW() - INTERVAL 12 HOUR, 80.5, 64.8, 25.6, 4.6, 46.1, 1422, 1),
(1, NOW() - INTERVAL 11 HOUR, 81.0, 65.3, 25.7, 4.7, 45.9, 1420, 1),
(1, NOW() - INTERVAL 10 HOUR, 81.5, 65.7, 25.8, 4.8, 45.7, 1418, 1),
(1, NOW() - INTERVAL 9 HOUR, 82.0, 66.2, 25.9, 4.9, 45.5, 1415, 1),
(1, NOW() - INTERVAL 8 HOUR, 82.5, 66.6, 26.0, 5.0, 45.3, 1412, 1),
(1, NOW() - INTERVAL 7 HOUR, 83.0, 67.1, 26.1, 5.1, 45.1, 1410, 1),
(1, NOW() - INTERVAL 6 HOUR, 83.5, 67.5, 26.2, 5.2, 44.9, 1408, 1),
(1, NOW() - INTERVAL 5 HOUR, 84.0, 68.0, 26.3, 5.3, 44.7, 1405, 1),
(1, NOW() - INTERVAL 4 HOUR, 84.5, 68.4, 26.4, 5.4, 44.5, 1402, 1),
(1, NOW() - INTERVAL 3 HOUR, 85.0, 68.9, 26.5, 5.5, 44.3, 1400, 1),
(1, NOW() - INTERVAL 2 HOUR, 85.5, 69.3, 26.6, 5.6, 44.1, 1398, 1),
(1, NOW() - INTERVAL 1 HOUR, 86.0, 69.8, 26.7, 5.7, 43.9, 1395, 1),
(1, NOW(), 86.5, 70.2, 26.8, 5.8, 43.7, 1392, 1);