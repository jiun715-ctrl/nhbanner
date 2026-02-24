/**
 * Banner Schedule Slack App (Multi Banner Type Version + MongoDB)
 */

require("dotenv").config();

const { App, ExpressReceiver } = require("@slack/bolt");
const cors = require("cors");
const mongoose = require("mongoose");

/* ======================================================
 * MongoDB 연결
 * ====================================================== */

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
});

mongoose.connection.on("connected", () => console.log("✅ MongoDB 연결 성공"));
mongoose.connection.on("error", (err) => console.log("❌ MongoDB 에러:", err.message));
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB 연결 끊김, 재연결 시도...");
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI).catch(() => {});
  }, 3000);
});

const bannerSchema = new mongoose.Schema({
  id: { type: String, index: true },
  priority: Number,
  eventCode: String,
  bannerType: String,
  mediaType: String,
  banner: String,
  bannerDesc: String,
  productType: String,
  purpose: String,
  desiredTab: String,
  desiredTabCustom: String,
  startDate: String,
  endDate: String,
  linkType: String,
  linkUrl: String,
  linkData: String,
  createdBy: { type: String, index: true },
  createdAt: String,
  updatedAt: String,
}, { strict: false });

const BannerModel = {
  home: mongoose.model("Home", bannerSchema, "home"),
  floating: mongoose.model("Floating", bannerSchema, "floating"),
  interest: mongoose.model("Interest", bannerSchema, "interest"),
};

const BASE_URL =
  process.env.WEB_BASE_URL && process.env.WEB_BASE_URL.startsWith("http")
    ? process.env.WEB_BASE_URL
    : "http://localhost:3001";

console.log("🌐 WEB BASE URL:", BASE_URL);

/* ======================================================
 * 배너 타입 설정
 * ====================================================== */

const BANNER_TYPES = {
  home: "🏠 홈상단배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
};

const BANNER_TYPE_AUTO = {
  home: "01",
  floating: "03",
  interest: "99",
};

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

/* 🔥 배너 타입별 최대 노출일수 */
const MAX_EXPOSURE_DAYS = {
  home: 7,
  floating: 3,
  interest: 7,
};

/* 🔥 관리자 Slack User ID (등록 알림 수신) */
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "";

function getDesiredTabLabel(value) {
  const found = INTEREST_TAB_OPTIONS.find(o => o.value === value);
  return found ? found.label : value || "—";
}

/* ======================================================
 * MongoDB 유틸
 * ====================================================== */

function cleanDoc(doc) {
  const obj = { ...doc };
  delete obj._id;
  delete obj.__v;
  return obj;
}

async function loadBannerData(type) {
  try {
    const model = BannerModel[type];
    if (!model) return [];
    const docs = await model.find({}).lean();
    return docs.map((doc, index) => {
      const clean = cleanDoc(doc);
      clean.id = clean.id || doc._id.toString();
      if (clean.mediaType !== "n2") {
        clean.priority = clean.priority ?? (index + 1);
      }
      return clean;
    });
  } catch (e) {
    console.log(`❌ loadBannerData(${type}) 실패:`, e.message);
    return [];
  }
}

async function addBannerItem(type, item) {
  try {
    const model = BannerModel[type];
    if (!model) return;
    const clean = cleanDoc(item);
    await model.create(clean);
    console.log(`✅ addBannerItem(${type}) 추가 완료`);
  } catch (e) {
    console.log(`❌ addBannerItem(${type}) 실패:`, e.message);
  }
}

async function updateBannerItem(type, id, updates) {
  try {
    const model = BannerModel[type];
    if (!model) return;
    await model.updateOne({ id }, { $set: updates });
    console.log(`✅ updateBannerItem(${type}) 수정 완료: ${id}`);
  } catch (e) {
    console.log(`❌ updateBannerItem(${type}) 실패:`, e.message);
  }
}

async function deleteBannerItem(type, id) {
  try {
    const model = BannerModel[type];
    if (!model) return;
    if (!id) {
      console.log(`⚠️ deleteBannerItem(${type}) 차단: id가 없음!`);
      return;
    }
    const result = await model.deleteOne({ id });
    console.log(`✅ deleteBannerItem(${type}) 삭제 완료: ${id}, deleted: ${result.deletedCount}`);
  } catch (e) {
    console.log(`❌ deleteBannerItem(${type}) 실패:`, e.message);
  }
}

async function updatePriorities(type, priorityMap) {
  try {
    const model = BannerModel[type];
    if (!model) return;
    const ops = priorityMap.map(({ id, priority }) => ({
      updateOne: {
        filter: { id },
        update: { $set: { priority } },
      },
    }));
    if (ops.length > 0) {
      await model.bulkWrite(ops);
    }
    console.log(`✅ updatePriorities(${type}) 완료: ${ops.length}건`);
  } catch (e) {
    console.log(`❌ updatePriorities(${type}) 실패:`, e.message);
  }
}

async function recalcPriorities(type) {
  const list = await loadBannerData(type);
  const nonN2 = list.filter(item => item.mediaType !== "n2");
  const priorityMap = [];
  nonN2
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    .forEach((item, idx) => {
      if (item.priority !== idx + 1) {
        priorityMap.push({ id: item.id, priority: idx + 1 });
      }
    });
  if (priorityMap.length > 0) {
    await updatePriorities(type, priorityMap);
  }
}

