import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getCompanyIdFromToken } from "../auth/token";
import { formatPhoneDigits } from "../utils/inputMask";

const TYPE_OPTIONS = [
  { value: "BUYER", label: "구매사" },
  { value: "SELLER", label: "공급사" },
  { value: "BOTH", label: "구매·공급" },
];

const fieldClass =
  "mt-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

export default function ProfileSettingsPage() {
  const { token } = useAuth();
  const companyId = token ? getCompanyIdFromToken(token) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [type, setType] = useState("SELLER");

  const load = useCallback(async () => {
    if (companyId == null) {
      setLoadError("소속 업체 정보를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get(`/companies/${companyId}`);
      const inner = data?.success ? data.data : data;
      const c = inner?.company;
      if (!c) {
        setLoadError("업체 정보를 불러오지 못했습니다.");
        return;
      }
      setName(String(c.name ?? ""));
      setAddress(String(c.address ?? ""));
      setContactEmail(String(c.contactEmail ?? ""));
      setContactPhone(formatPhoneDigits(String(c.contactPhone ?? "").replace(/\D/g, "")));
      setType(String(c.type ?? "SELLER"));
    } catch {
      setLoadError("업체 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (companyId == null) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await apiClient.put(`/companies/${companyId}`, {
        name,
        address,
        contactEmail,
        contactPhone,
        type,
      });
      setSaveMsg("저장되었습니다.");
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setSaveMsg(
        typeof serverMsg === "string" && serverMsg.trim()
          ? serverMsg
          : "저장에 실패했습니다. 권한과 입력값을 확인해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (companyId == null) {
    return (
      <div className="rounded-2xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        로그인 후 회사 설정을 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">회사 설정</h1>
        <p className="mt-2 text-sm font-normal text-gray-400">소속 업체 정보를 수정합니다.</p>
      </div>

      {loadError && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{loadError}</p>
      )}

      {loading && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {!loading && !loadError && (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
          <label className="block text-sm font-medium text-gray-300">
            업체명
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="organization"
            />
          </label>
          <label className="block text-sm font-medium text-gray-300">
            주소
            <textarea
              className={`${fieldClass} min-h-[88px] resize-y`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </label>
          <label className="block text-sm font-medium text-gray-300">
            이메일
            <input
              type="email"
              className={fieldClass}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium text-gray-300">
            연락처
            <input
              className={fieldClass}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-0000-0000"
              maxLength={13}
              value={contactPhone}
              onChange={(e) => setContactPhone(formatPhoneDigits(e.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-300">
            유형
            <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {saveMsg && (
            <p
              className={`text-sm ${
                saveMsg.includes("실패") || saveMsg.includes("권한") ? "text-red-300" : "text-emerald-400"
              }`}
            >
              {saveMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </form>
      )}
    </div>
  );
}
