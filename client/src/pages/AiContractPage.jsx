import { useState } from "react";

export default function AiContractPage() {
  const [contractText] = useState("AI 계약서 생성 API 연동 예정");

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-4 text-xl font-semibold">AI 계약서 생성</h2>
      <p className="text-sm text-slate-700">{contractText}</p>
    </div>
  );
}