/* ======================================================
 * Receiver
 * ====================================================== */
const express = require("express");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
receiver.router.use(express.json());

receiver.router.use(cors({
  origin: [
    BASE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "https://nhbanner.vercel.app",
  ],
}));

receiver.router.post("/slack/events", (req, res) => {
  if (req.body.type === "url_verification") {
    return res.json({ challenge: req.body.challenge });
  }
  res.sendStatus(200);
});

receiver.router.get("/api/banner/:type", async (req, res) => {
  const data = await loadBannerData(req.params.type);

  if (req.query.withUserName === "true") {
    const enriched = await Promise.all(
      data.map(async (item) => ({
        ...item,
        createdByName: await getSlackUserName(item.createdBy),
      }))
    );
    return res.json(enriched);
  }

  res.json(data);
});

/* ======================================================
 * 관리자 수정 API
 * ====================================================== */
receiver.router.post("/api/admin/update/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const updatedData = req.body;

  const list = await loadBannerData(type);
  const index = list.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  const oldItem = list[index];
  const oldPriority = oldItem.priority || 1;

  const oldPriorityMap = {};
  list.forEach(item => { oldPriorityMap[item.id] = item.priority; });

  const isN2 = (updatedData.mediaType || oldItem.mediaType) === "n2";
  const newPriority = isN2
    ? null
    : updatedData.priority !== undefined
      ? Number(updatedData.priority)
      : oldPriority;

  const safeUpdate = {};
  const updateKeys = [
    "eventCode", "bannerType", "mediaType", "banner",
    "bannerDesc", "productType", "purpose",
    "desiredTab", "desiredTabCustom",
    "startDate", "endDate", "linkType",
    "linkUrl", "linkData"
  ];

  updateKeys.forEach(key => {
    if (updatedData[key] !== undefined) {
      safeUpdate[key] = updatedData[key];
    }
  });

  safeUpdate.priority = newPriority;
  safeUpdate.updatedAt = new Date().toISOString();

  await updateBannerItem(type, id, safeUpdate);
  await recalcPriorities(type);

  const updatedList = await loadBannerData(type);
  const updatedItem = updatedList.find(i => i.id === id);

  try {
    const LABEL_MAP = {
      priority: "우선순위",
      startDate: "노출시작일",
      endDate: "노출종료일",
      banner: "배너명",
      bannerDesc: "배너내용",
      productType: "상품구분",
      purpose: "목적",
      desiredTab: "희망 탭",
      desiredTabCustom: "기타 희망 탭",
      bannerType: "배너구분",
      mediaType: "매체유형",
      linkType: "바로가기속성",
      linkUrl: "이벤트이미지url",
      linkData: "링크데이터",
      eventCode: "이벤트코드",
    };

    const changedDetails = [];

    Object.keys(LABEL_MAP).forEach((key) => {
      const before = oldItem[key] ?? "";
      const after = (updatedItem || {})[key] ?? "";

      if (String(before) !== String(after)) {
        const label = LABEL_MAP[key];
        changedDetails.push(
          `• ${label}\n   ${before || "-"} → ${after || "-"}`
        );
      }
    });

    if (changedDetails.length > 0) {
      await app.client.chat.postMessage({
        channel: oldItem.createdBy,
        text:
          `📢 관리자에 의해 *"${oldItem.banner || "관심그룹탭"}"* 게시물이 수정되었습니다.\n\n` +
          `🔎 변경된 항목:\n\n` +
          changedDetails.join("\n\n"),
      });
    }
  } catch (e) {
    console.log("Slack DM 실패:", e.message);
  }

  try {
    for (const item of updatedList) {
      if (item.id === id) continue;
      if (item.mediaType === "n2") continue;
      const oldP = oldPriorityMap[item.id];
      const newP = item.priority;
      if (oldP !== undefined && oldP !== newP) {
        await app.client.chat.postMessage({
          channel: item.createdBy,
          text:
            `📢 관리자에 의해 *"${item.banner || "관심그룹탭"}"* 게시물의 우선순위가 변경되었습니다.\n\n` +
            `• 우선순위\n   ${oldP} → ${newP}`,
        });
      }
    }
  } catch (e) {
    console.log("우선순위 변경 DM 실패:", e.message);
  }

  try {
    const uniqueUsers = [...new Set(updatedList.map(i => i.createdBy))];
    for (const userId of uniqueUsers) {
      try {
        await publishBannerMain(userId, type);
        await publishMyReservations(userId, type);
      } catch (innerErr) {
        console.log(`❌ Slack 갱신 실패 (${userId}):`, innerErr.message);
      }
    }
  } catch (e) {
    console.log("❌ Slack 화면 갱신 전체 실패:", e.message);
  }

  res.json({ success: true });
});

/* ======================================================
 * 관리자 삭제 API
 * ====================================================== */
