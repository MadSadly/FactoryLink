-- Factory-Link seed data (MariaDB). password for all demo users: password123
SET NAMES utf8mb4;

-- bcrypt hash for "password123" (cost 10), compatible with Spring BCryptPasswordEncoder
SET @pwd := '$2b$10$ZV0fVvYKBTBPEJ90tZKiO.oJNPHwTl5iHVboOJd.Zqkid9oR3oija';

INSERT IGNORE INTO companies (id, name, region, address, contact_email, contact_phone, type) VALUES
(1, 'Seoul Precision Buyer', 'SEOUL', 'Seoul Gangnam 1', 'sales1@seoul-buyer.kr', '02-1000-0001', 'BUYER'),
(2, 'Gyeonggi Parts Buyer', 'GYEONGGI', 'Suwon 2', 'procure2@gg-buyer.kr', '031-2000-0002', 'BUYER'),
(3, 'Busan Harbor Buyer', 'BUSAN', 'Busan 3', 'buy3@busan.kr', '051-3000-0003', 'BUYER'),
(4, 'Incheon Seller Tech', 'INCHEON', 'Songdo 4', 'contact4@incheon-seller.kr', '032-4000-0004', 'SELLER'),
(5, 'Daejeon Machine Seller', 'DAEJEON', 'Daejeon 5', 'sales5@dj-mach.kr', '042-5000-0005', 'SELLER'),
(6, 'Gwangju Electronics Seller', 'GWANGJU', 'Gwangju 6', 'parts6@gwangju-el.kr', '062-6000-0006', 'SELLER'),
(7, 'Gyeongnam Industrial BOTH', 'GYEONGNAM', 'Changwon 7', 'biz7@gn-ind.kr', '055-7000-0007', 'BOTH'),
(8, 'Gyeongbuk Metal BOTH', 'GYEONGBUK', 'Gumi 8', 'metal8@gb.kr', '054-8000-0008', 'BOTH'),
(9, 'Seoul Universal BOTH', 'SEOUL', 'Seoul Mapo 9', 'uni9@seoul-uni.kr', '02-9000-0009', 'BOTH'),
(10, 'Gyeonggi Hybrid Seller', 'GYEONGGI', 'Pangyo 10', 'sell10@gg-hybrid.kr', '031-0100-0010', 'SELLER');

INSERT IGNORE INTO users (id, company_id, email, password_hash, name, role) VALUES
(1, 1, 'c1admin@demo.local', @pwd, 'Kim Admin', 'ADMIN'),
(2, 1, 'c1member@demo.local', @pwd, 'Lee Member', 'MEMBER'),
(3, 2, 'c2admin@demo.local', @pwd, 'Park Admin', 'ADMIN'),
(4, 2, 'c2member@demo.local', @pwd, 'Choi Member', 'MEMBER'),
(5, 3, 'c3admin@demo.local', @pwd, 'Jung Admin', 'ADMIN'),
(6, 3, 'c3member@demo.local', @pwd, 'Kang Member', 'MEMBER'),
(7, 4, 'c4admin@demo.local', @pwd, 'Yoon Admin', 'ADMIN'),
(8, 4, 'c4member@demo.local', @pwd, 'Han Member', 'MEMBER'),
(9, 5, 'c5admin@demo.local', @pwd, 'Oh Admin', 'ADMIN'),
(10, 5, 'c5member@demo.local', @pwd, 'Shin Member', 'MEMBER'),
(11, 6, 'c6admin@demo.local', @pwd, 'Ryu Admin', 'ADMIN'),
(12, 6, 'c6member@demo.local', @pwd, 'Bae Member', 'MEMBER'),
(13, 7, 'c7admin@demo.local', @pwd, 'Nam Admin', 'ADMIN'),
(14, 7, 'c7member@demo.local', @pwd, 'Hong Member', 'MEMBER'),
(15, 8, 'c8admin@demo.local', @pwd, 'Seo Admin', 'ADMIN'),
(16, 8, 'c8member@demo.local', @pwd, 'Moon Member', 'MEMBER'),
(17, 9, 'c9admin@demo.local', @pwd, 'Jang Admin', 'ADMIN'),
(18, 9, 'c9member@demo.local', @pwd, 'Lim Member', 'MEMBER'),
(19, 10, 'c10admin@demo.local', @pwd, 'Ko Admin', 'ADMIN'),
(20, 10, 'c10member@demo.local', @pwd, 'Son Member', 'MEMBER');

