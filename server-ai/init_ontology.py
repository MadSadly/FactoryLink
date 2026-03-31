"""
parts.category 값을 분석해 상·하위(포함) 관계를 추론하고 part_ontology에 삽입합니다.

실행: server-ai 디렉터리에서
  Windows: set PYTHONPATH=.&& python init_ontology.py
  Unix:    PYTHONPATH=. python init_ontology.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

import pymysql


def connect():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", ""),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "factory_link"),
        charset="utf8mb4",
    )


def main() -> None:
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT TRIM(category) AS c
                FROM parts
                WHERE category IS NOT NULL AND TRIM(category) <> ''
                """
            )
            cats = [r[0] for r in cur.fetchall() if r[0]]
        if len(cats) < 2:
            print("카테고리 샘플이 부족합니다. parts.category 데이터를 확인하세요.")
            return

        uniq = sorted(set(cats), key=len)
        pairs: list[tuple[str, str]] = []
        for i, a in enumerate(uniq):
            for b in uniq[i + 1 :]:
                if a == b:
                    continue
                if len(a) < len(b) and a in b:
                    pairs.append((a, b))  # a 상위, b 하위
                elif len(b) < len(a) and b in a:
                    pairs.append((b, a))

        inserted = 0
        with conn.cursor() as cur:
            for term_up, child in pairs:
                cur.execute(
                    "SELECT id FROM part_ontology WHERE term=%s AND related_term=%s LIMIT 1",
                    (term_up, child),
                )
                if cur.fetchone():
                    continue
                cur.execute(
                    """
                    INSERT INTO part_ontology (term, related_term, relation_type, weight)
                    VALUES (%s, %s, 'child', 0.85)
                    """,
                    (term_up, child),
                )
                inserted += 1
        conn.commit()
        print(f"완료: 추론 관계 {len(pairs)}건 중 신규 삽입 {inserted}건")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