receiver.router.delete("/api/admin/delete/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  const list = await loadBannerData(type);
  const target = list.find((item) => item.id === id);

  if (!target) {
    return res.status(404).json({ error: "Not found" });
  }

  await deleteBannerItem(type, id);
  await recalcPriorities(type);

  try {
    await app.client.chat.postMessage({
      channel: target.createdBy,
      text: `⚠️ 관리자에 의해 *"${target.banner || "관심그룹탭"}"* 게시물이 삭제되었습니다.`,
    });
  } catch (e) {
    console.log("Slack DM 실패:", e.message);
  }

  const newList = await loadBannerData(type);

  try {
    const allUsers = [...new Set(newList.map(i => i.createdBy))];
    if (!allUsers.includes(target.createdBy)) {
      allUsers.push(target.createdBy);
    }
    for (const userId of allUsers) {
      try {
        await publishBannerMain(userId, type);
        await publishMyReservations(userId, type);
      } catch (innerErr) {
        console.log(`Slack 갱신 실패 (${userId}):`, innerErr.message);
      }
    }
  } catch (e) {
    console.log("Slack 화면 갱신 실패:", e.message);
  }

  res.json({ success: true });
});

/* ======================================================
 * Slack App
 * ====================================================== */

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

const userNameCache = {};

async function getSlackUserName(userId) {
  if (!userId) return "—";
  if (userNameCache[userId]) return userNameCache[userId];
  try {
    const result = await app.client.users.info({ user: userId });
    const name = result.user.profile.display_name || result.user.real_name || userId;
    userNameCache[userId] = name;
    return name;
  } catch (e) {
    console.log(`⚠️ 유저명 조회 실패 (${userId}):`, e.message);
    return userId;
  }
}

/* ======================================================
 * 날짜 유틸
 * ====================================================== */

function formatMMDD(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

/* 🔥 고정폭 정렬용: 한글 2칸, 그 외 1칸 */
function getDisplayWidth(str) {
  let w = 0;
  for (const ch of str) {
    w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return w;
}

/* 🔥 KST 오늘 날짜 (YYYY-MM-DD) */
function getTodayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getThisWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/* ======================================================
 * 홈 화면
 * ====================================================== */

async function publishHome(userId) {
  await app.client.views.publish({
    user_id: userId,
    view: {
      type: "home",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📢 배너 노출 희망 일정 신청" },
        },
        { type: "divider" },
        {
          type: "actions",
          elements: [
            ...Object.entries(BANNER_TYPES).map(([type, label]) => ({
              type: "button",
              text: { type: "plain_text", text: label },
              action_id: `open_banner_tab_${type}`,
              value: type,
            })),
            {
              type: "button",
              text: { type: "plain_text", text: "👤 내예약보기" },
              action_id: "my_reservations_all",
            },
          ],
        },
        { type: "divider" },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "🔐 관리자전용페이지" },
              action_id: "open_admin_password",
              style: "danger",
            },
          ],
        },
        { type: "divider" },
        {
          type: "header",
          text: { type: "plain_text", text: "📌 배너 운영 그라운드 룰" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*1. 배너 안내*\n" +
              "  • *[홈상단 배너]* 홈 화면 상단에 노출 | 최대 5개 (✕ 버튼 누를 경우)\n" +
              "  • *[플로팅 배너]* 화면 하단 팝업 형식 노출 | 최대 5개 (슬라이드 할 경우)\n" +
              "  • *[관심그룹 배너]* 관심그룹 화면 각 탭별 종목 리스트 중간 노출 | 탭별 1개만 노출",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*2. 신청 기간*\n" +
              "  • *[본 신청]* 매월 1일 ~ 마지막 목요일\n" +
              "     → 익월 희망 기간에 배너 반영\n" +
              "  • *[추가 신청]* 마지막 금요일 ~ 익월 두 번째 목요일\n" +
              "     → 익월 두 번째 금요일부터 반영 (1일~두 번째 목요일은 지연신청 패널티로 불가)\n" +
              "  • *[긴급 신청]* 요청 시 관리자 검토 후 희망일 반영 (제도 개편, 긴급 공지 등)",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*3. 화면 노출 기간 (주말 포함)*\n" +
              "  • *[홈상단 배너]* 최대 7일\n" +
              "  • *[플로팅 배너]* 최대 3일\n" +
              "  • *[관심종목탭]* 최대 7일\n" +
              "      ⚠️ (공통) 같은 월 2회 이상 유사배너 노출 시, 3번째부터 후순위 변경 가능\n" +
              "                      (2순위 신청자가 있을 경우에 한함, 유사 여부는 관리자 판단)",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*4. 우선순위 제도*\n" +
              "  • 배너 등록 신청 시각에 따라 1순위~5순위 및 대기번호 실시간 배정\n" +
              "  • ⚠️(주의) 기 등록 후 날짜 수정 시, 변경일에 신청자가 이미 있는 경우 후순위로 자동 배정",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*5. 등록 시 주의사항*\n" +
              "  • 모든 신청건이 확정되는 것은 아님.\n" +
              "      본신청 마감(마지막 목요일) 이후 익월 캘린더에 1차 확정본만 남게 됨\n" +
              "      추가신청 마감(익월 두 번째 목요일) 이후에는 해당월 최종 확정본만 남게 됨.\n" +
              "  • 추후 상품종류(국내/해외주식 등), 목적(세일즈, 제도개선 안내 등), 전환율 등 운영상황에 따라\n" +
              "      관리자/사용자 간 논의 하에 우선순위 기준이 변경될 수 있음.",
          },
        },
      ],
    },
  });
}

