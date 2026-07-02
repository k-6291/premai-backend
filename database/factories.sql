-- جدول المصانع
CREATE TABLE factories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  industry_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول سلاسل الإنتاج
CREATE TABLE production_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factory_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  color_code VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE
);

-- جدول الآلات
CREATE TABLE machines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_line_id INT,
  factory_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  model_id VARCHAR(100),
  status ENUM('green', 'yellow', 'red') DEFAULT 'green',
  rul_days INT DEFAULT 365,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_line_id) REFERENCES production_lines(id) ON DELETE SET NULL,
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE
);

-- جدول المستشعرات
CREATE TABLE sensors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machine_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('temperature', 'vibration', 'pressure', 'current', 'rpm') NOT NULL,
  protocol ENUM('modbus_tcp', 'modbus_rtu', 'opc_ua', 'mqtt') DEFAULT 'modbus_tcp',
  connection_address VARCHAR(255),
  register_address VARCHAR(50),
  status ENUM('online', 'offline', 'error') DEFAULT 'offline',
  last_value DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- جدول ربط المودل بمدخلات المستشعرات
CREATE TABLE model_sensor_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machine_id INT NOT NULL,
  model_input_name VARCHAR(100) NOT NULL,
  sensor_id INT,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL
);




-- 📁 database/factories.sql (أضف هذا)

-- جدول التفاصيل الإضافية للمصنع
CREATE TABLE `factory_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  
  -- 🏭 معلومات المصنع الأساسية
  `industry_category` enum('food','chemical','metal','textile','automotive','pharma','energy','other') NOT NULL,
  `factory_size` enum('small','medium','large','enterprise') DEFAULT 'medium',
  `employee_count` int(11) DEFAULT NULL,
  `production_lines_count` int(11) DEFAULT NULL,
  `established_year` year DEFAULT NULL,
  
  -- 🌍 الموقع
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `coordinates` point DEFAULT NULL, -- للطبوغرافيا المستقبلية
  
  -- ⚙️ البنية التقنية
  `automation_level` enum('manual','semi_automated','fully_automated','smart_factory') DEFAULT 'semi_automated',
  `existing_systems` json DEFAULT NULL, -- ['PLC', 'SCADA', 'ERP', 'MES']
  `iot_infrastructure` enum('none','basic','advanced') DEFAULT 'none',
  
  -- 🎯 الاحتياجات
  `main_machine_types` json DEFAULT NULL, -- ['pump', 'motor', 'conveyor', 'compressor']
  `pain_points` json DEFAULT NULL, -- ['unplanned_downtime', 'high_maintenance_cost', 'quality_issues']
  `expected_roi_timeline` enum('3_months','6_months','1_year','2_years') DEFAULT '1_year',
  
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `factory_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- جدول سجل موافقات الأدمن
CREATE TABLE `approval_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action` enum('approved','rejected','requested_info') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `approval_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS factory_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  industry_category VARCHAR(50),
  factory_size VARCHAR(50),
  employee_count INT DEFAULT 0,
  automation_level VARCHAR(50),
  main_machine_types JSON,
  pain_points JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);