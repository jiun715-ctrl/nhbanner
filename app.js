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

/* 🔥 WEB_BASE_URL 안전 방어 */
const BASE_URL =
  process.env.WEB_BASE_URL && process.env.WEB_BASE_URL.startsWith("http")
    ? process.env.WEB_BASE_URL
    : "http://localhost:3001";

console.log("🌐 WEB BASE URL:", BASE_URL);

/* ======================================================
 * 배너 타입 설정
 * ====================================================== */

const BANNER_TYPES = {
  home: "🏠 홈배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
};

// 🔥 타입별 배너구분 자동 매핑
const BANNER_TYPE_AUTO = {
  home: "01",
  floating: "03",
  interest: "00",
};

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
      clean.priority = clean.priority ?? (index + 1);
      return clean;
    });
  } catch (e) {
    console.log(`❌ loadBannerData(${type}) 실패:`, e.message);
    return [];
  }
}

// 🔥 단건 추가
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

// 🔥 단건 수정
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

// 🔥 단건 삭제
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

// 🔥 우선순위 일괄 업데이트
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
  const newPriority =
    updatedData.priority !== undefined
      ? Number(updatedData.priority)
      : oldPriority;

  const safeUpdate = {};
  const updateKeys = [
    "eventCode", "bannerType", "mediaType", "banner",
    "bannerDesc", "productType", "purpose", "startDate", "endDate", "linkType",
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

  if (newPriority !== oldPriority) {
    const reloadedList = await loadBannerData(type);
    const priorityMap = [];
    reloadedList
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.id === id) return -1;
        if (b.id === id) return 1;
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
          `📢 관리자에 의해 *"${oldItem.banner}"* 게시물이 수정되었습니다.\n\n` +
          `🔎 변경된 항목:\n\n` +
          changedDetails.join("\n\n"),
      });
    }
  } catch (e) {
    console.log("Slack DM 실패:", e.message);
  }

  if (newPriority !== oldPriority) {
    try {
      for (const item of updatedList) {
        if (item.id === id) continue;
        const oldP = oldPriorityMap[item.id];
        const newP = item.priority;
        if (oldP !== undefined && oldP !== newP) {
          await app.client.chat.postMessage({
            channel: item.createdBy,
            text:
              `📢 관리자에 의해 *"${item.banner}"* 게시물의 우선순위가 변경되었습니다.\n\n` +
              `• 우선순위\n   ${oldP} → ${newP}`,
          });
        }
      }
    } catch (e) {
      console.log("우선순위 변경 DM 실패:", e.message);
    }
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

  const newList = await loadBannerData(type);
  const priorityMap = [];
  newList
    .sort((a, b) => a.priority - b.priority)
    .forEach((item, idx) => {
      if (item.priority !== idx + 1) {
        priorityMap.push({ id: item.id, priority: idx + 1 });
      }
    });
  if (priorityMap.length > 0) {
    await updatePriorities(type, priorityMap);
  }

  try {
    await app.client.chat.postMessage({
      channel: target.createdBy,
      text: `⚠️ 관리자에 의해 *"${target.banner}"* 게시물이 삭제되었습니다.`,
    });
  } catch (e) {
    console.log("Slack DM 실패:", e.message);
  }

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

/* ======================================================
 * Slack 유저명 캐시
 * ====================================================== */
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
 * 날짜 유틸 (주간리스트용)
 * ====================================================== */

function formatMMDD(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
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
 * 홈 화면 (4개 버튼)
 * ====================================================== */

async function publishHome(userId) {
  await app.client.views.publish({
    user_id: userId,
    view: {
      type: "home",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📢 배너 스케줄 등록하기" },
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
              text: { type: "plain_text", text: "🔐 관리자전용" },
              action_id: "open_admin_password",
              style: "danger",
            },
          ],
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

  const dates = getThisWeekDates();
  const ranks = Array.from({ length: 7 }, (_, i) => i + 1);

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

    const dayItems = allData.filter(
      (item) => item.startDate <= yyyyMMdd && item.endDate >= yyyyMMdd
    );

    const sorted = [...dayItems].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0)
    );

    const lines = ranks.map((rank) => {
      const found = sorted[rank - 1];
      const label = rank <= 5 ? `${rank}순위` : `대기 ${rank - 5}`;
      return found ? `${label}  ${found.banner}` : `${label} —`;
    });

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
 * 내 예약 보기 (전체/탭별 겸용)
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
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${item.banner}*  |  ${typeLabel}\n` +
            `${item.startDate} ~ ${item.endDate}\n` +
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
      blocks: [
        {
          type: "input",
          block_id: "media_type_block",
          label: { type: "plain_text", text: "매체유형" },
          element: {
            type: "static_select",
            action_id: "media_type",
            initial_option: item.mediaType
              ? {
                  text: { type: "plain_text", text: {
                    "common": "공통", "tree": "나무", "n2": "N2"
                  }[item.mediaType] || item.mediaType },
                  value: item.mediaType,
                }
              : undefined,
            options: [
              { text: { type: "plain_text", text: "공통" }, value: "common" },
              { text: { type: "plain_text", text: "나무" }, value: "tree" },
              { text: { type: "plain_text", text: "N2" }, value: "n2" },
            ],
          },
        },
        {
          type: "input",
          block_id: "banner_block",
          label: { type: "plain_text", text: "배너명" },
          element: {
            type: "plain_text_input",
            action_id: "banner",
            initial_value: item.banner || "",
            placeholder: { type: "plain_text", text: "플로팅 배너인 경우 반드시 줄바꿈 심볼을 넣어주세요. ex. 트래블월렛 '여행자금 모으기'/n서비스 소개'" },
          },
        },
        {
          type: "input",
          block_id: "banner_desc_block",
          label: { type: "plain_text", text: "배너내용" },
          element: {
            type: "plain_text_input",
            action_id: "banner_desc",
            multiline: true,
            initial_value: item.bannerDesc || "",
            placeholder: { type: "plain_text", text: "이제 환전 걱정할 필요 없어요" },
          },
        },
        {
          type: "input",
          block_id: "product_type_block",
          label: { type: "plain_text", text: "상품구분" },
          element: {
            type: "static_select",
            action_id: "product_type",
            initial_option: item.productType
              ? {
                  text: { type: "plain_text", text: {
                    "domestic_stock": "국내주식", "foreign_stock": "해외주식",
                    "both_stock": "국내/해외주식", "financial": "금융상품",
                    "pension": "연금", "etc": "기타"
                  }[item.productType] || item.productType },
                  value: item.productType,
                }
              : undefined,
            placeholder: { type: "plain_text", text: "선택하세요" },
            options: [
              { text: { type: "plain_text", text: "국내주식" }, value: "domestic_stock" },
              { text: { type: "plain_text", text: "해외주식" }, value: "foreign_stock" },
              { text: { type: "plain_text", text: "국내/해외주식" }, value: "both_stock" },
              { text: { type: "plain_text", text: "금융상품" }, value: "financial" },
              { text: { type: "plain_text", text: "연금" }, value: "pension" },
              { text: { type: "plain_text", text: "기타" }, value: "etc" },
            ],
          },
        },
        {
          type: "input",
          block_id: "purpose_block",
          label: { type: "plain_text", text: "목적" },
          element: {
            type: "static_select",
            action_id: "purpose",
            initial_option: item.purpose
              ? {
                  text: { type: "plain_text", text: {
                    "sales_marketing": "세일즈마케팅", "info": "정보제공(제도 등)",
                    "service": "서비스활성화", "etc": "기타"
                  }[item.purpose] || item.purpose },
                  value: item.purpose,
                }
              : undefined,
            placeholder: { type: "plain_text", text: "선택하세요" },
            options: [
              { text: { type: "plain_text", text: "세일즈마케팅" }, value: "sales_marketing" },
              { text: { type: "plain_text", text: "정보제공(제도 등)" }, value: "info" },
              { text: { type: "plain_text", text: "서비스활성화" }, value: "service" },
              { text: { type: "plain_text", text: "기타" }, value: "etc" },
            ],
          },
        },
        {
          type: "input",
          block_id: "start_date_block",
          label: { type: "plain_text", text: "노출시작 희망일자" },
          element: {
            type: "datepicker",
            action_id: "start_date",
            initial_date: item.startDate,
          },
        },
        {
          type: "input",
          block_id: "end_date_block",
          label: { type: "plain_text", text: "노출종료 희망일자" },
          element: {
            type: "datepicker",
            action_id: "end_date",
            initial_date: item.endDate,
          },
        },
        {
          type: "input",
          block_id: "link_type_block",
          label: { type: "plain_text", text: "바로가기속성" },
          element: {
            type: "static_select",
            action_id: "link_type",
            initial_option: item.linkType
              ? {
                  text: { type: "plain_text", text: {
                    "screen": "화면오픈", "popup": "팝업오픈",
                    "frame_popup": "프레임팝업", "url": "URL"
                  }[item.linkType] || item.linkType },
                  value: item.linkType,
                }
              : undefined,
            options: [
              { text: { type: "plain_text", text: "화면오픈" }, value: "screen" },
              { text: { type: "plain_text", text: "팝업오픈" }, value: "popup" },
              { text: { type: "plain_text", text: "프레임팝업" }, value: "frame_popup" },
              { text: { type: "plain_text", text: "URL" }, value: "url" },
            ],
          },
        },
        {
          type: "input",
          block_id: "link_url_block",
          optional: true,
          label: { type: "plain_text", text: "이벤트이미지url" },
          element: {
            type: "plain_text_input",
            action_id: "link_url",
            initial_value: item.linkUrl || "",
            placeholder: { type: "plain_text", text: "노출 4일 전 알림이 갈 예정입니다. 알림을 받으실 경우 실제 링크를 입력해주세요." },
          },
        },
      ],
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

    const newList = await loadBannerData(type);
    const priorityMap = [];
    newList
      .sort((a, b) => a.priority - b.priority)
      .forEach((item, idx) => {
        if (item.priority !== idx + 1) {
          priorityMap.push({ id: item.id, priority: idx + 1 });
        }
      });
    if (priorityMap.length > 0) {
      await updatePriorities(type, priorityMap);
    }

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
 * 등록 모달 (매체유형: 공통/나무/N2)
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
        blocks: [
          {
            type: "input",
            block_id: "media_type_block",
            label: { type: "plain_text", text: "매체유형" },
            element: {
              type: "static_select",
              action_id: "media_type",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
                { text: { type: "plain_text", text: "공통" }, value: "common" },
                { text: { type: "plain_text", text: "나무" }, value: "tree" },
                { text: { type: "plain_text", text: "N2" }, value: "n2" },
              ],
            },
          },
          {
            type: "input",
            block_id: "banner_block",
            label: { type: "plain_text", text: "배너명" },
            element: {
              type: "plain_text_input",
              action_id: "banner",
              placeholder: { type: "plain_text", text: "플로팅 배너인 경우 반드시 줄바꿈 심볼을 넣어주세요. ex. 트래블월렛 '여행자금 모으기'/n서비스 소개'" },
            },
          },
          {
            type: "input",
            block_id: "banner_desc_block",
            label: { type: "plain_text", text: "배너내용" },
            element: {
              type: "plain_text_input",
              action_id: "banner_desc",
              multiline: true,
              placeholder: { type: "plain_text", text: "이제 환전 걱정할 필요 없어요" },
            },
          },
          {
            type: "input",
            block_id: "product_type_block",
            label: { type: "plain_text", text: "상품구분" },
            element: {
              type: "static_select",
              action_id: "product_type",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
                { text: { type: "plain_text", text: "국내주식" }, value: "domestic_stock" },
                { text: { type: "plain_text", text: "해외주식" }, value: "foreign_stock" },
                { text: { type: "plain_text", text: "국내/해외주식" }, value: "both_stock" },
                { text: { type: "plain_text", text: "금융상품" }, value: "financial" },
                { text: { type: "plain_text", text: "연금" }, value: "pension" },
                { text: { type: "plain_text", text: "기타" }, value: "etc" },
              ],
            },
          },
          {
            type: "input",
            block_id: "purpose_block",
            label: { type: "plain_text", text: "목적" },
            element: {
              type: "static_select",
              action_id: "purpose",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
                { text: { type: "plain_text", text: "세일즈마케팅" }, value: "sales_marketing" },
                { text: { type: "plain_text", text: "정보제공(제도 등)" }, value: "info" },
                { text: { type: "plain_text", text: "서비스활성화" }, value: "service" },
                { text: { type: "plain_text", text: "기타" }, value: "etc" },
              ],
            },
          },
          {
            type: "input",
            block_id: "start_date_block",
            label: { type: "plain_text", text: "노출시작 희망일자" },
            element: {
              type: "datepicker",
              action_id: "start_date",
            },
          },
          {
            type: "input",
            block_id: "end_date_block",
            label: { type: "plain_text", text: "노출종료 희망일자" },
            element: {
              type: "datepicker",
              action_id: "end_date",
            },
          },
          {
            type: "input",
            block_id: "link_type_block",
            label: { type: "plain_text", text: "바로가기속성" },
            element: {
              type: "static_select",
              action_id: "link_type",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
                { text: { type: "plain_text", text: "화면오픈" }, value: "screen" },
                { text: { type: "plain_text", text: "팝업오픈" }, value: "popup" },
                { text: { type: "plain_text", text: "프레임팝업" }, value: "frame_popup" },
                { text: { type: "plain_text", text: "URL" }, value: "url" },
              ],
            },
          },
          {
            type: "input",
            block_id: "link_url_block",
            optional: true,
            label: { type: "plain_text", text: "이벤트이미지url" },
            element: {
              type: "plain_text_input",
              action_id: "link_url",
              placeholder: { type: "plain_text", text: "노출 4일 전 알림이 갈 예정입니다. 알림을 받으실 경우 실제 링크를 입력해주세요." },
            },
          },
        ],
      },
    });
  });

  app.view(`register_modal_${type}`, async ({ ack, view, body }) => {
    await ack();

    const v = view.state.values;
    const list = await loadBannerData(type);

    const maxPriority =
      list.length > 0
        ? Math.max(...list.map((i) => i.priority || 0))
        : 0;

    const newItem = {
      id: Date.now().toString(),
      priority: maxPriority + 1,
      eventCode: "",
      bannerType: BANNER_TYPE_AUTO[type] || "00",
      mediaType: v.media_type_block.media_type.selected_option?.value || "",
      banner: v.banner_block.banner.value,
      bannerDesc: v.banner_desc_block.banner_desc.value,
      productType: v.product_type_block.product_type.selected_option?.value || "",
      purpose: v.purpose_block.purpose.selected_option?.value || "",
      startDate: v.start_date_block.start_date.selected_date,
      endDate: v.end_date_block.end_date.selected_date,
      linkType: v.link_type_block.link_type.selected_option?.value || "",
      linkUrl: v.link_url_block?.link_url?.value || "",
      linkData: "",
      createdBy: body.user.id,
      createdAt: new Date().toISOString(),
    };

    await addBannerItem(type, newItem);
    publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
  });
});

app.view(/edit_modal_(.*)/, async ({ ack, view, body }) => {
  await ack();

  const { id, type } = JSON.parse(view.private_metadata);
  const v = view.state.values;

  await updateBannerItem(type, id, {
    mediaType: v.media_type_block.media_type.selected_option?.value || "",
    banner: v.banner_block.banner.value,
    bannerDesc: v.banner_desc_block.banner_desc.value,
    productType: v.product_type_block.product_type.selected_option?.value || "",
    purpose: v.purpose_block.purpose.selected_option?.value || "",
    startDate: v.start_date_block.start_date.selected_date,
    endDate: v.end_date_block.end_date.selected_date,
    linkType: v.link_type_block.link_type.selected_option?.value || "",
    linkUrl: v.link_url_block?.link_url?.value || "",
    updatedAt: new Date().toISOString(),
  });

  publishBannerMain(body.user.id, type).catch(e => console.log("publishBannerMain 실패:", e.message));
  publishMyReservations(body.user.id, type).catch(e => console.log("publishMyReservations 실패:", e.message));
});

/* ======================================================
 * 서버 실행
 * ====================================================== */

(async () => {
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack App 실행중 (port ${PORT})`);
})();