/* ======================================================
 * 배너 메인 화면 (주간리스트)
 * 🔥 interest: desiredTab 기준 슬롯 매칭 (6슬롯)
 * ====================================================== */

async function publishBannerMain(userId, type) {
  const allData = await loadBannerData(type);
  const calendarData = allData.filter(item => item.mediaType !== "n2");

  const isInterest = type === "interest";
  const dates = getThisWeekDates();

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${BANNER_TYPES[type]} 관리` },
    },
    { type: "divider" },
  ];

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "➕ 등록하기" },
        style: "primary",
        action_id: `open_register_modal_${type}`,
        value: type,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "📆 월간 배너 일정 보기" },
        url: `${BASE_URL}/banner/${type}`,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "⬅ 이전화면" },
        action_id: "go_home",
      },
    ],
  });

  blocks.push({ type: "divider" });
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "📅 주간 스케줄" },
  });

  dates.forEach((date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const yyyyMMdd = `${y}-${m}-${d}`;

    const dayItems = calendarData.filter(
      (item) => item.startDate <= yyyyMMdd && item.endDate >= yyyyMMdd
    );

    let lines;

    if (isInterest) {
      // 🔥 고정 5슬롯 + 기타 3슬롯 = 총 8개 (코드블록 정렬)
      const fixedTabs = INTEREST_TAB_OPTIONS.filter(o => o.value !== "etc");
      const allLines = [];
      fixedTabs.forEach((tab) => {
        const found = dayItems.find(item => item.desiredTab === tab.value);
        allLines.push({ label: tab.label, value: found ? "등록됨" : "—" });
      });
      const etcItems = dayItems
        .filter(item => item.desiredTab === "etc")
        .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      for (let i = 0; i < 3; i++) {
        const found = etcItems[i];
        const customName = found?.desiredTabCustom || "—";
        allLines.push({ label: `기타${i + 1}(그 외 빈 구좌)`, value: customName });
      }
      const maxLen = Math.max(...allLines.map(l => getDisplayWidth(l.label)));
      const formatted = allLines.map(l => {
        const pad = " ".repeat(maxLen - getDisplayWidth(l.label) + 2);
        return `${l.label}${pad}${l.value}`;
      });
      lines = [`\`\`\`\n${formatted.join("\n")}\n\`\`\``];
    } else {
      const sorted = [...dayItems].sort(
        (a, b) => (a.priority || 0) - (b.priority || 0)
      );
      const ranks = Array.from({ length: 7 }, (_, i) => i + 1);
      lines = ranks.map((rank) => {
        const found = sorted[rank - 1];
        const label = rank <= 5 ? `${rank}순위` : `대기 ${rank - 5}`;
        return found ? `${label}  ${found.banner}` : `${label} —`;
      });
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${formatMMDD(date)}*\n${lines.join("\n")}`,
      },
    });
    blocks.push({ type: "divider" });
  });

  await app.client.views.publish({
    user_id: userId,
    view: { type: "home", blocks },
  });
}

/* ======================================================
 * 내 예약 보기
 * ====================================================== */

async function publishMyReservations(userId, type) {
  const targetTypes = type ? [type] : Object.keys(BANNER_TYPES);

  const allMyItems = [];
  for (const t of targetTypes) {
    const data = await loadBannerData(t);
    const mine = data.filter((item) => item.createdBy === userId);
    mine.forEach((item) => allMyItems.push({ ...item, _type: t }));
  }

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: type ? `👤 ${BANNER_TYPES[type]} 내 예약` : "👤 내 예약 전체보기" },
    },
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "⬅ 돌아가기" },
          action_id: type ? "back_to_banner_main" : "go_home",
          value: type || "home",
        },
      ],
    },
    { type: "divider" },
  ];

  if (allMyItems.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "등록한 예약이 없습니다." },
    });
  } else {
    allMyItems.forEach((item) => {
      const typeLabel = BANNER_TYPES[item._type] || item._type;
      const mediaLabel = { "common": "공통", "tree": "나무", "n2": "N2" }[item.mediaType] || item.mediaType || "";
      const priorityText = item.mediaType === "n2" ? "우선순위: —" : `우선순위: ${item.priority || "—"}`;

      // 🔥 interest: 희망 탭 라벨 표시
      let displayName = item.banner;
      if (item._type === "interest") {
        const tabLabel = getDesiredTabLabel(item.desiredTab);
        const customSuffix = item.desiredTab === "etc" && item.desiredTabCustom
          ? ` (${item.desiredTabCustom})`
          : "";
        displayName = `${tabLabel}${customSuffix}`;
      }
      displayName = displayName || "—";

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${displayName}*  |  ${typeLabel}  |  ${mediaLabel}\n` +
            `${item.startDate} ~ ${item.endDate}  |  ${priorityText}\n` +
            `> ${item.bannerDesc || ""}`,
        },
      });

      blocks.push({
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "✏️ 수정" }, action_id: "edit_my_reservation", value: `${item._type}:${item.id}` },
          { type: "button", text: { type: "plain_text", text: "🗑 삭제" }, style: "danger", action_id: "delete_reservation", value: `${item._type}:${item.id}` },
        ],
      });

      blocks.push({ type: "divider" });
    });
  }

  await app.client.views.publish({
    user_id: userId,
    view: { type: "home", blocks },
  });
}

/* ======================================================
 * 이벤트 핸들러
 * ====================================================== */

