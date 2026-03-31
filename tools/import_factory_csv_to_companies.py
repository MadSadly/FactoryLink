import argparse
import hashlib
import sys
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def norm_str(v) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    return s


def map_region_enum(region_text: str) -> Optional[str]:
    """
    DB companies.region enum:
      'SEOUL','GYEONGGI','GYEONGNAM','GYEONGBUK','BUSAN','INCHEON','DAEJEON','GWANGJU','OTHER'

    This importer only handles Seoul/Gyeonggi; others are skipped.
    """
    t = region_text or ""
    if "서울" in t:
        return "SEOUL"
    if "경기" in t:
        return "GYEONGGI"
    return None


def sql_str(s: str, max_len: int) -> str:
    s = (s or "").replace("\\", "\\\\").replace("'", "''")
    if len(s) > max_len:
        s = s[:max_len]
    return f"'{s}'"


def build_parts_insert_sql(
    external_source: str,
    external_key: str,
    product: str,
) -> str:
    """
    CSV 생산품 → parts.category (유사도 profileText에 반영).
    companies 는 동일 external_key 로 이미 들어간 뒤 실행하는 것을 전제로 합니다.
    description='KSC_FACTORY_CSV' 로 구분해 재실행 시 중복 삽입을 막습니다.
    """
    product = norm_str(product)
    if not product:
        return ""
    name_val = "KSC생산품:" + (product[:91] if len(product) > 91 else product)
    return (
        "INSERT INTO parts (company_id, name, category, unit_price, stock_quantity, unit, description, region) "
        "SELECT c.id, "
        f"{sql_str(name_val, 100)}, "
        f"{sql_str(product, 50)}, "
        "1.00, 0, 'EA', 'KSC_FACTORY_CSV', c.region "
        "FROM companies c "
        f"WHERE c.external_source = {sql_str(external_source, 32)} "
        f"AND c.external_key = {sql_str(external_key, 64)} "
        "AND NOT EXISTS (SELECT 1 FROM parts p WHERE p.company_id = c.id AND p.description = 'KSC_FACTORY_CSV');"
    )


