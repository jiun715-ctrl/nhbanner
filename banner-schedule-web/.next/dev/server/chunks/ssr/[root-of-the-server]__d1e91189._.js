module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/banner-schedule-web/src/app/admin/page.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/banner-schedule-web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/banner-schedule-web/node_modules/xlsx/xlsx.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const BANNER_TYPES = {
    home: "🏠 홈배너",
    floating: "📌 플로팅배너",
    interest: "⭐ 관심그룹탭배너"
};
function getCurrentMonthYYYYMM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function safeString(v) {
    return typeof v === "string" ? v : v == null ? "" : String(v);
}
function AdminPage() {
    const [month, setMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(getCurrentMonthYYYYMM());
    const [activeType, setActiveType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("home");
    const [allData, setAllData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        home: [],
        floating: [],
        interest: []
    });
    const [loadError, setLoadError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    /* ===============================
   * 3종류 데이터 모두 로드
   * =============================== */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        async function run() {
            try {
                setLoadError("");
                const results = {};
                for (const type of Object.keys(BANNER_TYPES)){
                    const res = await fetch(`http://localhost:3000/api/banner/${type}`, {
                        cache: "no-store"
                    });
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
   * =============================== */ const filtered = (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const raw = allData[activeType] || [];
        return raw.filter((item)=>safeString(item.startDate).startsWith(month)).sort((a, b)=>{
            const aStart = safeString(a.startDate);
            const bStart = safeString(b.startDate);
            if (aStart !== bStart) return aStart.localeCompare(bStart);
            return safeString(a.createdAt).localeCompare(safeString(b.createdAt));
        }).map((item, idx)=>({
                no: idx + 1,
                ...item
            }));
    }, [
        allData,
        activeType,
        month
    ]);
    /* ===============================
   * 엑셀 3시트 다운로드
   * =============================== */ function downloadExcel() {
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].book_new();
        Object.keys(BANNER_TYPES).forEach((type)=>{
            const rows = (allData[type] || []).filter((item)=>safeString(item.startDate).startsWith(month)).map((item, idx)=>({
                    No: idx + 1,
                    department: safeString(item.department),
                    manager: safeString(item.manager),
                    banner: safeString(item.banner),
                    startDate: safeString(item.startDate),
                    endDate: safeString(item.endDate),
                    createdAt: safeString(item.createdAt)
                }));
            const ws = __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].json_to_sheet(rows);
            __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, ws, BANNER_TYPES[type]);
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["writeFile"](wb, `banner_admin_${month}.xlsx`);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        style: {
            padding: 40,
            fontFamily: "sans-serif"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                style: {
                    fontSize: 26,
                    marginBottom: 20
                },
                children: "🛠 배너 관리자 화면"
            }, void 0, false, {
                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 10,
                    marginBottom: 20
                },
                children: Object.entries(BANNER_TYPES).map(([type, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveType(type),
                        style: {
                            padding: "8px 14px",
                            cursor: "pointer",
                            background: activeType === type ? "#222" : "#eee",
                            color: activeType === type ? "#fff" : "#000",
                            border: "none",
                            borderRadius: 6
                        },
                        children: label
                    }, type, false, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 125,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 12,
                    marginBottom: 16
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "month",
                        value: month,
                        onChange: (e)=>setMonth(e.target.value)
                    }, void 0, false, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 146,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: downloadExcel,
                        style: {
                            padding: "6px 10px"
                        },
                        children: "⬇ 3종 엑셀 다운로드"
                    }, void 0, false, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 152,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            color: "#666"
                        },
                        children: [
                            "(",
                            filtered.length,
                            "건)"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 159,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                lineNumber: 145,
                columnNumber: 7
            }, this),
            loadError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: "red",
                    marginBottom: 16
                },
                children: [
                    "❌ ",
                    loadError
                ]
            }, void 0, true, {
                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                lineNumber: 166,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                border: "1",
                cellPadding: "8",
                style: {
                    borderCollapse: "collapse",
                    width: "100%",
                    textAlign: "center"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                        style: {
                            background: "#f3f3f3"
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "No"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 183,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "Department"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 184,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "Manager"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 185,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "Banner"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 186,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "StartDate"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 187,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "EndDate"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 188,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    children: "CreatedAt"
                                }, void 0, false, {
                                    fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                    lineNumber: 189,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                            lineNumber: 182,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 181,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        children: filtered.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                colSpan: "7",
                                children: "데이터 없음"
                            }, void 0, false, {
                                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                lineNumber: 196,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                            lineNumber: 195,
                            columnNumber: 13
                        }, this) : filtered.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: item.no
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 201,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.department)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 202,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.manager)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 203,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.banner)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 204,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.startDate)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 205,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.endDate)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 206,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$banner$2d$schedule$2d$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        children: safeString(item.createdAt)
                                    }, void 0, false, {
                                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                        lineNumber: 207,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, safeString(item.id) || item.no, true, {
                                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                                lineNumber: 200,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
                lineNumber: 172,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/banner-schedule-web/src/app/admin/page.js",
        lineNumber: 117,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d1e91189._.js.map