app.event("app_home_opened", async ({ event }) => {
  publishHome(event.user).catch(e => console.log("publishHome 실패:", e.message));
});

Object.keys(BANNER_TYPES).forEach((type) => {
  app.action(`open_banner_tab_${type}`, async ({ ack, body }) => {
    await ack();
    publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
  });
});

app.action("my_reservations", async ({ ack, body }) => {
  await ack();
  const type = body.actions?.[0]?.value;
  if (!type) return;
  publishMyReservations(body.user.id, type).catch(e => console.log("publishMyReservations 실패:", e.message));
});

app.action("my_reservations_all", async ({ ack, body }) => {
  await ack();
  publishMyReservations(body.user.id, null).catch(e => console.log("publishMyReservations 실패:", e.message));
});

/* ======================================================
 * 🔥 등록/수정 모달 블록 빌더 (interest 분기)
 * ====================================================== */

function buildModalBlocks(type, item) {
  const isInterest = type === "interest";
  const isEdit = !!item;
  const blocks = [];

  // 매체유형
  const mediaTypeElement = {
    type: "static_select",
    action_id: "media_type",
    options: [
      { text: { type: "plain_text", text: "공통" }, value: "common" },
      { text: { type: "plain_text", text: "나무" }, value: "tree" },
      { text: { type: "plain_text", text: "N2" }, value: "n2" },
    ],
  };
  if (isEdit && item.mediaType) {
    const mtLabel = { "common": "공통", "tree": "나무", "n2": "N2" }[item.mediaType] || item.mediaType;
    mediaTypeElement.initial_option = {
      text: { type: "plain_text", text: mtLabel },
      value: item.mediaType,
    };
  } else {
    mediaTypeElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "media_type_block",
    label: { type: "plain_text", text: "매체유형" },
    element: mediaTypeElement,
  });

  // 배너명 (interest 제외)
  if (!isInterest) {
    blocks.push({
      type: "input",
      block_id: "banner_block",
      label: { type: "plain_text", text: "배너명" },
      element: {
        type: "plain_text_input",
        action_id: "banner",
        multiline: true,
        ...(isEdit ? { initial_value: item.banner || "" } : {}),
        placeholder: { type: "plain_text", text: "플로팅 배너인 경우 반드시 줄바꿈 심볼을 넣어주세요. ex. 트래블월렛 '여행자금 모으기'/n서비스 소개'" },
      },
    });
  }

  // 배너내용 (interest 제외)
  if (!isInterest) {
    blocks.push({
      type: "input",
      block_id: "banner_desc_block",
      label: { type: "plain_text", text: "배너내용" },
      element: {
        type: "plain_text_input",
        action_id: "banner_desc",
        ...(isEdit ? { initial_value: item.bannerDesc || "" } : {}),
        placeholder: { type: "plain_text", text: "이제 환전 걱정할 필요 없어요" },
      },
    });
  }

  // 상품구분
  const ptElement = {
    type: "static_select",
    action_id: "product_type",
    options: [
      { text: { type: "plain_text", text: "국내주식" }, value: "domestic_stock" },
      { text: { type: "plain_text", text: "해외주식" }, value: "foreign_stock" },
      { text: { type: "plain_text", text: "국내/해외주식" }, value: "both_stock" },
      { text: { type: "plain_text", text: "금융상품" }, value: "financial" },
      { text: { type: "plain_text", text: "연금" }, value: "pension" },
      { text: { type: "plain_text", text: "기타" }, value: "etc" },
    ],
  };
  if (isEdit && item.productType) {
    const ptLabel = {
      "domestic_stock": "국내주식", "foreign_stock": "해외주식",
      "both_stock": "국내/해외주식", "financial": "금융상품",
      "pension": "연금", "etc": "기타"
    }[item.productType] || item.productType;
    ptElement.initial_option = {
      text: { type: "plain_text", text: ptLabel },
      value: item.productType,
    };
  } else {
    ptElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "product_type_block",
    label: { type: "plain_text", text: "상품구분" },
    element: ptElement,
  });

  // 목적
  const purposeElement = {
    type: "static_select",
    action_id: "purpose",
    options: [
      { text: { type: "plain_text", text: "세일즈마케팅" }, value: "sales_marketing" },
      { text: { type: "plain_text", text: "정보제공(제도 등)" }, value: "info" },
      { text: { type: "plain_text", text: "서비스활성화" }, value: "service" },
      { text: { type: "plain_text", text: "기타" }, value: "etc" },
    ],
  };
  if (isEdit && item.purpose) {
    const purLabel = {
      "sales_marketing": "세일즈마케팅", "info": "정보제공(제도 등)",
      "service": "서비스활성화", "etc": "기타"
    }[item.purpose] || item.purpose;
    purposeElement.initial_option = {
      text: { type: "plain_text", text: purLabel },
      value: item.purpose,
    };
  } else {
    purposeElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "purpose_block",
    label: { type: "plain_text", text: "목적" },
    element: purposeElement,
  });

  // 🔥 희망 탭 (interest만)
  if (isInterest) {
    const dtElement = {
      type: "static_select",
      action_id: "desired_tab",
      options: INTEREST_TAB_OPTIONS.map(o => ({
        text: { type: "plain_text", text: o.label },
        value: o.value,
      })),
    };
    if (isEdit && item.desiredTab) {
      const dtLabel = getDesiredTabLabel(item.desiredTab);
      dtElement.initial_option = {
        text: { type: "plain_text", text: dtLabel },
        value: item.desiredTab,
      };
    } else {
      dtElement.placeholder = { type: "plain_text", text: "선택하세요" };
    }
    blocks.push({
      type: "input",
      block_id: "desired_tab_block",
      label: { type: "plain_text", text: "희망 탭" },
      element: dtElement,
    });

    // 기타 선택 시 희망 탭 입력
    blocks.push({
      type: "input",
      block_id: "desired_tab_custom_block",
      optional: true,
      label: { type: "plain_text", text: "기타 선택 시 희망 탭 입력" },
      element: {
        type: "plain_text_input",
        action_id: "desired_tab_custom",
        ...(isEdit ? { initial_value: item.desiredTabCustom || "" } : {}),
        placeholder: { type: "plain_text", text: "기타 선택 시 희망 탭 이름을 입력하세요" },
      },
    });
  }

  // 노출시작 희망일자
  blocks.push({
    type: "input",
    block_id: "start_date_block",
    label: { type: "plain_text", text: "노출시작 희망일자" },
    element: {
      type: "datepicker",
      action_id: "start_date",
      ...(isEdit && item.startDate ? { initial_date: item.startDate } : {}),
    },
  });

  // 노출종료 희망일자
  blocks.push({
    type: "input",
    block_id: "end_date_block",
    label: { type: "plain_text", text: "노출종료 희망일자" },
    element: {
      type: "datepicker",
      action_id: "end_date",
      ...(isEdit && item.endDate ? { initial_date: item.endDate } : {}),
    },
  });

  // 바로가기속성
  const linkOptions = isInterest
    ? [
        { text: { type: "plain_text", text: "URL[배너형]" }, value: "url" },
        { text: { type: "plain_text", text: "화면[배너형]" }, value: "screen" },
      ]
    : [
        { text: { type: "plain_text", text: "화면오픈" }, value: "screen" },
        { text: { type: "plain_text", text: "팝업오픈" }, value: "popup" },
        { text: { type: "plain_text", text: "프레임팝업" }, value: "frame_popup" },
        { text: { type: "plain_text", text: "URL" }, value: "url" },
      ];

  const ltElement = {
    type: "static_select",
    action_id: "link_type",
    options: linkOptions,
  };

  if (isEdit && item.linkType) {
    const validValues = linkOptions.map(o => o.value);
    if (validValues.includes(item.linkType)) {
      const ltLabel = linkOptions.find(o => o.value === item.linkType)?.text.text || item.linkType;
      ltElement.initial_option = {
        text: { type: "plain_text", text: ltLabel },
        value: item.linkType,
      };
    }
  }
  if (!ltElement.initial_option) {
    ltElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "link_type_block",
    label: { type: "plain_text", text: "바로가기속성" },
    element: ltElement,
  });

  // 이벤트이미지url
  blocks.push({
    type: "input",
    block_id: "link_url_block",
    optional: true,
    label: { type: "plain_text", text: "이벤트이미지url" },
    element: {
      type: "plain_text_input",
      action_id: "link_url",
      multiline: true,
      ...(isEdit ? { initial_value: item.linkUrl || "" } : {}),
      placeholder: { type: "plain_text", text: "노출 4일 전 알림이 갈 예정입니다. 알림을 받으실 경우 실제 링크를 입력해주세요." },
    },
  });

  return blocks;
}

