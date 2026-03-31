import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { cardClass } from "../lib/ui";

export default function PartsPage() {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    apiClient
      .get("/parts")
      .then((response) => setParts(response.data))
      .catch(() => setParts([]));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-on-surface">부품 목록</h2>
        <p className="text-stone-600">등록된 부품을 조회합니다.</p>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">등록 부품</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            {parts.length}건
          </span>
        </div>
        <ul className="divide-y divide-outline-variant/15">
          {parts.length === 0 && (
            <li className="py-8 text-center text-sm text-on-surface-variant">불러온 데이터가 없습니다.</li>
          )}
          {parts.map((part) => (
            <li
              key={part.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-container/50"
            >
              <div>
                <p className="font-semibold text-on-surface">{part.name}</p>
                <p className="text-xs text-on-surface-variant">카테고리 · {part.category}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">재고</p>
                <p className="text-sm font-bold text-primary">{part.stock}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
