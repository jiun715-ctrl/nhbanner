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
  landingPage: String,
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

/* 🔥 관심종목탭 전용: 희망 탭 옵션 */
const INTEREST_TAB_OPTIONS = [
  { value: "realtime_best", label: "실시간BEST" },
  { value: "expert_stock", label: "투자고수종목" },
  { value: "domestic_rank", label: "국내종목순위" },
  { value: "foreign_rank", label: "해외종목순위" },
  { value: "etf_rank", label: "ETF순위" },
  { value: "vi_stock", label: "VI발동종목" },
  { value: "sector_stock", label: "섹터 종목" },
  { value: "coin_price", label: "코인시세" },
];

const INTEREST_RANK_LABELS = INTEREST_TAB_OPTIONS.map(o => o.label);
const INTEREST_SLOT_VALUES = INTEREST_TAB_OPTIONS.map(o => o.value);

/* 🔥 배너 타입별 최대 노출일수 */
const MAX_EXPOSURE_DAYS = {
  home: 15,
  floating: 3,
  interest: 15,
};

/* 🔥 관리자 Slack User ID (등록 알림 수신) */
const ADMIN_USER_IDS = (process.env.ADMIN_USER_ID || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

/* 🔥 바로가기속성 옵션 (non-interest) */
const LINK_TYPE_OPTIONS = [
  { value: "screen_mts", label: "화면오픈(MTS화면)" },
  { value: "popup_event", label: "팝업오픈(이벤트)" },
  { value: "popup_notice", label: "팝업오픈(공지사항)" },
  { value: "popup_content", label: "팝업오픈(콘텐츠)" },
  { value: "url_external", label: "URL(외부페이지)" },
];

/* 🔥 바로가기속성별 자동입력 값 */
const LINK_AUTO_FILL = {
  popup_event:  { linkData: "X12m921g", landingPage: "E^000" },
  popup_notice: { linkData: "X12m921a", landingPage: "N^0000" },
  popup_content:{ linkData: "X08m5132", landingPage: "" },
};

function getDesiredTabLabel(value) {
  const found = INTEREST_TAB_OPTIONS.find(o => o.value === value);
  return found ? found.label : value || "—";
}

function getLinkTypeLabel(value) {
  const found = LINK_TYPE_OPTIONS.find(o => o.value === value);
  if (found) return found.label;
  // interest용 or 구버전
  const legacy = { "screen": "화면오픈", "popup": "팝업오픈", "frame_popup": "프레임팝업", "url": "URL" };
  return legacy[value] || value || "—";
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

async function recalcPriorities(type, pinnedId = null) {
  const list = await loadBannerData(type);
  const nonN2 = list.filter(item => item.mediaType !== "n2");
  const priorityMap = [];
  nonN2
    .sort((a, b) => {
      const pa = a.priority || 0;
      const pb = b.priority || 0;
      if (pa !== pb) return pa - pb;
      if (pinnedId) {
        if (a.id === pinnedId) return -1;
        if (b.id === pinnedId) return 1;
      }
      return 0;
    })
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


/* ======================================================
 * 엑셀 메일 전송 API
 * ====================================================== */
receiver.router.post("/api/admin/send-email", async (req, res) => {
  const { to, subject, filename, data } = req.body;

  if (!to || !data) {
    return res.status(400).json({ error: "이메일 주소와 데이터가 필요합니다." });
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.SENDGRID_FROM_EMAIL, name: "배너스케줄 관리" },
        subject: subject || "배너 스케줄 엑셀",
        content: [{ type: "text/plain", value: "배너 스케줄 엑셀 파일이 첨부되어 있습니다." }],
        attachments: [
          {
            content: data,
            filename: filename || "banner_schedule.xlsx",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            disposition: "attachment",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log("❌ SendGrid 응답:", errText);
      return res.status(500).json({ error: "메일 전송 실패" });
    }

    console.log("✅ 메일 전송 성공");
    res.json({ success: true });
  } catch (e) {
    console.log("❌ 메일 전송 실패:", e.message);
    res.status(500).json({ error: e.message });
  }
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
    "linkUrl", "linkData", "landingPage"
  ];

  updateKeys.forEach(key => {
    if (updatedData[key] !== undefined) {
      safeUpdate[key] = updatedData[key];
    }
  });

  safeUpdate.priority = newPriority;
  safeUpdate.updatedAt = new Date().toISOString();

  await updateBannerItem(type, id, safeUpdate);
  await recalcPriorities(type, id);

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
      bannerType: "배너구분",
      mediaType: "매체유형",
      linkType: "바로가기속성",
      linkData: "바로가기링크",
      landingPage: "랜딩페이지",
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
 * 날짜 유틸 (🔥 KST 기준으로 수정)
 * ====================================================== */

function formatMMDD(date) {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

function getDisplayWidth(str) {
  let w = 0;
  let upperCount = 0;
  for (const ch of str) {
    if (ch.charCodeAt(0) > 0x7f) {
      w += 2;
    } else {
      w += 1;
      if (ch >= 'A' && ch <= 'Z') upperCount++;
    }
  }
  w += Math.floor(upperCount / 3);
  return w;
}

function getTodayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getThisWeekDates() {
  // KST(UTC+9) 기준으로 오늘 날짜 계산
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstYear = kstNow.getUTCFullYear();
  const kstMonth = kstNow.getUTCMonth();
  const kstDate = kstNow.getUTCDate();
  const kstDay = kstNow.getUTCDay();

  const diffToMonday = (kstDay === 0 ? -6 : 1) - kstDay;
  const monday = new Date(Date.UTC(kstYear, kstMonth, kstDate + diffToMonday));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
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
          text: { type: "plain_text", text: "📌 배너 운영 그라운드 룰 (필독사항)" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*1. 배너 안내*\n" +
              "  • *[홈상단 배너]* 홈 화면 상단에 노출 | 최대 5개 (✕ 버튼 클릭 시 변경)\n" +
              "  • *[플로팅 배너]* 화면 하단 팝업 형식 노출 | 최대 5개 (슬라이드 할 경우 변경)\n" +
              "  • *[관심그룹 배너]* 관심그룹 각 탭 내 종목리스트 중간에 노출 | 탭별 1개만 노출",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*2. 신청 기간*\n" +
              "  • *[본 신청]* 매주 둘째주/넷째주 목요일 오후 3시 등록\n" +
              "     → 등록 전까지 취합된 내용을 일괄 반영. 이후 신청 시 긴급만 가능\n" +
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
              "  • *[홈상단 배너]* 최대 15일\n" +
              "  • *[플로팅 배너]* 최대 3일\n" +
              "  • *[관심종목탭]* 최대 15일\n" +
              "      ⚠️ (공통) 유사배너를 반복해서 올리는 경우 관리자 판단 하에 우선순위가 변경될 수 있습니다."                 
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
              "  • ⚠️ (주의) 기 등록 후 날짜 수정 시, 변경 시각 기준 우선순위 반영(후순위)",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "*5. 등록 시 주의사항*\n" +
              "  • 모든 신청건이 확정되는 것은 아님. 본신청 마감 이후 캘린더에 확정본만 남게 됨\n" +
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
 * ====================================================== */

async function publishBannerMain(userId, type) {
  const allData = await loadBannerData(type);
  const calendarData = allData.filter(item => item.mediaType !== "n2");

  const isInterest = type === "interest";
  const creatorNames = {};
  if (isInterest) {
    for (const item of calendarData) {
      if (item.createdBy && !creatorNames[item.createdBy]) {
        creatorNames[item.createdBy] = await getSlackUserName(item.createdBy);
      }
    }
  }

  const dates = getThisWeekDates();

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${BANNER_TYPES[type]} 신청 상세 페이지` },
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
        action_id: "open_monthly_calendar",
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
    // 🔥 KST 기준 UTC 메서드 사용
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const yyyyMMdd = `${y}-${m}-${d}`;

    const dayItems = calendarData.filter(
      (item) => item.startDate <= yyyyMMdd && item.endDate >= yyyyMMdd
    );

    let lines;

    if (isInterest) {
      const allLines = INTEREST_TAB_OPTIONS.map((tab) => {
        const found = dayItems.find(item => item.desiredTab === tab.value);
        const name = found ? (creatorNames[found.createdBy] || "—") : "—";
        return { label: tab.label, value: found ? name : "—" };
      });
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
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "📋 전체" }, action_id: "filter_my_all", style: !type ? "primary" : undefined },
        { type: "button", text: { type: "plain_text", text: "🏠 홈상단" }, action_id: "filter_my_home", style: type === "home" ? "primary" : undefined },
        { type: "button", text: { type: "plain_text", text: "📌 플로팅" }, action_id: "filter_my_floating", style: type === "floating" ? "primary" : undefined },
        { type: "button", text: { type: "plain_text", text: "⭐ 관심그룹" }, action_id: "filter_my_interest", style: type === "interest" ? "primary" : undefined },
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

      let displayName = item.banner;
      if (item._type === "interest") {
        displayName = getDesiredTabLabel(item.desiredTab);
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

app.action("filter_my_all", async ({ ack, body }) => {
  await ack();
  publishMyReservations(body.user.id, null).catch(e => console.log("filter_my_all 실패:", e.message));
});

app.action("filter_my_home", async ({ ack, body }) => {
  await ack();
  publishMyReservations(body.user.id, "home").catch(e => console.log("filter_my_home 실패:", e.message));
});

app.action("filter_my_floating", async ({ ack, body }) => {
  await ack();
  publishMyReservations(body.user.id, "floating").catch(e => console.log("filter_my_floating 실패:", e.message));
});

app.action("filter_my_interest", async ({ ack, body }) => {
  await ack();
  publishMyReservations(body.user.id, "interest").catch(e => console.log("filter_my_interest 실패:", e.message));
});

/* ======================================================
 * 모달 내 입력 요소 액션 (ack만 처리)
 * ====================================================== */
const modalActionIds = [
  "media_type", "product_type", "purpose",
  "desired_tab", "start_date", "end_date",
  "link_type", "link_data", "landing_page",
  "banner", "banner_desc",
];

modalActionIds.forEach(actionId => {
  app.action(actionId, async ({ ack }) => {
    await ack();
  });
});

// 🔥 URL 버튼 클릭 ack 처리
app.action("open_monthly_calendar", async ({ ack }) => {
  await ack();
});

/* ======================================================
 * 🔥 등록/수정 모달 블록 빌더
 * ====================================================== */

function buildModalBlocks(type, item) {
  const isInterest = type === "interest";
  const isEdit = !!item;
  const blocks = [];

  // ── 매체유형 ──
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
    mediaTypeElement.initial_option = { text: { type: "plain_text", text: mtLabel }, value: item.mediaType };
  } else {
    mediaTypeElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "media_type_block",
    label: { type: "plain_text", text: "매체유형" },
    hint: { type: "plain_text", text: "• 주간스케줄&월간캘린더는 [공통, 나무]로 선택한 항목만 보여집니다.\n• [공통, N2]로 선택 시 해당 내용은 관리자페이지를 통해\n  N2 담당자(現 방영권 부장님)께 전달됩니다.\n• N2 최종 등록 여부는 매체사정에 따라 변동될 수 있으므로 개별 확인 부탁드립니다." },
    element: mediaTypeElement,
  });

  // ── 배너명 (interest 제외) ──
  if (!isInterest) {
    const bannerLabel = type === "home"
      ? "배너명 (볼드체로 표시되는 최상단 문장. 10~16자)"
      : "배너명 (윗줄 10~12자, 아랫줄 5~9자, 줄바꿈 희망 시 심볼 '\\n' 을 넣어주세요)";
    const bannerHint = type === "home"
      ? "ex) 이제 퇴직연금도 ELS!"
      : "ex) 미션 달성하고 달러받자\\n미국주식챌린지";

    blocks.push({
      type: "input",
      block_id: "banner_block",
      label: { type: "plain_text", text: bannerLabel },
      hint: { type: "plain_text", text: bannerHint },
      element: {
        type: "plain_text_input",
        action_id: "banner",
        multiline: type === "floating",
        ...(isEdit ? { initial_value: item.banner || "" } : {}),
        placeholder: { type: "plain_text", text: "배너명을 입력하세요" },
      },
    });
  }

  // ── 배너내용 (interest 제외) ──
  if (!isInterest) {
    const descLabel = type === "home"
      ? "서브타이틀 (두번째 줄에 표기되는 문장. 8~19자)"
      : "배너내용 (7~12글자, 줄바꿈 불가)";
    const descHint = type === "home"
      ? "ex) ELS 가입하고 이벤트 혜택까지"
      : "ex) 24시간 챌린지 참여하기";

    blocks.push({
      type: "input",
      block_id: "banner_desc_block",
      label: { type: "plain_text", text: descLabel },
      hint: { type: "plain_text", text: descHint },
      element: {
        type: "plain_text_input",
        action_id: "banner_desc",
        ...(isEdit ? { initial_value: item.bannerDesc || "" } : {}),
        placeholder: { type: "plain_text", text: "배너내용을 입력하세요" },
      },
    });
  }

  // ── 상품구분 ──
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
    ptElement.initial_option = { text: { type: "plain_text", text: ptLabel }, value: item.productType };
  } else {
    ptElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "product_type_block",
    label: { type: "plain_text", text: "상품구분" },
    element: ptElement,
  });

  // ── 목적 ──
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
    purposeElement.initial_option = { text: { type: "plain_text", text: purLabel }, value: item.purpose };
  } else {
    purposeElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "purpose_block",
    label: { type: "plain_text", text: "목적" },
    element: purposeElement,
  });

  // ── 희망 탭 (interest만) ──
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
      dtElement.initial_option = { text: { type: "plain_text", text: dtLabel }, value: item.desiredTab };
    } else {
      dtElement.placeholder = { type: "plain_text", text: "선택하세요" };
    }
    blocks.push({
      type: "input",
      block_id: "desired_tab_block",
      label: { type: "plain_text", text: "희망 탭" },
      element: dtElement,
    });
  }

  // ── 노출시작 희망일자 ──
  blocks.push({
    type: "input",
    block_id: "start_date_block",
    label: { type: "plain_text", text: "노출시작 희망일자" },
    hint: { type: "plain_text", text: "오늘 포함 이후로만 등록이 가능합니다." },
    element: {
      type: "datepicker",
      action_id: "start_date",
      ...(isEdit && item.startDate ? { initial_date: item.startDate } : {}),
    },
  });

  // ── 노출종료 희망일자 ──
  blocks.push({
    type: "input",
    block_id: "end_date_block",
    label: { type: "plain_text", text: "노출종료 희망일자" },
    hint: { type: "plain_text", text: "• 고객피로도 조절 차원에서 노출 기간이 제한됩니다.\n  (홈상단/관심그룹탭 15일, 플로팅 3일)\n• 그 이상을 원하실 경우 추가로 배너를 등록해주세요" },
    element: {
      type: "datepicker",
      action_id: "end_date",
      ...(isEdit && item.endDate ? { initial_date: item.endDate } : {}),
    },
  });

  // ── 바로가기속성 ──
  const linkOptions = isInterest
    ? [
        { text: { type: "plain_text", text: "URL[배너형]" }, value: "url" },
        { text: { type: "plain_text", text: "화면[배너형]" }, value: "screen" },
      ]
    : LINK_TYPE_OPTIONS.map(o => ({
        text: { type: "plain_text", text: o.label },
        value: o.value,
      }));

  const ltElement = {
    type: "static_select",
    action_id: "link_type",
    options: linkOptions,
  };

  if (isEdit && item.linkType) {
    const validValues = linkOptions.map(o => o.value);
    if (validValues.includes(item.linkType)) {
      const ltLabel = linkOptions.find(o => o.value === item.linkType)?.text.text || item.linkType;
      ltElement.initial_option = { text: { type: "plain_text", text: ltLabel }, value: item.linkType };
    }
  }
  if (!ltElement.initial_option) {
    ltElement.placeholder = { type: "plain_text", text: "선택하세요" };
  }
  blocks.push({
    type: "input",
    block_id: "link_type_block",
    label: { type: "plain_text", text: "바로가기속성" },
    hint: { type: "plain_text", text: isInterest
      ? "URL[배너형] 또는 화면[배너형]을 선택하세요."
      : "• 화면오픈(MTS화면), 팝업오픈(이벤트/공지/콘텐츠), URL(외부페이지)" },
    element: ltElement,
  });

  // ── 바로가기링크 ──
  blocks.push({
    type: "input",
    block_id: "link_data_block",
    optional: true,
    label: { type: "plain_text", text: "바로가기링크" },
    element: {
      type: "plain_text_input",
      action_id: "link_data",
      ...(isEdit && item.linkData ? { initial_value: item.linkData } : {}),
      placeholder: { type: "plain_text", text: isInterest
        ? "링크를 입력하세요"
        : "하단 설명을 참고해서 입력해주세요." },
    },
  });
  blocks.push({
    type: "context",
    elements: [{
      type: "mrkdwn",
      text: isInterest
        ? "• 화면[배너형]: 화면번호 입력 (ex: X08m5132)\n• URL[배너형]: 외부 URL 입력"
        : "• 화면오픈(MTS화면): 화면번호 입력 (ex: X08m5132)\n• 팝업오픈(이벤트): X12m921g 자동입력됨 — 비워두세요\n• 팝업오픈(공지사항): X12m921a 자동입력됨 — 비워두세요\n• 팝업오픈(콘텐츠): X08m5132 자동입력됨 — 비워두세요\n• URL(외부페이지): 외부 URL 입력",
    }],
  });

  // ── 랜딩페이지 (interest 제외) ──
  if (!isInterest) {
    blocks.push({
      type: "input",
      block_id: "landing_page_block",
      optional: true,
      label: { type: "plain_text", text: "랜딩페이지" },
      element: {
        type: "plain_text_input",
        action_id: "landing_page",
        ...(isEdit && item.landingPage ? { initial_value: item.landingPage } : {}),
        placeholder: { type: "plain_text", text: "하단 설명을 참고해서 입력해주세요." },
      },
    });
    blocks.push({
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: "• 팝업오픈(이벤트): E^000 자동입력됨 — 비워두세요\n• 팝업오픈(공지사항): N^0000 자동입력됨 — 비워두세요\n• 팝업오픈(콘텐츠): 모바일URL 입력 (랜딩페이지)\n• 그 외: 입력불요 (자동 공란)\n• 랜딩페이지를 모를 경우 코어뱅킹UX부에 문의 부탁드리며,\n  그 외 문의는 담당자(김수연 주임)에게 문의해주세요",
      }],
    });
  }

  // ── 배너이미지파일 (공지 텍스트만, 입력창 없음) ──
  blocks.push({
    type: "section",
    block_id: "image_notice_block",
    text: {
      type: "mrkdwn",
      text: "*배너이미지파일*\n 배너 노출 4일 전 DM을 통해 알람이 갈 예정입니다.\n알람을 받으실 경우 담당자(김수연 주임)에게 이미지 파일(png)을 전달해주세요.",
    },
  });

  return blocks;
}

function validateBannerText(type, banner, bannerDesc) {
  const errs = {};
  if (type === "home") {
    const len = banner.length;
    if (len < 10)      errs.banner_block = `최소 글자수에 ${10 - len}글자 부족합니다`;
    else if (len > 16) errs.banner_block = `글자수 제한을 ${len - 16}글자 초과하였습니다`;

    const dLen = bannerDesc.length;
    if (dLen < 8)      errs.banner_desc_block = `최소 글자수에 ${8 - dLen}글자 부족합니다`;
    else if (dLen > 19) errs.banner_desc_block = `글자수 제한을 ${dLen - 19}글자 초과하였습니다`;
  }
  if (type === "floating") {
    const lines = banner.split("\\n");
    const line1 = lines[0] || "";
    const line2 = lines[1] ?? null;

    const msgs = [];
    if (line1.length < 10)      msgs.push(`윗줄 최소 글자수에 ${10 - line1.length}글자 부족합니다`);
    else if (line1.length > 12) msgs.push(`윗줄 글자수 제한을 ${line1.length - 12}글자 초과하였습니다`);

    if (line2 !== null) {
      if (line2.length < 5)      msgs.push(`아랫줄 최소 글자수에 ${5 - line2.length}글자 부족합니다`);
      else if (line2.length > 9) msgs.push(`아랫줄 글자수 제한을 ${line2.length - 9}글자 초과하였습니다`);
    }
    if (msgs.length > 0) errs.banner_block = msgs.join(" / ");

    const dLen = bannerDesc.length;
    if (dLen < 7)      errs.banner_desc_block = `최소 글자수에 ${7 - dLen}글자 부족합니다`;
    else if (dLen > 12) errs.banner_desc_block = `글자수 제한을 ${dLen - 12}글자 초과하였습니다`;
  }
  return errs;
}

/* ======================================================
 * 🔥 등록/수정 시 바로가기속성에 따른 자동입력 처리
 * ====================================================== */

function applyLinkAutoFill(linkType, userLinkData, userLandingPage) {
  let finalLinkData = userLinkData || "";
  let finalLandingPage = userLandingPage || "";

  const autoFill = LINK_AUTO_FILL[linkType];
  if (autoFill) {
    finalLinkData = autoFill.linkData;
    if (autoFill.landingPage) {
      finalLandingPage = autoFill.landingPage;
    }
  }

  if (linkType === "screen_mts" || linkType === "url_external") {
    finalLandingPage = "";
  }

  return { linkData: finalLinkData, landingPage: finalLandingPage };
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
    if (!isInterest) {
      const bannerVal = v.banner_block?.banner?.value || "";
      const bannerDescVal = v.banner_desc_block?.banner_desc?.value || "";
      const textErrors = validateBannerText(type, bannerVal, bannerDescVal);
      Object.assign(errors, textErrors);
    }

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: "errors", errors });
      return;
    }

    await ack();

    const mediaType = v.media_type_block.media_type.selected_option?.value || "";
    const isN2 = mediaType === "n2";
    const linkType = v.link_type_block.link_type.selected_option?.value || "";

    const userLinkData = v.link_data_block?.link_data?.value || "";
    const userLandingPage = isInterest ? "" : (v.landing_page_block?.landing_page?.value || "");
    const { linkData, landingPage } = isInterest
      ? { linkData: userLinkData, landingPage: "" }
      : applyLinkAutoFill(linkType, userLinkData, userLandingPage);

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
      desiredTabCustom: "",
      startDate,
      endDate,
      linkType,
      linkUrl: "",
      linkData,
      landingPage,
      createdBy: body.user.id,
      createdAt: new Date().toISOString(),
    };

    await addBannerItem(type, newItem);

    if (ADMIN_USER_IDS.length > 0) {
      try {
        const displayName = isInterest
          ? getDesiredTabLabel(newItem.desiredTab)
          : newItem.banner || "—";
        const userName = await getSlackUserName(body.user.id);
        const adminText =
          `📬 새 배너가 등록되었습니다.\n\n` +
          `• 유형: ${BANNER_TYPES[type]}\n` +
          `• 배너: ${displayName}\n` +
          `• 기간: ${newItem.startDate} ~ ${newItem.endDate}\n` +
          `• 등록자: ${userName}`;
        for (const adminId of ADMIN_USER_IDS) {
          await app.client.chat.postMessage({ channel: adminId, text: adminText });
        }
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
  if (!isInterest) {
    const bannerVal = v.banner_block?.banner?.value || "";
    const bannerDescVal = v.banner_desc_block?.banner_desc?.value || "";
    const textErrors = validateBannerText(type, bannerVal, bannerDescVal);
    Object.assign(errors, textErrors);
  }

  if (Object.keys(errors).length > 0) {
    await ack({ response_action: "errors", errors });
    return;
  }

  await ack();

  const mediaType = v.media_type_block.media_type.selected_option?.value || "";
  const isN2 = mediaType === "n2";
  const linkType = v.link_type_block.link_type.selected_option?.value || "";

  const userLinkData = v.link_data_block?.link_data?.value || "";
  const userLandingPage = isInterest ? "" : (v.landing_page_block?.landing_page?.value || "");
  const { linkData, landingPage } = isInterest
    ? { linkData: userLinkData, landingPage: "" }
    : applyLinkAutoFill(linkType, userLinkData, userLandingPage);

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
    linkType,
    linkData,
    landingPage,
    priority: isN2 ? null : undefined,
    updatedAt: new Date().toISOString(),
  };

  if (isInterest) {
    updates.desiredTab = v.desired_tab_block?.desired_tab?.selected_option?.value || "";
    updates.desiredTabCustom = "";
  } else {
    updates.banner = v.banner_block?.banner?.value || "";
    updates.bannerDesc = v.banner_desc_block?.banner_desc?.value || "";
  }

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
 * 🔔 4일 전 리마인더 DM
 * ====================================================== */

let lastReminderCheckDate = "";

async function checkReminders() {
  try {
    const todayStr = getTodayKST();
    if (lastReminderCheckDate === todayStr) return;
    lastReminderCheckDate = todayStr;

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
            const reminderText = `📢 *"${displayName}"* 노출 시작 4일 전입니다.\n담당자(김수연 주임)에게 이미지 파일(png)을 전달해주세요.`;

            await app.client.chat.postMessage({ channel: item.createdBy, text: reminderText });

            for (const adminId of ADMIN_USER_IDS) {
              if (adminId !== item.createdBy) {
                await app.client.chat.postMessage({ channel: adminId, text: reminderText });
              }
            }
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

  setInterval(checkReminders, 60 * 60 * 1000);
  setTimeout(checkReminders, 15000);
})();