/* ======================================================
 * 수정 모달 열기
 * ====================================================== */

app.action("edit_my_reservation", async ({ ack, body, client }) => {
  await ack();

  const raw = body.actions?.[0]?.value;
  if (!raw) return;

  const [type, id] = raw.split(":");
  if (!type || !id) return;

  const list = await loadBannerData(type);
  const item = list.find((i) => i.id === id);
  if (!item) return;

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: `edit_modal_${type}`,
      title: { type: "plain_text", text: `${BANNER_TYPES[type]} 일정 수정` },
      submit: { type: "plain_text", text: "수정완료" },
      close: { type: "plain_text", text: "취소" },
      private_metadata: JSON.stringify({ id, type }),
      blocks: buildModalBlocks(type, item),
    },
  });
});

app.action("delete_reservation", async ({ ack, body }) => {
  await ack();

  const raw = body.actions?.[0]?.value;
  const userId = body.user.id;
  if (!raw) return;

  const [type, id] = raw.split(":");
  if (!type || !id) return;

  (async () => {
    await deleteBannerItem(type, id);
    await recalcPriorities(type);
    await publishMyReservations(userId, type);
  })().catch(e => console.log("delete_reservation 실패:", e.message));
});

app.action("back_to_banner_main", async ({ ack, body }) => {
  await ack();
  const type = body.actions?.[0]?.value;
  if (!type) return;
  publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
});

app.action("go_home", async ({ ack, body }) => {
  await ack();
  publishHome(body.user.id).catch(e => console.log("publishHome 실패:", e.message));
});

