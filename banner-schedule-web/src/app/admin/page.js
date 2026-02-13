"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = "https://nhbanner-slack.onrender.com";

const BANNER_TYPES = {
  home: "🏠 홈배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
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
  const [editItem, setEditItem] = useState(null);

  /* ===============================
   * 데이터 로드
   * =============================== */
  useEffect(() => {
    async function run() {
      try {
        setLoadError("");

        const results = {};

        for (const type of Object.keys(BANNER_TYPES)) {
          const res = await fetch(
            `${API_BASE}/api/banner/${type}`,
            { cache: "no-store" }
          );

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
      .filter((item) =>
        safeString(item.startDate).startsWith(month)
      )
      .sort((a, b) =>
        safeString(a.startDate).localeCompare(
          safeString(b.startDate)
        )
      )
      .map((item, idx) => ({
        no: idx + 1,
        ...item,
      }));
  }, [allData, activeType, month]);

  /* ===============================
   * 수정
   * =============================== */
  function handleEdit(item) {
    setEditItem({ ...item });
  }

  async function saveEdit() {
    await fetch(`${API_BASE}/api/admin/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeType,
        id: editItem.id,
        updatedData: editItem,
      }),
    });

    location.reload();
  }

  /* ===============================
   * 삭제
   * =============================== */
  async function handleDelete(item) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    await fetch(`${API_BASE}/api/admin/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeType,
        id: item.id,
      }),
    });

    location.reload();
  }

  /* ===============================
   * 엑셀 다운로드
   * =============================== */
  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    const rows = filtered.map((item) => ({
      No: item.no,
      EventCode: item.targetEventCode,
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
              background:
                activeType === type ? "#222" : "#eee",
              color:
                activeType === type ? "#fff" : "#000",
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

        <button onClick={downloadExcel}>
          ⬇ 엑셀 다운로드
        </button>

        <span>({filtered.length}건)</span>
      </div>

      {loadError && (
        <div style={{ color: "red" }}>❌ {loadError}</div>
      )}

      {/* 테이블 */}
      <table
        border="1"
        cellPadding="8"
        style={{
          borderCollapse: "collapse",
          width: "100%",
          textAlign: "center",
        }}
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
                <td>{item.targetEventCode}</td>
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
      {editItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div style={{
            background: "#fff",
            padding: 20,
            width: 400,
          }}>
            <h3>배너 수정</h3>

            <input
              value={editItem.banner}
              onChange={(e) =>
                setEditItem({ ...editItem, banner: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <button onClick={saveEdit}>저장</button>
            <button onClick={() => setEditItem(null)}>
              취소
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
