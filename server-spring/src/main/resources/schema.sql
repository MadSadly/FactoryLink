-- Factory-Link MariaDB 10.6 schema
-- Drop in dependency order, then create.

SET NAMES utf8mb4;

DROP TABLE IF EXISTS company_reviews;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS parts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region ENUM(
    'SEOUL','GYEONGGI','GYEONGNAM','GYEONGBUK','BUSAN','INCHEON','DAEJEON','GWANGJU','OTHER'
  ) NOT NULL,
  address VARCHAR(255),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  type ENUM('BUYER','SELLER','BOTH') NOT NULL DEFAULT 'BOTH',
  business_number VARCHAR(20) NULL COMMENT '사업자등록번호(하이픈 포함 형식, MVP 모의 인증)',
  external_source VARCHAR(32) NULL COMMENT '공공 API 등 출처 식별자',
  external_key CHAR(64) NULL COMMENT '출처 내 멱등 키(SHA-256 hex 등)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_companies_region (region),
  INDEX idx_companies_type (type),
  UNIQUE KEY uq_companies_business_number (business_number),
  UNIQUE KEY uq_companies_external (external_source, external_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  role ENUM('ADMIN','MEMBER') NOT NULL DEFAULT 'MEMBER',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies (id),
  INDEX idx_users_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL,
  stock_quantity INT DEFAULT 0,
  unit VARCHAR(20),
  description TEXT,
  region VARCHAR(30),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_parts_company FOREIGN KEY (company_id) REFERENCES companies (id),
  INDEX idx_parts_company_id (company_id),
  INDEX idx_parts_region (region),
  INDEX idx_parts_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  buyer_company_id BIGINT NOT NULL,
  seller_company_id BIGINT NOT NULL,
  part_id BIGINT,
  status ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_rooms_buyer FOREIGN KEY (buyer_company_id) REFERENCES companies (id),
  CONSTRAINT fk_chat_rooms_seller FOREIGN KEY (seller_company_id) REFERENCES companies (id),
  CONSTRAINT fk_chat_rooms_part FOREIGN KEY (part_id) REFERENCES parts (id),
  INDEX idx_chat_rooms_buyer (buyer_company_id),
  INDEX idx_chat_rooms_seller (seller_company_id),
  INDEX idx_chat_rooms_part (part_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT NOT NULL,
  sender_user_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms (id),
  CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users (id),
  INDEX idx_chat_messages_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contracts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT,
  buyer_company_id BIGINT NOT NULL,
  seller_company_id BIGINT NOT NULL,
  part_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  contract_text LONGTEXT,
  status ENUM('DRAFT','FINALIZED','COMPLETED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contracts_room FOREIGN KEY (room_id) REFERENCES chat_rooms (id),
  CONSTRAINT fk_contracts_buyer FOREIGN KEY (buyer_company_id) REFERENCES companies (id),
  CONSTRAINT fk_contracts_seller FOREIGN KEY (seller_company_id) REFERENCES companies (id),
  CONSTRAINT fk_contracts_part FOREIGN KEY (part_id) REFERENCES parts (id),
  INDEX idx_contracts_room (room_id),
  INDEX idx_contracts_buyer (buyer_company_id),
  INDEX idx_contracts_seller (seller_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  reviewer_company_id BIGINT NOT NULL,
  reviewed_company_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_reviews_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
  CONSTRAINT fk_company_reviews_reviewer FOREIGN KEY (reviewer_company_id) REFERENCES companies (id),
  CONSTRAINT fk_company_reviews_reviewed FOREIGN KEY (reviewed_company_id) REFERENCES companies (id),
  UNIQUE KEY uq_company_reviews_contract_reviewer (contract_id, reviewer_company_id),
  INDEX idx_company_reviews_reviewed (reviewed_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
