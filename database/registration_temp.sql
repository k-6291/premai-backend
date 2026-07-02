-- جدول مؤقت لحفظ بيانات التسجيل بين الخطوات
CREATE TABLE `registration_temp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `temp_id` varchar(64) NOT NULL,
  `factory_data` json NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `temp_id` (`temp_id`),
  KEY `expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Event لحذف السجلات المنتهية (كل ساعة)
CREATE EVENT IF NOT EXISTS cleanup_expired_registrations
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM registration_temp WHERE expires_at < NOW();