-- 30 parts: 3 per company 4-10 (7 sellers/both), denormalized region from company
INSERT IGNORE INTO parts (id, company_id, name, category, unit_price, stock_quantity, unit, description, region) VALUES
(1, 4, 'MCU Board A1', '전자부품', 12500.00, 500, 'ea', 'Industrial MCU board', 'INCHEON'),
(2, 4, 'Sensor Pack S2', '전자부품', 8900.50, 1200, 'set', 'Bundle sensor kit', 'INCHEON'),
(3, 4, 'Power Module P3', '전자부품', 45200.00, 80, 'ea', 'High-efficiency PSU', 'INCHEON'),
(4, 5, 'CNC Spindle X1', '기계부품', 320000.00, 15, 'ea', 'Precision spindle', 'DAEJEON'),
(5, 5, 'Linear Rail L2', '기계부품', 78000.00, 40, 'ea', 'Heavy duty rail', 'DAEJEON'),
(6, 5, 'Ball Screw B3', '기계부품', 56000.00, 60, 'ea', 'C7 grade screw', 'DAEJEON'),
(7, 6, 'Relay Module R1', '전자부품', 3400.00, 2000, 'ea', '24V relay module', 'GWANGJU'),
(8, 6, 'Connector Kit C2', '전자부품', 12000.00, 300, 'set', 'Waterproof connectors', 'GWANGJU'),
(9, 6, 'PCB Prototype P3', '전자부품', 18500.00, 150, 'ea', '4-layer prototype', 'GWANGJU'),
(10, 7, 'Hydraulic Valve V1', '기계부품', 210000.00, 25, 'ea', 'Proportional valve', 'GYEONGNAM'),
(11, 7, 'Gear Set G2', '기계부품', 95000.00, 35, 'set', 'Hardened steel gears', 'GYEONGNAM'),
(12, 7, 'Bearing Unit U3', '기계부품', 42000.00, 200, 'ea', 'Pillow block bearing', 'GYEONGNAM'),
(13, 8, 'Steel Plate 10T', '금속', 88000.00, 100, 'sheet', 'SS400 10mm', 'GYEONGBUK'),
(14, 8, 'Aluminum Extrusion E2', '금속', 33000.00, 180, 'm', '6061-T6 profile', 'GYEONGBUK'),
(15, 8, 'Brass Bushing B3', '금속', 5500.00, 900, 'ea', 'Machined bushing', 'GYEONGBUK'),
(16, 9, 'ABS Pellet Grade A', '플라스틱', 2800.00, 5000, 'kg', 'Injection grade ABS', 'SEOUL'),
(17, 9, 'Polycarbonate Sheet', '플라스틱', 12000.00, 400, 'sheet', 'Clear PC 5mm', 'SEOUL'),
(18, 9, 'Nylon Rod N3', '플라스틱', 15000.00, 250, 'ea', 'PA6 rod stock', 'SEOUL'),
(19, 10, 'Rubber Gasket G1', '고무', 1200.00, 8000, 'ea', 'NBR gasket', 'GYEONGGI'),
(20, 10, 'Silicone Tube T2', '고무', 4500.00, 3000, 'm', 'Food grade silicone', 'GYEONGGI'),
(21, 10, 'Viton O-Ring Kit', '고무', 8900.00, 600, 'set', 'High temp O-rings', 'GYEONGGI'),
(22, 4, 'Cable Harness H4', '전자부품', 22000.00, 90, 'ea', 'Custom harness', 'INCHEON'),
(23, 5, 'Coupling C4', '기계부품', 18000.00, 120, 'ea', 'Flexible coupling', 'DAEJEON'),
(24, 6, 'LCD Module L4', '전자부품', 67000.00, 55, 'ea', '7 inch TFT', 'GWANGJU'),
(25, 7, 'Pneumatic Cylinder P4', '기계부품', 45000.00, 70, 'ea', 'ISO cylinder', 'GYEONGNAM'),
(26, 8, 'Stainless Bolt Kit', '금속', 9800.00, 500, 'set', 'M8 stainless kit', 'GYEONGBUK'),
(27, 9, 'HDPE Granule', '플라스틱', 2100.00, 6000, 'kg', 'Blow molding HDPE', 'SEOUL'),
(28, 10, 'EPDM Sheet', '고무', 15000.00, 120, 'sheet', 'Weather EPDM', 'GYEONGGI'),
(29, 5, 'Servo Motor M4', '기계부품', 198000.00, 22, 'ea', '1kW servo', 'DAEJEON'),
(30, 7, 'Reducer R4', '기계부품', 125000.00, 18, 'ea', 'Planetary reducer', 'GYEONGNAM');
