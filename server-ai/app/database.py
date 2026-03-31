"""MySQL/MariaDB 연결 (환경변수 기반)."""

import os
from contextlib import contextmanager
from typing import Any, Generator, List, Mapping, Optional, Sequence

import pymysql


def _conn_params() -> dict:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", ""),
        "password": os.getenv("DB_PASS", ""),
        "database": os.getenv("DB_NAME", "factory_link"),
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
    }


def get_connection():
    return pymysql.connect(**_conn_params())


@contextmanager
def connection() -> Generator[Any, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(sql: str, args: Optional[Sequence[Any]] = None) -> List[Mapping[str, Any]]:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            return list(cur.fetchall())


def fetch_one(sql: str, args: Optional[Sequence[Any]] = None) -> Optional[Mapping[str, Any]]:
    rows = fetch_all(sql, args)
    return rows[0] if rows else None


def execute(sql: str, args: Optional[Sequence[Any]] = None) -> int:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            return int(cur.lastrowid)
