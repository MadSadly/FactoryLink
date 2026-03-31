-- 1. 품목 온톨로지 사전 (가죽 → 가죽신발 상하위 관계 정의)
CREATE TABLE part_ontology (
  id INT PRIMARY KEY AUTO_INCREMENT,
  term VARCHAR(255) NOT NULL,           -- 기준 품목명 (예: 가죽)
  related_term VARCHAR(255) NOT NULL,   -- 연관 품목명 (예: 가죽신발)
  relation_type ENUM('synonym','child','parent','related'),
  weight DECIMAL(3,2) DEFAULT 0.85,     -- 매칭 시 가중치
  created_at DATETIME DEFAULT NOW()
);

-- 2. AI 추천 피드백 로그 (클릭/채팅/견적/계약 데이터 수집)
CREATE TABLE recommendation_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  query_company_id INT NOT NULL,        -- 추천을 요청한 업체 (companies.id FK)
  recommended_company_id INT NOT NULL,  -- 추천받은 업체 (companies.id FK)
  score DECIMAL(5,4),                   -- AI가 계산한 추천 점수
  action ENUM('viewed','chat_started','quote_sent','contract_signed'),
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (query_company_id) REFERENCES companies(id),
  FOREIGN KEY (recommended_company_id) REFERENCES companies(id)
);

-- 3. 견적서 테이블
CREATE TABLE quotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_company_id INT NOT NULL,    -- 견적 요청 업체 (companies.id FK)
  target_company_id INT NOT NULL,       -- 견적 대상 업체 (companies.id FK)
  items_json JSON NOT NULL,             -- 품목 목록 (name, quantity, unit, unit_price, amount)
  raw_input TEXT,                       -- 사용자가 입력한 자연어 원문
  parsed_requirements JSON,            -- AI가 구조화한 요구사항
  quote_html TEXT,                      -- 생성된 견적서 HTML (AI 생성)
  quote_text TEXT,                      -- 견적서 plaintext
  total_amount DECIMAL(15,2),
  deadline DATE,
  valid_until DATE,
  notes TEXT,
  status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft',
  pdf_path VARCHAR(500),               -- 생성된 PDF 파일 경로
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (requester_company_id) REFERENCES companies(id),
  FOREIGN KEY (target_company_id) REFERENCES companies(id)
);

-- 4. 계약서 테이블 (기존 contracts 테이블 보완용 - AI 생성 초안 저장)
CREATE TABLE contract_drafts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quote_id INT NOT NULL,               -- quotes.id FK
  contract_html TEXT,                  -- AI가 생성한 계약서 HTML
  contract_text TEXT,                  -- 계약서 plaintext
  payment_terms VARCHAR(500),          -- 대금 지급 조건
  warranty_months INT DEFAULT 12,      -- 품질보증 기간
  special_terms TEXT,                  -- 특약사항 (사용자 직접 수정 가능)
  pdf_path VARCHAR(500),              -- 생성된 PDF 경로
  status ENUM('draft','sent','signed') DEFAULT 'draft',
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);
