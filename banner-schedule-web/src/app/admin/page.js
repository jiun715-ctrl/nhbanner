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
  width: 450,
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
     데이터 로드
  =============================== */
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
     월 필터
  =============================== */
  const filtered = useMemo(() => {
    const raw = allData[activeType] || [];

    return raw
      .filter((item) => safeString(item.startDate).startsWith(month))
      .sort((a, b) =>
        (a.priority || 0) - (b.priority || 0)
      )
      .map((item, idx) => ({
        no: idx + 1,
        ...item,
      }));
  }, [allData, activeType, month]);

  /* ===============================
     수정 시작
  =============================== */
  function handleEdit(item) {
    if (!item.id) {
      console.error("id 없음:", item);
      alert("이 항목은 id가 없습니다. 콘솔 확인하세요.");
      return;
    }

    setEditingItem(item);


    setEditForm({
      eventCode: item.eventCode || "",
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
     수정 저장
  =============================== */
  async function handleUpdate() {
    if (!editingItem?.id) {
      alert("ID가 없습니다.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/update/${activeType}/${editingItem.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.log("서버에러:", errText);
        throw new Error("수정 실패");
      }

      alert("수정 완료");

      const refreshed = await fetch(
        `${API_BASE}/api/banner/${activeType}`,
        { cache: "no-store" }
      );

      const data = await refreshed.json();

      setAllData((prev) => ({
        ...prev,
        [activeType]: data,
      }));

      setEditingItem(null);
    } catch (e) {
      console.error(e);
      alert("수정 중 오류 발생");
    }
  }

  /* ===============================
     삭제
  =============================== */
  async function handleDelete(item) {
    if (!item?.id) return;
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
      console.error(e);
      alert("삭제 중 오류 발생");
    }
  }

  /* ===============================
     엑셀 다운로드
  =============================== */
  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    const rows = filtered.map((item) => ({
      No: item.no,
      EventCode: item.eventCode,
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

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {Object.entries(BANNER_TYPES).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              padding: "8px 14px",
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

      <table border="1" cellPadding="8" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>관리</th>
            <th>No</th>
            <th>EventCode</th>
            <th>배너명</th>
            <th>노출시작</th>
            <th>노출종료</th>
            <th>우선순위</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id || item._id}>
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
              <td>{item.eventCode}</td>
              <td>{item.banner}</td>
              <td>{item.startDate}</td>
              <td>{item.endDate}</td>
              <td>{item.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingItem && editForm && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>배너 수정</h3>

            <input
              value={editForm.eventCode}
              onChange={(e) =>
                setEditForm({ ...editForm, eventCode: e.target.value })
              }
            />

            <input
              value={editForm.banner}
              onChange={(e) =>
                setEditForm({ ...editForm, banner: e.target.value })
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
              value={editForm.priority}
              onChange={(e) =>
                setEditForm({ ...editForm, priority: Number(e.target.value) })
              }
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleUpdate}>수정완료</button>
              <button onClick={() => setEditingItem(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
