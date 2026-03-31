import argparse
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple

import pandas as pd


BUSINESS_NUMBER_COLUMNS = [
    "business_number",
    "사업자등록번호",
    "사업자번호",
    "사업자등록번호(하이픈 포함)",
    "사업자등록번호(하이픈포함)",
    "biz_no",
    "biz_number",
]

CATEGORY_COLUMNS = [
    "category",
    "카테고리",
    "업종",
    "품목카테고리",
    "공장업종",
    "공장카테고리",
    "부품카테고리",
    "공급품목",
    "제조품목",
    "생산품",
    "category_ko",
]

NAME_COLUMNS = ["name", "업체명", "회사명", "공장명", "업체이름"]
ADDRESS_COLUMNS = ["address", "주소", "소재지", "공장주소", "도로명주소"]


def _norm_text(v: Any) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    return s


def _norm_business_number(v: Any) -> str:
    # 사업자등록번호가 엑셀에 하이픈 포함/미포함인 경우가 많아서 제거합니다.
    s = _norm_text(v)
    if not s:
        return ""
    return "".join([ch for ch in s if ch.isdigit()])


def _guess_first_present_column(df: pd.DataFrame, candidates: Iterable[str]) -> Optional[str]:
    cols = set(map(str, df.columns))
    for c in candidates:
        if c in cols:
            return c
    # 일부 엑셀은 대소문자/공백이 다를 수 있어서 완화
    lowered = {str(col).strip().lower(): col for col in df.columns}
    for cand in candidates:
        key = str(cand).strip().lower()
        if key in lowered:
            return lowered[key]
    return None


def load_excel_rows(path: Path, sheet: Optional[str]) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(str(path))
    # engine은 pandas가 알아서 선택
    return pd.read_excel(path, sheet_name=sheet) if sheet else pd.read_excel(path)


def escape_sql_string(s: str, max_len: Optional[int] = None) -> str:
    if max_len is not None:
        s = s[:max_len]
    s = s.replace("\\", "\\\\").replace("'", "''")
    return s


def main() -> int:
    parser = argparse.ArgumentParser(
        description="엑셀(사업자등록번호+카테고리)을 DB parts.category에 넣기 위한 SQL 생성기"
    )
    parser.add_argument("--file", required=True, help="엑셀 파일 경로(xlsx/xls)")
    parser.add_argument("--sheet", default=None, help="시트 이름(미지정 시 첫 시트)")
    parser.add_argument(
        "--out",
        default="db/generated/excel_import_parts.sql",
        help="생성 SQL 출력 경로",
    )
    parser.add_argument(
        "--match",
        default="business_number",
        choices=["business_number", "name"],
        help="DB 매칭 기준",
    )
    parser.add_argument(
        "--truncate-db",
        action="store_true",
        help="기존 parts를 truncate 하지 않고, 새로 넣기만 합니다(기본 동작).",
    )
    args = parser.parse_args()

    excel_path = Path(args.file).expanduser().resolve()
    df = load_excel_rows(excel_path, args.sheet)

    if df.empty:
        print("엑셀 데이터가 비어있습니다.", file=sys.stderr)
        return 2

    biz_col = _guess_first_present_column(df, BUSINESS_NUMBER_COLUMNS)
    cat_col = _guess_first_present_column(df, CATEGORY_COLUMNS)
    name_col = _guess_first_present_column(df, NAME_COLUMNS)
    addr_col = _guess_first_present_column(df, ADDRESS_COLUMNS)

    if cat_col is None:
        print("엑셀에서 category(카테고리/업종/품목카테고리 등) 컬럼을 찾지 못했습니다.", file=sys.stderr)
        print(f"현재 컬럼: {list(df.columns)}", file=sys.stderr)
        return 3

    if args.match == "business_number":
        if biz_col is None:
            print("match=business_number 로 지정했는데 사업자등록번호 컬럼을 찾지 못했습니다.", file=sys.stderr)
            print(f"현재 컬럼: {list(df.columns)}", file=sys.stderr)
            return 4
    elif args.match == "name":
        if name_col is None:
            print("match=name 로 지정했는데 업체명 컬럼을 찾지 못했습니다.", file=sys.stderr)
            print(f"현재 컬럼: {list(df.columns)}", file=sys.stderr)
            return 5

    statements = []
    # MySQL용: parts 테이블에 unit_price NOT NULL, name NOT NULL, category nullable 허용
    # 유사도는 category만 쓰므로 unit_price는 고정 값으로 넣습니다.
    statements.append("SET NAMES utf8mb4;")

    used_rows = 0
    for idx, row in df.iterrows():
        cat = _norm_text(row.get(cat_col))
        if not cat:
            continue

        # parts.category는 중복이 많아도 similarity에서 Set으로 uniq 처리하므로 괜찮습니다.
        cat = cat.strip()
        if not cat:
            continue

        company_where = ""
        sql_bind = ""

        if args.match == "business_number":
            bn = _norm_business_number(row.get(biz_col))
            if not bn:
                continue
            # companies.business_number은 하이픈 포함 VARCHAR인데,
            # 현재 코드/DB는 숫자-only로 저장될 수도/안될 수도 있어서 보수적으로 양쪽 조건을 같이 겁니다.
            # LIKE '%1234567890%' 같은 방식은 느릴 수 있으나 MVP라 우선 간단히 처리합니다.
            company_where = f"(REPLACE(c.business_number,'-','') = '{escape_sql_string(bn)}')"
        else:
            nm = _norm_text(row.get(name_col))
            if not nm:
                continue
            company_where = f"(c.name = '{escape_sql_string(nm, 100)}')"

        part_name = f"엑셀카테고리:{cat}"
        part_name = escape_sql_string(part_name, 100)
        cat_esc = escape_sql_string(cat, 50)

        stmt = (
            "INSERT INTO parts "
            "(company_id, name, category, unit_price, stock_quantity, unit, description, region) "
            "SELECT "
            "c.id, "
            f"'{part_name}', "
            f"'{cat_esc}', "
            "1.00, "
            "0, "
            "'EA', "
            "'' , "
            "c.region "
            "FROM companies c "
            f"WHERE {company_where};"
        )
        statements.append(stmt)
        used_rows += 1

        # 너무 큰 엑셀은 SQL이 커지므로 상한을 둡니다.
        if used_rows >= 20000:
            break

    if used_rows == 0:
        print("매칭 가능한 rows를 찾지 못했습니다(카테고리는 있는데 company 키가 비었을 가능성).", file=sys.stderr)
        return 6

    out_path = Path(args.out).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(statements) + "\n", encoding="utf-8")

    print(f"SQL 생성 완료: {out_path}")
    print(f"삽입(추정) rows: {used_rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