app.action("open_admin_password", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "admin_password_check",
      title: { type: "plain_text", text: "🔐 관리자 인증" },
      submit: { type: "plain_text", text: "확인" },
      close: { type: "plain_text", text: "취소" },
      blocks: [
        {
          type: "input",
          block_id: "pw_block",
          label: { type: "plain_text", text: "비밀번호를 입력하세요" },
          element: {
            type: "plain_text_input",
            action_id: "pw_input",
            placeholder: { type: "plain_text", text: "숫자 4자리" },
          },
        },
      ],
    },
  });
});

app.view("admin_password_check", async ({ ack, view, body }) => {
  const pw = view.state.values.pw_block.pw_input.value;

  if (pw !== "0099") {
    await ack({
      response_action: "errors",
      errors: { pw_block: "❌ 비밀번호가 틀렸습니다." },
    });
    return;
  }

  await ack({
    response_action: "update",
    view: {
      type: "modal",
      callback_id: "admin_success",
      title: { type: "plain_text", text: "✅ 인증 성공" },
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: "✅ 인증 성공! 아래 버튼을 눌러주세요." },
          accessory: {
            type: "button",
            action_id: "open_admin_page",
            text: { type: "plain_text", text: "📋 관리자 페이지 열기" },
            url: "https://nhbanner.vercel.app/admin",
          },
        },
      ],
    },
  });
});

app.action("open_admin_page", async ({ ack }) => {
  await ack();
});

/* ======================================================
 * 등록 모달 + 등록 처리
 * ====================================================== */

Object.keys(BANNER_TYPES).forEach((type) => {
  app.action(`open_register_modal_${type}`, async ({ ack, body, client }) => {
    await ack();

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: `register_modal_${type}`,
        title: { type: "plain_text", text: `${BANNER_TYPES[type]} 일정 등록` },
        submit: { type: "plain_text", text: "등록" },
        close: { type: "plain_text", text: "취소" },
        blocks: buildModalBlocks(type, null),
      },
    });
  });

  app.view(`register_modal_${type}`, async ({ ack, view, body }) => {
    const v = view.state.values;
    const isInterest = type === "interest";

    // 🔥 날짜 유효성 검사 (시작일: 오늘 이후, 종료일: 최대 노출일 이내)
    const startDate = v.start_date_block.start_date.selected_date;
    const endDate = v.end_date_block.end_date.selected_date;
    const todayKST = getTodayKST();

    const errors = {};
    if (startDate < todayKST) {
      errors.start_date_block = "시작일은 오늘 이후로 설정해주세요.";
    }
    if (endDate < startDate) {
      errors.end_date_block = "종료일은 시작일 이후로 설정해주세요.";
    }
    const maxDays = MAX_EXPOSURE_DAYS[type] || 7;
    if (startDate && endDate) {
      const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > maxDays) {
        errors.end_date_block = `노출 기간은 시작일 포함 최대 ${maxDays}일까지 가능합니다. (현재 ${diffDays}일)`;
      }
    }
    if (Object.keys(errors).length > 0) {
      await ack({ response_action: "errors", errors });
      return;
    }

    await ack();

    const mediaType = v.media_type_block.media_type.selected_option?.value || "";
    const isN2 = mediaType === "n2";

    const list = await loadBannerData(type);
    const nonN2List = list.filter(item => item.mediaType !== "n2");
    const maxPriority =
      nonN2List.length > 0
        ? Math.max(...nonN2List.map((i) => i.priority || 0))
        : 0;

    const newItem = {
      id: Date.now().toString(),
      priority: isN2 ? null : maxPriority + 1,
      eventCode: "",
      bannerType: BANNER_TYPE_AUTO[type] || "00",
      mediaType,
      banner: isInterest ? "" : (v.banner_block?.banner?.value || ""),
      bannerDesc: isInterest ? "" : (v.banner_desc_block?.banner_desc?.value || ""),
      productType: v.product_type_block.product_type.selected_option?.value || "",
      purpose: v.purpose_block.purpose.selected_option?.value || "",
      desiredTab: isInterest ? (v.desired_tab_block?.desired_tab?.selected_option?.value || "") : "",
      desiredTabCustom: isInterest ? (v.desired_tab_custom_block?.desired_tab_custom?.value || "") : "",
      startDate: v.start_date_block.start_date.selected_date,
      endDate: v.end_date_block.end_date.selected_date,
      linkType: v.link_type_block.link_type.selected_option?.value || "",
      linkUrl: v.link_url_block?.link_url?.value || "",
      linkData: "",
      createdBy: body.user.id,
      createdAt: new Date().toISOString(),
    };

    await addBannerItem(type, newItem);

    // 🔥 관리자에게 등록 알림 DM
    if (ADMIN_USER_ID && ADMIN_USER_ID !== body.user.id) {
      try {
        const displayName = isInterest
          ? getDesiredTabLabel(newItem.desiredTab) + (newItem.desiredTabCustom ? ` (${newItem.desiredTabCustom})` : "")
          : newItem.banner || "—";
        const userName = await getSlackUserName(body.user.id);
        await app.client.chat.postMessage({
          channel: ADMIN_USER_ID,
          text:
            `📬 새 배너가 등록되었습니다.\n\n` +
            `• 유형: ${BANNER_TYPES[type]}\n` +
            `• 배너: ${displayName}\n` +
            `• 기간: ${newItem.startDate} ~ ${newItem.endDate}\n` +
            `• 등록자: ${userName}`,
        });
      } catch (e) {
        console.log("관리자 DM 실패:", e.message);
      }
    }

    publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
  });
});

