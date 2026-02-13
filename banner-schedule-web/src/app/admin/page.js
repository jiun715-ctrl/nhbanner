"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = "https://nhbanner-slack.onrender.com";

const BANNER_TYPES = {
  home: "🏠 홈배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
};

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContentStyle = {
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  width: 420,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function getCurrentMonthYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeString(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export default function AdminPage() {
  const [month, setMonth] = useState(getCurrentMonthYYYYMM());
  const [activeType, setActiveType] = useState("home");
  const [allData, setAllData] = useState({
    home: [],
    floating: [],
    interest: [],
  });
  const [loadError, setLoadError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(null);

  /* ===============================
   * 데이터 로드
   * =============================== */
  useEffect(() => {
    async function run() {
      try {
        setLoadError("");
        const results = {};

        for (const type of Object.keys(BANNER_TYPES)) {
          const res = await fetch(`${API_BASE}/api/banner/${type}`, {
            cache: "no-store",
          });

          if (!res.ok) throw new Error(`${type} API 실패`);
          results[type] = await res.json();
        }

        setAllData(results);
      } catch (e) {
        setLoadError(e?.message || "데이터 로드 실패");
      }
    }

    run();
  }, []);

  /* ===============================
   * 월 필터
   * =============================== */
  const filtered = useMemo(() => {
    const raw = allData[activeType] || [];

    return raw
      .filter((item) => safeString(item.startDate).startsWith(month))
      .sort((a, b) =>
        safeString(a.startDate).localeCompare(safeString(b.startDate))
      )
      .map((item, idx) => ({
        no: idx + 1,
        ...item,
      }));
  }, [allData, activeType, month]);

  /* ===============================
   * 수정 시작
   * =============================== */
  function handleEdit(item) {
    setEditingItem(item);

    setEditForm({
      eventCode: item.eventCode || item.targetEventCode || "",
      bannerCategory: item.bannerCategory || "",
      mediaType: item.mediaType || "",
      banner: item.banner || "",
      bannerContent: item.bannerContent || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      linkType: item.linkType || "",
      linkUrl: item.linkUrl || "",
      linkData: item.linkData || "",
      priority: item.priority || 1,
    });
  }

  /* ===============================
   * 수정 저장
   * =============================== */
  async function handleUpdate() {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/update/${activeType}/${editingItem.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!res.ok) throw new Error("수정 실패");

      alert("수정 완료");
      setEditingItem(null);

      // 다시 로드
      const refreshed = await fetch(
        `${API_BASE}/api/banner/${activeType}`,
        { cache: "no-store" }
      );

      const data = await refreshed.json();
      setAllData((prev) => ({
        ...prev,
        [activeType]: data,
      }));
    } catch (e) {
      alert("수정 중 오류 발생");
      console.error(e);
    }
  }

  /* ===============================
   * 삭제
   * =============================== */
  async function handleDelete(item) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/delete/${activeType}/${item.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("삭제 실패");

      alert("삭제 완료");

      const refreshed = await fetch(
        `${API_BASE}/api/banner/${activeType}`,
        { cache: "no-store" }
      );

      const data = await refreshed.json();
      setAllData((prev) => ({
        ...prev,
        [activeType]: data,
      }));
    } catch (e) {
      alert("삭제 중 오류 발생");
      console.error(e);
    }
  }

  /* ===============================
   * 엑셀 다운로드
   * =============================== */
  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    const rows = filtered.map((item) => ({
      No: item.no,
      EventCode: item.eventCode || item.targetEventCode,
      배너구분: item.bannerCategory,
      매체유형: item.mediaType,
      배너명: item.banner,
      배너내용: item.bannerContent,
      노출시작: item.startDate,
      노출종료: item.endDate,
      바로가기속성: item.linkType,
      링크: item.linkUrl,
      링크데이터: item.linkData,
      CreatedAt: item.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, BANNER_TYPES[activeType]);
    XLSX.writeFile(wb, `banner_admin_${month}.xlsx`);
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>
        🛠 배너 관리자 화면
      </h1>

      {/* 타입 탭 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {Object.entries(BANNER_TYPES).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
              background: activeType === type ? "#222" : "#eee",
              color: activeType === type ? "#fff" : "#000",
              border: "none",
              borderRadius: 6,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 월 필터 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button onClick={downloadExcel}>⬇ 엑셀 다운로드</button>
        <span>({filtered.length}건)</span>
      </div>

      {loadError && <div style={{ color: "red" }}>❌ {loadError}</div>}

      <table
        border="1"
        cellPadding="8"
        style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}
      >
        <thead>
          <tr>
            <th>관리</th>
            <th>No</th>
            <th>EventCode</th>
            <th>배너구분</th>
            <th>매체유형</th>
            <th>배너명</th>
            <th>배너내용</th>
            <th>노출시작</th>
            <th>노출종료</th>
            <th>바로가기속성</th>
            <th>링크</th>
            <th>링크데이터</th>
            <th>CreatedAt</th>
          </tr>
        </thead>

        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="13">데이터 없음</td>
            </tr>
          ) : (
            filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <button onClick={() => handleEdit(item)}>수정</button>
                  <button
                    onClick={() => handleDelete(item)}
                    style={{ color: "red" }}
                  >
                    삭제
                  </button>
                </td>
                <td>{item.no}</td>
                <td>{item.eventCode || item.targetEventCode}</td>
                <td>{item.bannerCategory}</td>
                <td>{item.mediaType}</td>
                <td>{item.banner}</td>
                <td>{item.bannerContent}</td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
                <td>{item.linkType}</td>
                <td>{item.linkUrl}</td>
                <td>{item.linkData}</td>
                <td>{item.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 수정 모달 */}
      {editingItem && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>배너 수정</h3>

            <input
              placeholder="Event Code"
              value={editForm.eventCode}
              onChange={(e) =>
                setEditForm({ ...editForm, eventCode: e.target.value })
              }
            />

            <input
              placeholder="배너명"
              value={editForm.banner}
              onChange={(e) =>
                setEditForm({ ...editForm, banner: e.target.value })
              }
            />

            <textarea
              placeholder="배너내용"
              value={editForm.bannerContent}
              onChange={(e) =>
                setEditForm({ ...editForm, bannerContent: e.target.value })
              }
            />

            <input
              type="date"
              value={editForm.startDate}
              onChange={(e) =>
                setEditForm({ ...editForm, startDate: e.target.value })
              }
            />

            <input
              type="date"
              value={editForm.endDate}
              onChange={(e) =>
                setEditForm({ ...editForm, endDate: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="우선순위"
              value={editForm.priority}
              onChange={(e) =>
                setEditForm({ ...editForm, priority: e.target.value })
              }
            />

            <div style={{ marginTop: 10 }}>
              <button onClick={handleUpdate}>저장</button>
              <button onClick={() => setEditingItem(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
