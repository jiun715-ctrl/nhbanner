"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

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

  /* ===============================
   * 3종류 데이터 모두 로드
   * =============================== */
  useEffect(() => {
    async function run() {
      try {
        setLoadError("");

        const results = {};

        for (const type of Object.keys(BANNER_TYPES)) {
          const res = await fetch(
            `http://localhost:3000/api/banner/${type}`,
            { cache: "no-store" }
          );

          if (!res.ok) {
            throw new Error(`${type} API 실패`);
          }

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
      .sort((a, b) => {
        const aStart = safeString(a.startDate);
        const bStart = safeString(b.startDate);
        if (aStart !== bStart) return aStart.localeCompare(bStart);

        return safeString(a.createdAt).localeCompare(
          safeString(b.createdAt)
        );
      })
      .map((item, idx) => ({
        no: idx + 1,
        ...item,
      }));
  }, [allData, activeType, month]);

  /* ===============================
   * 엑셀 3시트 다운로드
   * =============================== */
  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    Object.keys(BANNER_TYPES).forEach((type) => {
      const rows = (allData[type] || [])
        .filter((item) =>
          safeString(item.startDate).startsWith(month)
        )
        .map((item, idx) => ({
          No: idx + 1,
          department: safeString(item.department),
          manager: safeString(item.manager),
          banner: safeString(item.banner),
          startDate: safeString(item.startDate),
          endDate: safeString(item.endDate),
          createdAt: safeString(item.createdAt),
        }));

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, BANNER_TYPES[type]);
    });

    XLSX.writeFile(wb, `banner_admin_${month}.xlsx`);
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>
        🛠 배너 관리자 화면
      </h1>

      {/* 탭 버튼 */}
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

      {/* 컨트롤 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />

        <button
          onClick={downloadExcel}
          style={{ padding: "6px 10px" }}
        >
          ⬇ 3종 엑셀 다운로드
        </button>

        <span style={{ color: "#666" }}>
          ({filtered.length}건)
        </span>
      </div>

      {/* 에러 */}
      {loadError && (
        <div style={{ color: "red", marginBottom: 16 }}>
          ❌ {loadError}
        </div>
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
        <thead style={{ background: "#f3f3f3" }}>
          <tr>
            <th>No</th>
            <th>Department</th>
            <th>Manager</th>
            <th>Banner</th>
            <th>StartDate</th>
            <th>EndDate</th>
            <th>CreatedAt</th>
          </tr>
        </thead>

        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="7">데이터 없음</td>
            </tr>
          ) : (
            filtered.map((item) => (
              <tr key={safeString(item.id) || item.no}>
                <td>{item.no}</td>
                <td>{safeString(item.department)}</td>
                <td>{safeString(item.manager)}</td>
                <td>{safeString(item.banner)}</td>
                <td>{safeString(item.startDate)}</td>
                <td>{safeString(item.endDate)}</td>
                <td>{safeString(item.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