/* ======================================================
 * 수정 모달 처리
 * ====================================================== */

app.view(/edit_modal_(.*)/, async ({ ack, view, body }) => {
  const { id, type } = JSON.parse(view.private_metadata);
  const v = view.state.values;
  const isInterest = type === "interest";

  // 🔥 날짜 유효성 검사
  const startDate = v.start_date_block.start_date.selected_date;
  const endDate = v.end_date_block.end_date.selected_date;
  const todayKST = getTodayKST();

  const errors = {};
  if (startDate < todayKST) {
    errors.start_date_block = "시작일은 오늘 이후로 설정해주세요.";
  }
  if (endDate < startDate) {
    errors.end_date_block = "종료일은 시작일 이후로 설정해주세요.";
  }
  const maxDays = MAX_EXPOSURE_DAYS[type] || 7;
  if (startDate && endDate) {
    const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > maxDays) {
      errors.end_date_block = `노출 기간은 시작일 포함 최대 ${maxDays}일까지 가능합니다. (현재 ${diffDays}일)`;
    }
  }
  if (Object.keys(errors).length > 0) {
    await ack({ response_action: "errors", errors });
    return;
  }

  await ack();

  const mediaType = v.media_type_block.media_type.selected_option?.value || "";
  const isN2 = mediaType === "n2";

  // 🔥 날짜 변경 여부 확인 → 해당일 기존 배너 있으면 후순위
  const list = await loadBannerData(type);
  const oldItem = list.find(i => i.id === id);
  const datesChanged = oldItem &&
    (startDate !== oldItem.startDate || endDate !== oldItem.endDate);

  const updates = {
    mediaType,
    productType: v.product_type_block.product_type.selected_option?.value || "",
    purpose: v.purpose_block.purpose.selected_option?.value || "",
    startDate,
    endDate,
    linkType: v.link_type_block.link_type.selected_option?.value || "",
    linkUrl: v.link_url_block?.link_url?.value || "",
    priority: isN2 ? null : undefined,
    updatedAt: new Date().toISOString(),
  };

  if (isInterest) {
    updates.desiredTab = v.desired_tab_block?.desired_tab?.selected_option?.value || "";
    updates.desiredTabCustom = v.desired_tab_custom_block?.desired_tab_custom?.value || "";
  } else {
    updates.banner = v.banner_block?.banner?.value || "";
    updates.bannerDesc = v.banner_desc_block?.banner_desc?.value || "";
  }

  // 🔥 날짜 변경 + 해당일 기존 배너 존재 시 → 후순위 배정
  if (datesChanged && !isN2) {
    const overlapping = list.filter(i =>
      i.id !== id &&
      i.mediaType !== "n2" &&
      i.startDate <= endDate &&
      i.endDate >= startDate
    );
    if (overlapping.length > 0) {
      const nonN2Others = list.filter(i => i.mediaType !== "n2" && i.id !== id);
      const maxP = nonN2Others.length > 0
        ? Math.max(...nonN2Others.map(i => i.priority || 0))
        : 0;
      updates.priority = maxP + 1;
    }
  }

  await updateBannerItem(type, id, updates);
  await recalcPriorities(type);

  publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
  publishMyReservations(body.user.id, type).catch(e => console.log("publishMyReservations 실패:", e.message));
});

/* ======================================================
 * 🔔 4일 전 리마인더 DM (1시간마다 체크, 하루 1회 발송)
 * ====================================================== */

let lastReminderCheckDate = "";

async function checkReminders() {
  try {
    const todayStr = getTodayKST();

    // 하루에 한 번만 실행
    if (lastReminderCheckDate === todayStr) return;
    lastReminderCheckDate = todayStr;

    // 4일 뒤 날짜 계산
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const target = new Date(kstNow);
    target.setDate(target.getDate() + 4);
    const targetStr = target.toISOString().slice(0, 10);

    console.log(`🔔 리마인더 체크: 오늘=${todayStr}, 대상시작일=${targetStr}`);

    for (const type of Object.keys(BANNER_TYPES)) {
      const data = await loadBannerData(type);
      for (const item of data) {
        if (item.startDate === targetStr) {
          const displayName = item.banner
            || getDesiredTabLabel(item.desiredTab)
            || "배너";
          try {
            await app.client.chat.postMessage({
              channel: item.createdBy,
              text:
                `📢 *"${displayName}"* 노출 시작 4일 전입니다.\n` +
                `이미지URL을 포함하여 최종 확정된 내용으로 수정해주세요.`,
            });
            console.log(`✅ 리마인더 발송: ${displayName} → ${item.createdBy}`);
          } catch (e) {
            console.log(`❌ 리마인더 DM 실패 (${item.createdBy}):`, e.message);
          }
        }
      }
    }
  } catch (e) {
    console.log("❌ checkReminders 실패:", e.message);
  }
}

/* ======================================================
 * 서버 실행
 * ====================================================== */

(async () => {
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack App 실행중 (port ${PORT})`);

  // 🔔 리마인더: 1시간마다 체크, 서버 시작 15초 후 첫 체크
  setInterval(checkReminders, 60 * 60 * 1000);
  setTimeout(checkReminders, 15000);
})();