def build_values_tuple(
    name: str,
    region_enum: str,
    address: str,
    type_enum: str,
    external_source: str,
    external_key: str,
) -> str:
    # companies: (name, region, address, contact_email, contact_phone, type, business_number, external_source, external_key)
    # 우리가 넣을 건 최소값 위주 (contact_email/phone/business_number는 NULL)
    return "(" + ",".join(
        [
            sql_str(name, 100),
            sql_str(region_enum, 16),
            sql_str(address, 255),
            "NULL",
            "NULL",
            sql_str(type_enum, 6),
            "NULL",
            sql_str(external_source, 32),
            sql_str(external_key, 64),
        ]
    ) + ")"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="서울/경기 공장 CSV를 companies 테이블에 upsert용 SQL로 변환"
    )
    parser.add_argument("--file", required=True, help="CSV 파일 경로")
    parser.add_argument(
        "--encoding",
        default="cp949",
        help="CSV 인코딩. 행정/공공 CSV는 보통 cp949(euc-kr). "
        "한글이 이미 깨져 보이면 utf-8 또는 utf-8-sig(BOM)로 시도.",
    )
    parser.add_argument("--name-col", type=int, default=2, help="공장명(업체명) 컬럼 인덱스(0-based, 기본 2)")
    parser.add_argument("--region-col", type=int, default=0, help="시도명 컬럼 인덱스(0-based, 기본 0)")
    parser.add_argument("--address-col", type=int, default=-1, help="주소 컬럼 인덱스(없으면 -1)")
    parser.add_argument(
        "--product-col",
        type=int,
        default=-1,
        help="생산품(또는 품목) 컬럼 인덱스(0-based). 지정 시 parts.category 로 INSERT SQL 추가",
    )
    parser.add_argument("--external-id-col", type=int, default=-1, help="외부 식별자 컬럼 인덱스(없으면 자동 생성)")
    parser.add_argument("--type", default="SELLER", choices=["BUYER", "SELLER", "BOTH"], help="companies.type")
    parser.add_argument("--external-source", default="KSC_FACTORY_CSV", help="external_source 고정값")
    parser.add_argument(
        "--out-sql",
        default="db/generated/import_factory_csv_companies.sql",
        help="생성 SQL 경로",
    )
    parser.add_argument("--batch-size", type=int, default=500, help="한 INSERT에 넣을 row 수")
    parser.add_argument("--limit", type=int, default=0, help="테스트용 총 매칭 상한(0=무제한)")
    parser.add_argument(
        "--max-per-region",
        type=int,
        default=0,
        help="지역별 상한: SEOUL·GYEONGGI 각각 최대 N건(0=무제한). 예: 500",
    )
    parser.add_argument("--dry-run", action="store_true", help="DB에 넣지 않고 매칭 수/샘플만 출력")
    parser.add_argument(
        "--parts-only",
        action="store_true",
        help="companies INSERT 생략, parts(생산품) INSERT SQL 만 생성(이미 companies 적용된 DB용)",
    )
    parser.add_argument(
        "--print-cols",
        action="store_true",
        help="첫 chunk 컬럼명과 인덱스만 출력하고 종료(생산품 열 번호 확인용)",
    )
    args = parser.parse_args()

    if args.parts_only and args.product_col < 0:
        raise SystemExit("--parts-only 는 --product-col 과 함께 지정하세요.")

    csv_path = Path(args.file).expanduser().resolve()
    if not csv_path.exists():
        raise FileNotFoundError(str(csv_path))

    # 속도/안정성 위해 문자열로 읽기
    # chunksize로 메모리 절약
    read_opts = dict(
        encoding=args.encoding,
        dtype=str,
        chunksize=5000,
        on_bad_lines="skip",
    )

    # 샘플 출력용
    accepted_rows = 0
    counts_region = {"SEOUL": 0, "GYEONGGI": 0}
    generated_rows = 0
    sample_printed = 0
    sample_rows: List[Tuple[str, str, str]] = []

    # INSERT statement 버퍼
    values: List[str] = []
    insert_sqls: List[str] = []
    parts_sqls: List[str] = []
    parts_rows = 0

    sql_header = "SET NAMES utf8mb4;"

    # pandas는 columns을 미리 알아야 인덱스 접근이 가능하므로 첫 chunk로 확인
    for chunk_idx, chunk in enumerate(pd.read_csv(csv_path, **read_opts)):
        if chunk_idx == 0:
            if args.print_cols:
                for i, col in enumerate(chunk.columns):
                    print(f"  {i}\t{col}")
                return 0

            idx_candidates = [args.name_col, args.region_col]
            if args.address_col >= 0:
                idx_candidates.append(args.address_col)
            if args.external_id_col >= 0:
                idx_candidates.append(args.external_id_col)
            if args.product_col >= 0:
                idx_candidates.append(args.product_col)
            max_idx = max(idx_candidates)
            if max_idx >= len(chunk.columns):
                raise RuntimeError(
                    f"컬럼 인덱스가 범위를 넘습니다. columns={len(chunk.columns)}, max_idx={max_idx}"
                )

        for _, row in chunk.iterrows():
            if args.max_per_region and counts_region["SEOUL"] >= args.max_per_region and counts_region["GYEONGGI"] >= args.max_per_region:
                break
            if args.limit and accepted_rows >= args.limit:
                break

            region_text = norm_str(row.iloc[args.region_col]) if args.region_col >= 0 else ""
            region_enum = map_region_enum(region_text)
            if not region_enum:
                continue

            if args.max_per_region and counts_region[region_enum] >= args.max_per_region:
                continue

            name = norm_str(row.iloc[args.name_col])
            if not name:
                continue

            address = ""
            if args.address_col >= 0:
                address = norm_str(row.iloc[args.address_col])

            external_source = args.external_source
            external_key = ""
            if args.external_id_col >= 0:
                ext_id = norm_str(row.iloc[args.external_id_col])
                if ext_id:
                    external_key = sha256_hex(f"{external_source}|{ext_id}")
            if not external_key:
                external_key = sha256_hex(f"{external_source}|{name}|{region_enum}|{address}")

            product_text = ""
            if args.product_col >= 0:
                product_text = norm_str(row.iloc[args.product_col])

            accepted_rows += 1
            counts_region[region_enum] += 1

            if sample_printed < 5:
                sample_rows.append((region_enum, name[:40], address[:60]))
                sample_printed += 1

            if product_text:
                parts_rows += 1

            if args.dry_run:
                continue

            if not args.parts_only:
                values.append(
                    build_values_tuple(
                        name=name,
                        region_enum=region_enum,
                        address=address,
                        type_enum=args.type,
                        external_source=external_source,
                        external_key=external_key,
                    )
                )
                generated_rows += 1

            if product_text:
                p_sql = build_parts_insert_sql(external_source, external_key, product_text)
                if p_sql:
                    parts_sqls.append(p_sql)

            if not args.parts_only and len(values) >= args.batch_size:
                insert_sqls.append(
                    "INSERT INTO companies "
                    "(name, region, address, contact_email, contact_phone, type, business_number, external_source, external_key) "
                    "VALUES "
                    + ",".join(values)
                    + " ON DUPLICATE KEY UPDATE "
                    "name = VALUES(name), "
                    "address = VALUES(address), "
                    "contact_phone = VALUES(contact_phone), "
                    "type = VALUES(type), "
                    "updated_at = CURRENT_TIMESTAMP;"
                )
                values = []

        if args.limit and accepted_rows >= args.limit:
            break
        if args.max_per_region and counts_region["SEOUL"] >= args.max_per_region and counts_region["GYEONGGI"] >= args.max_per_region:
            break

    # flush
    if not args.dry_run and not args.parts_only and values:
        insert_sqls.append(
            "INSERT INTO companies "
            "(name, region, address, contact_email, contact_phone, type, business_number, external_source, external_key) "
            "VALUES "
            + ",".join(values)
            + " ON DUPLICATE KEY UPDATE "
            "name = VALUES(name), "
            "address = VALUES(address), "
            "contact_phone = VALUES(contact_phone), "
            "type = VALUES(type), "
            "updated_at = CURRENT_TIMESTAMP;"
        )

    print(f"[import_factory_csv_to_companies] accepted rows (Seoul/Gyeonggi): {accepted_rows}")
    print(f"[import_factory_csv_to_companies] per region: SEOUL={counts_region.get('SEOUL', 0)} GYEONGGI={counts_region.get('GYEONGGI', 0)}")
    if args.product_col >= 0:
        print(f"[import_factory_csv_to_companies] rows with non-empty product (생산품): {parts_rows}")
    if sample_rows:
        print("[samples]")
        for r, n, a in sample_rows:
            print(f"  - {r} / {n} / {a}")

    if args.dry_run:
        return 0

    out_sql = Path(args.out_sql)
    out_sql.parent.mkdir(parents=True, exist_ok=True)
    parts_section = ""
    if parts_sqls:
        parts_section = (
            "\n\n-- parts.category from CSV 생산품 (AiSimilarity profileText)\n"
            + "\n\n".join(parts_sqls)
        )
    if args.parts_only:
        if not parts_sqls:
            print("[import_factory_csv_to_companies] 오류: 생성된 parts SQL 이 없습니다.", file=sys.stderr)
            return 1
        out_sql.write_text(sql_header + parts_section + "\n", encoding="utf-8")
    else:
        out_sql.write_text(
            sql_header + "\n\n" + "\n\n".join(insert_sqls) + parts_section + "\n",
            encoding="utf-8",
        )
    print(f"[import_factory_csv_to_companies] SQL written: {out_sql}")
    if not args.parts_only:
        print(f"[import_factory_csv_to_companies] inserted/updated rows (generated): {generated_rows}")
    if parts_sqls:
        print(f"[import_factory_csv_to_companies] parts INSERT statements: {len(parts_sqls)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

