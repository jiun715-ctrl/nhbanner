module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/banner-schedule-web/src/app/page.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
/* ===============================
 * 날짜 유틸
 * =============================== */ function formatDate(date) {
    return date.toISOString().slice(0, 10);
}
function getMonthMatrix(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7); // 월요일 시작
    const end = new Date(lastDay);
    end.setDate(end.getDate() + (6 - (end.getDay() + 6) % 7));
    const days = [];
    const cur = new Date(start);
    while(cur <= end){
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}
/* ===============================
 * 색상 팔레트 (배너별 고정)
 * =============================== */ const COLOR_CLASSES = [
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
];
function Home() {
    const today = new Date();
    const todayStr = formatDate(today);
    const [year, setYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(today.getFullYear());
    const [month, setMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(today.getMonth());
    const [banners, setBanners] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedDate, setSelectedDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetch("http://localhost:3000/api/homebanner").then((res)=>res.json()).then(setBanners).catch(console.error);
    }, []);
    /* ===============================
   * 배너명 → 색상 매핑
   * =============================== */ const bannerColorMap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const map = {};
        let idx = 0;
        banners.forEach((b)=>{
            if (!map[b.banner]) {
                map[b.banner] = COLOR_CLASSES[idx % COLOR_CLASSES.length];
                idx++;
            }
        });
        return map;
    }, [
        banners
    ]);
    const days = getMonthMatrix(year, month);
    function changeMonth(diff) {
        const d = new Date(year, month + diff, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDate(null);
    }
    /* ===============================
   * 선택 날짜 상세 리스트
   * =============================== */ const selectedDayItems = selectedDate ? banners.filter((b)=>b.startDate <= selectedDate && b.endDate >= selectedDate).sort((a, b)=>a.createdAt.localeCompare(b.createdAt)) : [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-zinc-50 px-6 py-8 dark:bg-black",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto max-w-7xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6 flex items-center justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-semibold text-zinc-900 dark:text-zinc-100",
                            children: "📆 월간 배너 일정"
                        }, void 0, false, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 109,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>changeMonth(-1),
                                    className: "rounded px-3 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800",
                                    children: "◀"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 114,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-medium text-zinc-700 dark:text-zinc-300",
                                    children: [
                                        year,
                                        ".",
                                        String(month + 1).padStart(2, "0")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>changeMonth(1),
                                    className: "rounded px-3 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800",
                                    children: "▶"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 123,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                    lineNumber: 108,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-7 border border-zinc-200 text-center text-sm font-medium dark:border-zinc-800",
                    children: [
                        "월",
                        "화",
                        "수",
                        "목",
                        "금",
                        "토",
                        "일"
                    ].map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border-b border-zinc-200 bg-zinc-100 py-2 dark:border-zinc-800 dark:bg-zinc-900",
                            children: d
                        }, d, false, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 135,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                    lineNumber: 133,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-7 border border-zinc-200 dark:border-zinc-800",
                    children: days.map((date)=>{
                        const dateStr = formatDate(date);
                        const isCurrentMonth = date.getMonth() === month;
                        const isToday = dateStr === todayStr;
                        const dayItems = banners.filter((b)=>b.startDate <= dateStr && b.endDate >= dateStr).sort((a, b)=>a.createdAt.localeCompare(b.createdAt));
                        const visible = dayItems.slice(0, 5);
                        const hasWaiting = dayItems.length > 5;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            onClick: ()=>setSelectedDate(dateStr),
                            className: `min-h-[140px] cursor-pointer border border-zinc-200 p-2 text-xs dark:border-zinc-800
                  ${isCurrentMonth ? "" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900"}
                  ${isToday ? "ring-2 ring-blue-400" : ""}
                `,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-1 text-xs font-semibold",
                                    children: date.getDate()
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 167,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-1",
                                    children: [
                                        visible.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `rounded px-1 py-0.5 text-xs leading-tight ${bannerColorMap[item.banner]}`,
                                                children: item.banner
                                            }, `${item.id}-${dateStr}`, false, {
                                                fileName: "[project]/banner-schedule-web/src/app/page.js",
                                                lineNumber: 173,
                                                columnNumber: 21
                                            }, this)),
                                        hasWaiting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[11px] font-medium text-zinc-500",
                                            children: "+ 대기 있음"
                                        }, void 0, false, {
                                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                                            lineNumber: 182,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 171,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, dateStr, true, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 159,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                    lineNumber: 145,
                    columnNumber: 9
                }, this),
                selectedDate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "mb-3 text-lg font-semibold",
                            children: [
                                "📋 ",
                                selectedDate,
                                " 배너 상세"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 195,
                            columnNumber: 13
                        }, this),
                        selectedDayItems.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-zinc-500",
                            children: "등록된 배너가 없습니다."
                        }, void 0, false, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 200,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "space-y-2",
                            children: selectedDayItems.map((item, index)=>{
                                const isWaiting = index >= 5;
                                const waitingNumber = isWaiting ? index - 4 : null;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    className: `rounded px-2 py-1 text-sm ${bannerColorMap[item.banner]}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 font-medium",
                                            children: [
                                                isWaiting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs font-semibold text-red-600",
                                                    children: [
                                                        "[대기 ",
                                                        waitingNumber,
                                                        "번]"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                                    lineNumber: 216,
                                                    columnNumber: 27
                                                }, this),
                                                item.banner
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                                            lineNumber: 214,
                                            columnNumber: 23
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs opacity-80",
                                            children: [
                                                item.department,
                                                " / ",
                                                item.manager
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                                            lineNumber: 225,
                                            columnNumber: 23
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs opacity-60",
                                            children: [
                                                item.startDate,
                                                " ~ ",
                                                item.endDate
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                                            lineNumber: 229,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, item.id, true, {
                                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                                    lineNumber: 210,
                                    columnNumber: 21
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/banner-schedule-web/src/app/page.js",
                            lineNumber: 204,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/banner-schedule-web/src/app/page.js",
                    lineNumber: 194,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/banner-schedule-web/src/app/page.js",
            lineNumber: 106,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/banner-schedule-web/src/app/page.js",
        lineNumber: 105,
        columnNumber: 5
    }, this);
}
}),
"[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3d6d1e72._.js.map