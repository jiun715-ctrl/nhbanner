"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://nhbanner-slack.onrender.com";

const BANNER_TYPES = {
  home: "🏠 홈배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
};

const BANNER_TYPE_OPTIONS = [
  { value: "00", label: "00. 디폴트" },
  { value: "01", label: "01. 상단배너" },
  { value: "02", label: "02. 서비스배너" },
  { value: "03", label: "03. 플로팅배너" },
  { value: "04", label: "04. 이벤트공지" },
  { value: "05", label: "05. 로그아웃배너" },
  { value: "99", label: "99. 관심그룹" },
];

const MEDIA_TYPE_OPTIONS = [
  { value: "common", label: "공통" },
  { value: "tree", label: "나무" },
  { value: "n2", label: "N2" },
];

const LINK_TYPE_OPTIONS = [
  { value: "screen_mts", label: "화면오픈(MTS화면)" },
  { value: "popup_event", label: "팝업오픈(이벤트)" },
  { value: "popup_notice", label: "팝업오픈(공지사항)" },
  { value: "popup_content", label: "팝업오픈(콘텐츠)" },
  { value: "url_external", label: "URL(외부페이지)" },
  // interest용 & 구버전 호환
  { value: "url", label: "URL" },
  { value: "screen", label: "화면오픈" },
  { value: "popup", label: "팝업오픈" },
  { value: "frame_popup", label: "프레임팝업" },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: "domestic_stock", label: "국내주식" },
  { value: "foreign_stock", label: "해외주식" },
  { value: "both_stock", label: "국내/해외주식" },
  { value: "financial", label: "금융상품" },
  { value: "pension", label: "연금" },
  { value: "etc", label: "기타" },
];

const PURPOSE_OPTIONS = [
  { value: "sales_marketing", label: "세일즈마케팅" },
  { value: "info", label: "정보제공(제도 등)" },
  { value: "service", label: "서비스활성화" },
  { value: "etc", label: "기타" },
];

const DESIRED_TAB_OPTIONS = [
  { value: "realtime_best", label: "실시간BEST" },
  { value: "expert_stock", label: "투자고수종목" },
  { value: "domestic_rank", label: "국내종목순위" },
  { value: "foreign_rank", label: "해외종목순위" },
  { value: "etf_rank", label: "ETF순위" },
  { value: "vi_stock", label: "VI발동종목" },
  { value: "sector_stock", label: "섹터 종목" },
  { value: "coin_price", label: "코인시세" },
];

function getCurrentMonthYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeString(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function getLabel(options, value) {
  const f = options.find((o) => o.value === value);
  return f ? f.label : value || "—";
}

export default function AdminPage() {
  const [month, setMonth] = useState(getCurrentMonthYYYYMM());
  const [activeType, setActiveType] = useState("home");
  const [allData, setAllData] = useState({ home: [], floating: [], interest: [] });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);

  const isInterest = activeType === "interest";

  async function loadAllData() {
    try {
      setLoadError("");
      setLoading(true);
      const results = {};
      for (const type of Object.keys(BANNER_TYPES)) {
        const res = await fetch(`${API_BASE}/api/banner/${type}?withUserName=true`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${type} API 실패`);
        results[type] = await res.json();
      }
      setAllData(results);
    } catch (e) {
      setLoadError(e?.message || "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAllData(); }, []);

  const filtered = useMemo(() => {
    const raw = allData[activeType] || [];
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    return raw
      .filter((item) => {
        const start = safeString(item.startDate);
        const end = safeString(item.endDate);
        if (!start || !end) return false;
        return start <= monthEnd && end >= monthStart;
      })
      .sort((a, b) => {
        const pa = a.priority ?? 9999;
        const pb = b.priority ?? 9999;
        return pa - pb;
      })
      .map((item, idx) => ({ no: idx + 1, ...item }));
  }, [allData, activeType, month]);

  const tableHeaders = useMemo(() => {
    const base = [
      "수정","우선순위","No","담당자","배너구분","매체유형","배너명","배너내용",
      "상품구분","목적",
    ];
    if (isInterest) {
      base.push("희망 탭");
    }
    base.push("노출시작","노출종료","바로가기속성","바로가기링크","랜딩페이지","삭제");
    return base;
  }, [isInterest]);

  const totalCols = tableHeaders.length;
  const deleteColIdx = totalCols - 1;

  function handleEdit(item) {
    const realId = item.id || item._id;
    if (!realId) { alert("이 항목은 id가 없습니다."); return; }
    setEditingItem({ ...item, id: realId });
    setEditForm({
      bannerType: item.bannerType || "",
      mediaType: item.mediaType || "",
      banner: item.banner || "",
      bannerDesc: item.bannerDesc || "",
      productType: item.productType || "",
      purpose: item.purpose || "",
      desiredTab: item.desiredTab || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      linkType: item.linkType || "",
      linkData: item.linkData || "",
      landingPage: item.landingPage || "",
      priority: item.priority || 1,
    });
  }

  async function handleUpdate() {
    if (!editingItem?.id) { alert("ID가 없습니다."); return; }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/update/${activeType}/${editingItem.id}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) }
      );
      if (!res.ok) throw new Error("수정 실패");
      setEditingItem(null);
      await loadAllData();
    } catch (e) {
      console.error(e);
      alert("수정 중 오류 발생");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const realId = item.id || item._id;
    if (!realId) return;
    if (!confirm(`"${item.banner || "관심그룹탭"}" 항목을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/delete/${activeType}/${realId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      await loadAllData();
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류 발생");
    }
  }

  function buildExcelBase64() {
    const wb = XLSX.utils.book_new();
    const rows = filtered.map((item) => {
      const row = {
        No: item.no,
        우선순위: item.priority ?? "—",
        담당자: item.createdByName || "—",
        배너구분: getLabel(BANNER_TYPE_OPTIONS, item.bannerType),
        매체유형: getLabel(MEDIA_TYPE_OPTIONS, item.mediaType),
        배너명: item.banner,
        배너내용: item.bannerDesc,
        상품구분: getLabel(PRODUCT_TYPE_OPTIONS, item.productType),
        목적: getLabel(PURPOSE_OPTIONS, item.purpose),
      };
      if (isInterest) {
        row["희망 탭"] = getLabel(DESIRED_TAB_OPTIONS, item.desiredTab);
      }
      row["노출시작"] = item.startDate;
      row["노출종료"] = item.endDate;
      row["바로가기속성"] = getLabel(LINK_TYPE_OPTIONS, item.linkType);
      row["바로가기링크"] = item.linkData || "";
      row["랜딩페이지"] = item.landingPage || "";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, BANNER_TYPES[activeType]);
    return XLSX.write(wb, { bookType: "xlsx", type: "base64" });
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new();
    const rows = filtered.map((item) => {
      const row = {
        No: item.no,
        우선순위: item.priority ?? "—",
        담당자: item.createdByName || "—",
        배너구분: getLabel(BANNER_TYPE_OPTIONS, item.bannerType),
        매체유형: getLabel(MEDIA_TYPE_OPTIONS, item.mediaType),
        배너명: item.banner,
        배너내용: item.bannerDesc,
        상품구분: getLabel(PRODUCT_TYPE_OPTIONS, item.productType),
        목적: getLabel(PURPOSE_OPTIONS, item.purpose),
      };
      if (isInterest) {
        row["희망 탭"] = getLabel(DESIRED_TAB_OPTIONS, item.desiredTab);
      }
      row["노출시작"] = item.startDate;
      row["노출종료"] = item.endDate;
      row["바로가기속성"] = getLabel(LINK_TYPE_OPTIONS, item.linkType);
      row["바로가기링크"] = item.linkData || "";
      row["랜딩페이지"] = item.landingPage || "";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, BANNER_TYPES[activeType]);
    XLSX.writeFile(wb, `banner_admin_${activeType}_${month}.xlsx`);
  }

  async function sendEmail() {
    if (!emailTo) { alert("이메일 주소를 입력해주세요."); return; }
    setSending(true);
    try {
      const base64 = buildExcelBase64();
      const res = await fetch(`${API_BASE}/api/admin/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: `[배너스케줄] ${BANNER_TYPES[activeType]} ${month}`,
          filename: `banner_admin_${activeType}_${month}.xlsx`,
          data: base64,
        }),
      });
      if (!res.ok) throw new Error("전송 실패");
      alert("✅ 메일이 전송되었습니다.");
      setEmailModal(false);
      setEmailTo("");
    } catch (e) {
      console.error(e);
      alert("❌ 메일 전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f3f6", fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif" }}>
      <header style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        padding: "22px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>📋</span>
          <div>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>배너 스케줄 관리</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, marginTop: 2 }}>Admin Panel</p>
          </div>
        </div>
        <button onClick={loadAllData} style={{
          background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
          padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500,
        }}>🔄 새로고침</button>
      </header>

      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 28px" }}>
        <div style={{
          background: "#fff", borderRadius: 10, padding: "16px 20px", marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(BANNER_TYPES).map(([type, label]) => (
              <button key={type} onClick={() => setActiveType(type)} style={{
                padding: "9px 18px",
                background: activeType === type ? "#1e293b" : "#f4f4f5",
                color: activeType === type ? "#fff" : "#555",
                border: activeType === type ? "none" : "1px solid #e4e4e7",
                borderRadius: 6, cursor: "pointer", fontSize: 13,
                fontWeight: activeType === type ? 600 : 400,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{
              padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none",
            }} />
            <button onClick={downloadExcel} style={{
              padding: "7px 14px", background: "#16a34a", color: "#fff", border: "none",
              borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>⬇ 엑셀</button>
            <button onClick={() => setEmailModal(true)} style={{
              padding: "7px 14px", background: "#2563eb", color: "#fff", border: "none",
              borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>📧 메일전송</button>
            <span style={{
              fontSize: 12, color: "#888", background: "#f4f4f5", padding: "5px 12px", borderRadius: 20, fontWeight: 600,
            }}>{filtered.length}건</span>
          </div>
        </div>

        {loadError && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            ❌ {loadError}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {tableHeaders.map((h, i) => (
                    <th key={i} style={{
                      padding: "11px 12px",
                      textAlign: [0,1,2,deleteColIdx].includes(i) ? "center" : "left",
                      fontSize: 11, fontWeight: 700,
                      color: i === deleteColIdx ? "#dc2626" : "#64748b",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={totalCols} style={{ textAlign: "center", padding: 48, color: "#a1a1aa" }}>⏳ 데이터 로딩중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={totalCols} style={{ textAlign: "center", padding: 48, color: "#a1a1aa" }}>등록된 배너가 없습니다</td></tr>
                ) : filtered.map((item, idx) => (
                  <tr key={item.id || item._id} style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f8fafc"; }}
                  >
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button onClick={() => handleEdit(item)} style={{
                        background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 5,
                        padding: "5px 10px", cursor: "pointer", fontSize: 13,
                      }}>✏️</button>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}><PriorityBadge value={item.priority} /></td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>{item.no}</td>
                    <td style={{ ...tdS, fontWeight: 500, color: "#334155" }}>{item.createdByName || "—"}</td>
                    <td style={tdS}>{getLabel(BANNER_TYPE_OPTIONS, item.bannerType)}</td>
                    <td style={tdS}>{getLabel(MEDIA_TYPE_OPTIONS, item.mediaType)}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: "#1e293b" }}>{item.banner || "—"}</td>
                    <td style={{ ...tdS, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{item.bannerDesc || "—"}</td>
                    <td style={tdS}>{getLabel(PRODUCT_TYPE_OPTIONS, item.productType)}</td>
                    <td style={tdS}>{getLabel(PURPOSE_OPTIONS, item.purpose)}</td>
                    {isInterest && (
                      <td style={{ ...tdS, fontWeight: 500, color: "#7c3aed" }}>{getLabel(DESIRED_TAB_OPTIONS, item.desiredTab)}</td>
                    )}
                    <td style={{ ...tdS, textAlign: "center" }}>{item.startDate || "—"}</td>
                    <td style={{ ...tdS, textAlign: "center" }}>{item.endDate || "—"}</td>
                    <td style={tdS}>{getLabel(LINK_TYPE_OPTIONS, item.linkType)}</td>
                    <td style={{ ...tdS, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{item.linkData || "—"}</td>
                    <td style={{ ...tdS, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{item.landingPage || "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button onClick={() => handleDelete(item)} style={{
                        background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5,
                        padding: "5px 10px", cursor: "pointer", fontSize: 13,
                      }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── 메일 전송 모달 ── */}
      {emailModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) setEmailModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 14, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              padding: "18px 24px", borderRadius: "14px 14px 0 0",
              color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>📧 엑셀 메일 전송</h3>
              <button onClick={() => setEmailModal(false)} style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 15,
              }}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>
                {BANNER_TYPES[activeType]} · {month} 엑셀을 전송합니다.
              </p>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, marginTop: 16 }}>받는 사람 이메일</label>
              <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                placeholder="ex) jiunlee@nhqv.com"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ padding: "14px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
              <button onClick={() => setEmailModal(false)} style={{
                padding: "9px 20px", background: "#f4f4f5", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>취소</button>
              <button onClick={sendEmail} disabled={sending} style={{
                padding: "9px 24px", background: sending ? "#94a3b8" : "#2563eb",
                color: "#fff", border: "none", borderRadius: 6, cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
              }}>{sending ? "전송중..." : "전송"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {editingItem && editForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{
              background: "linear-gradient(135deg, #1e293b, #334155)",
              padding: "18px 24px", borderRadius: "14px 14px 0 0",
              color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>✏️ 배너 수정</h3>
              <button onClick={() => setEditingItem(null)} style={{
                background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 15,
              }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="배너구분">
                  <select style={inp} value={editForm.bannerType} onChange={(e) => setEditForm({ ...editForm, bannerType: e.target.value })}>
                    <option value="">선택</option>
                    {BANNER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="매체유형">
                  <select style={inp} value={editForm.mediaType} onChange={(e) => setEditForm({ ...editForm, mediaType: e.target.value })}>
                    <option value="">선택</option>
                    {MEDIA_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="배너명">
                <input style={inp} value={editForm.banner} onChange={(e) => setEditForm({ ...editForm, banner: e.target.value })} />
              </Field>

              <Field label="배너내용">
                <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={editForm.bannerDesc} onChange={(e) => setEditForm({ ...editForm, bannerDesc: e.target.value })} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="상품구분">
                  <select style={inp} value={editForm.productType} onChange={(e) => setEditForm({ ...editForm, productType: e.target.value })}>
                    <option value="">선택</option>
                    {PRODUCT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="목적">
                  <select style={inp} value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}>
                    <option value="">선택</option>
                    {PURPOSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              {isInterest && (
                <Field label="희망 탭">
                  <select style={inp} value={editForm.desiredTab} onChange={(e) => setEditForm({ ...editForm, desiredTab: e.target.value })}>
                    <option value="">선택</option>
                    {DESIRED_TAB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="노출시작">
                  <input type="date" style={inp} value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                </Field>
                <Field label="노출종료">
                  <input type="date" style={inp} value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
                </Field>
              </div>

              <Field label="바로가기속성">
                <select style={inp} value={editForm.linkType} onChange={(e) => setEditForm({ ...editForm, linkType: e.target.value })}>
                  <option value="">선택</option>
                  {LINK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label="바로가기링크">
                <input style={inp} value={editForm.linkData} onChange={(e) => setEditForm({ ...editForm, linkData: e.target.value })} />
              </Field>

              <Field label="랜딩페이지">
                <input style={inp} value={editForm.landingPage} onChange={(e) => setEditForm({ ...editForm, landingPage: e.target.value })} />
              </Field>

              <Field label="우선순위">
                <input type="number" min={1} style={{ ...inp, width: 100 }} value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })} />
              </Field>
            </div>

            <div style={{ padding: "14px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
              <button onClick={() => setEditingItem(null)} style={{
                padding: "9px 20px", background: "#f4f4f5", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>취소</button>
              <button onClick={handleUpdate} disabled={saving} style={{
                padding: "9px 24px", background: saving ? "#94a3b8" : "#1e293b",
                color: "#fff", border: "none", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
              }}>{saving ? "저장중..." : "수정완료"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function PriorityBadge({ value }) {
  if (value == null) {
    return (
      <span style={{
        display: "inline-block", minWidth: 28, padding: "3px 8px", borderRadius: 20,
        fontSize: 12, fontWeight: 700, textAlign: "center",
        color: "#94a3b8", background: "#f1f5f9", border: "1px solid #e2e8f0",
      }}>—</span>
    );
  }
  const c = { 1: "#16a34a", 2: "#2563eb", 3: "#d97706", 4: "#db2777", 5: "#7c3aed" }[value] || "#64748b";
  return (
    <span style={{
      display: "inline-block", minWidth: 28, padding: "3px 8px", borderRadius: 20,
      fontSize: 12, fontWeight: 700, textAlign: "center",
      color: c, background: `${c}15`, border: `1px solid ${c}40`,
    }}>{value}</span>
  );
}

const tdS = { padding: "10px 12px", color: "#475569" };

const inp = {
  width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 6,
  fontSize: 14, outline: "none", fontFamily: "inherit",
};