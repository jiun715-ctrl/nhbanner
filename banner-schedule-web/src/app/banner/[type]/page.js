"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* ===============================
 * 날짜 유틸
 * =============================== */

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay()); // 일요일 시작

  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const days = [];
  const cur = new Date(start);

  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return days;
}

/* ===============================
 * 색상 팔레트
 * =============================== */

const COLOR_CLASSES = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
];

/* 🔥 관심종목탭 전용: 희망 탭 옵션 & 슬롯 매핑 */
const INTEREST_TAB_OPTIONS = [
  { value: "realtime_best", label: "실시간BEST" },
  { value: "expert_stock", label: "투자고수종목" },
  { value: "domestic_rank", label: "국내종목순위" },
  { value: "foreign_rank", label: "해외종목순위" },
  { value: "etf_rank", label: "ETF순위" },
  { value: "etc", label: "기타(그 외 빈 구좌)" },
];

const INTEREST_RANK_LABELS = INTEREST_TAB_OPTIONS.map(o => o.label);
const INTEREST_SLOT_VALUES = INTEREST_TAB_OPTIONS.map(o => o.value);

export default function BannerPage() {
  const { type } = useParams();
  const today = new Date();
  const todayStr = formatDate(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [banners, setBanners] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  /* ===============================
   * 타입 기반 API 호출
   * =============================== */

  const apiBase = "https://nhbanner-slack.onrender.com";

  useEffect(() => {
    fetch(`${apiBase}/api/banner/${type}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setBanners)
      .catch(console.error);
  }, [type]);

  /* ===============================
   * 🔥 웹 캘린더용 필터: N2 제외 (common, tree만 표시)
   * =============================== */

  const calendarBanners = useMemo(() => {
    return banners.filter(b => b.mediaType !== "n2");
  }, [banners]);

  /* ===============================
   * 배너명 → 색상 매핑
   * =============================== */

  const isInterest = type === "interest";

  const bannerColorMap = useMemo(() => {
      const map = {};
      let idx = 0;

      calendarBanners.forEach(b => {
        const key = getColorKey(b);
        if (!map[key]) {
          map[key] = COLOR_CLASSES[idx % COLOR_CLASSES.length];
          idx++;
        }
      });

      return map;
    }, [calendarBanners, isInterest]);

  function getDisplayName(item) {
    if (item.banner) return item.banner;
    if (type === "interest") {
      if (item.desiredTab === "etc" && item.desiredTabCustom) {
        return item.desiredTabCustom;
      }
      const tabOpt = INTEREST_TAB_OPTIONS.find(o => o.value === item.desiredTab);
      return tabOpt ? tabOpt.label : "등록됨";
    }
    return "등록됨";
  }

  function getColorKey(item) {
    if (item.banner) return item.banner;
    if (type === "interest") {
      if (item.desiredTab === "etc") {
        return `etc_${item.desiredTabCustom || item.id}`;
      }
      return item.desiredTab || item.id;
    }
    return `slot_${item.priority || 0}`;
  }

  const days = getMonthMatrix(year, month);

  function changeMonth(diff) {
    const d = new Date(year, month + diff, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(null);
  }

  const maxSlots = isInterest ? 8 : 7;

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    const items = calendarBanners
      .filter(b => b.startDate <= selectedDate && b.endDate >= selectedDate);

    if (isInterest) {
      // 고정 5슬롯 (etc 제외) desiredTab 순서대로
      const fixedValues = INTEREST_SLOT_VALUES.filter(v => v !== "etc");
      const fixed = fixedValues.map(v => items.find(i => i.desiredTab === v)).filter(Boolean);
      // 기타 3개 (등록순)
      const etcItems = items
        .filter(i => i.desiredTab === "etc")
        .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
        .slice(0, 3);
      return [...fixed, ...etcItems];
    }

    return items
      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      .slice(0, 7);
  }, [selectedDate, calendarBanners, isInterest]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto max-w-7xl">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            📆 월간 배너일정({
              { home: "홈상단배너", floating: "플로팅배너", interest: "관심종목탭 배너" }[type] || type
            })
            <span className="ml-3 text-sm font-normal text-zinc-400">
              ※ 날짜를 클릭하시면 해당 정보가 하단에 노출됩니다
            </span>
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded px-3 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              ◀
            </button>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {year}.{String(month + 1).padStart(2, "0")}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="rounded px-3 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              ▶
            </button>
          </div>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 border border-zinc-200 text-center text-sm font-medium dark:border-zinc-800">
          {["일","월","화","수","목","금","토"].map(d => (
            <div
              key={d}
              className="border border-zinc-200 bg-zinc-100 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {d}
            </div>
          ))}
        </div>

        {/* 캘린더 */}
        <div className="grid grid-cols-7 border border-zinc-200 dark:border-zinc-800">
          {days.map(date => {
            const dateStr = formatDate(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = dateStr === todayStr;

            const dayItems = (() => {
              const raw = calendarBanners
                .filter(b => b.startDate <= dateStr && b.endDate >= dateStr);
              if (isInterest) {
                const fixedValues = INTEREST_SLOT_VALUES.filter(v => v !== "etc");
                const fixed = fixedValues.map(v => raw.find(i => i.desiredTab === v)).filter(Boolean);
                const etcItems = raw
                  .filter(i => i.desiredTab === "etc")
                  .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
                  .slice(0, 3);
                return [...fixed, ...etcItems];
              }
              return raw.sort((a, b) => (a.priority || 99) - (b.priority || 99));
            })();

            const maxVisible = isInterest ? 8 : 5;
            const visible = dayItems.slice(0, maxVisible);
            const hasMore = dayItems.length > maxVisible;

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[140px] cursor-pointer border border-zinc-200 p-2 text-xs dark:border-zinc-800
                  ${isCurrentMonth ? "" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"}
                  ${isToday ? "ring-2 ring-blue-400" : ""}
                  ${selectedDate === dateStr ? "bg-yellow-100 ring-2 ring-yellow-400 dark:bg-yellow-900" : ""}
                `}
              >
                <div className="mb-1 text-xs font-semibold">
                  {date.getDate()}
                </div>

                <div className="space-y-1">
                  {visible.map(item => (
                    <div
                      key={`${item.id}-${dateStr}`}
                      className={`rounded px-1 py-0.5 text-xs leading-tight ${bannerColorMap[getColorKey(item)]}`}
                    >
                      {getDisplayName(item)}
                    </div>
                  ))}

                  {hasMore && (
                    <div className="text-[11px] font-medium text-zinc-500">
                      + 더 있음
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 상세 리스트 */}
        {selectedDate && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-lg font-semibold">
              📋 {selectedDate} 배너 상세
            </h2>

            {selectedDayItems.length === 0 ? (
              <p className="text-sm text-zinc-500">
                등록된 배너가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedDayItems.map((item, index) => {
                  const isWaiting = isInterest ? false : index >= 5;
                  let rankLabel;
                  if (isInterest) {
                    if (index < 5) {
                      const fixedValues = INTEREST_SLOT_VALUES.filter(v => v !== "etc");
                      const tabOpt = INTEREST_TAB_OPTIONS.find(o => o.value === (item.desiredTab || fixedValues[index]));
                      rankLabel = tabOpt ? tabOpt.label : `슬롯${index + 1}`;
                    } else {
                      rankLabel = `기타 ${index - 4} (그 외 빈 구좌)`;
                    }
                  } else {
                    rankLabel = isWaiting
                      ? `대기 ${index - 4}`
                      : `${index + 1}순위`;
                  }

                  return (
                    <li
                      key={item.id}
                      className={`rounded px-3 py-2 text-sm ${bannerColorMap[getColorKey(item)]}`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span className={`inline-block ${isInterest ? "min-w-[160px]" : "min-w-[52px]"} rounded px-1.5 py-0.5 text-xs font-bold ${
                          isWaiting
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-white/60 text-zinc-700 dark:bg-black/30 dark:text-zinc-200"
                        }`}>
                          {rankLabel}
                        </span>
                        {getDisplayName(item)}
                        {item.mediaType && item.mediaType !== "n2" && (
                          <span className="ml-1 text-[11px] font-normal opacity-60">
                            ({item.mediaType === "tree" ? "나무" : "공통"})
                          </span>
                        )}
                      </div>

                      <div className="ml-[60px] text-xs opacity-80">
                        {item.bannerDesc || ""}
                      </div>

                      <div className="ml-[60px] text-xs opacity-60">
                        {item.startDate} ~ {item.endDate}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}