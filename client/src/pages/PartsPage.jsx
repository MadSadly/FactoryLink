import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export default function PartsPage() {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    apiClient
      .get("/parts")
      .then((response) => setParts(response.data))
      .catch(() => setParts([]));
  }, []);

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-4 text-xl font-semibold">부품 분석 대상 목록</h2>
      <ul className="space-y-2 text-sm">
        {parts.map((part) => (
          <li key={part.id} className="rounded border p-2">
            {part.name} / {part.category} / 재고: {part.stock}
          </li>
        ))}
      </ul>
    </div>
  );
}
