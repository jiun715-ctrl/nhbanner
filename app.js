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
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch(err => console.log("❌ MongoDB 연결 실패:", err.message));

const bannerSchema = new mongoose.Schema({
  id: String,
  priority: Number,
  eventCode: String,
  bannerType: String,
  mediaType: String,
  banner: String,
  bannerDesc: String,
  startDate: String,
  endDate: String,
  linkType: String,
  linkUrl: String,
  linkData: String,
  createdBy: String,
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

/* ======================================================
 * MongoDB 유틸
 * ====================================================== */

async function loadBannerData(type) {
  try {
    const model = BannerModel[type];
    if (!model) return [];

    const docs = await model.find({}).lean();

    return docs.map((doc, index) => ({
      ...doc,
      id: doc.id || doc._id.toString(),
      priority: doc.priority ?? (index + 1),
    }));
  } catch (e) {
    console.log(`❌ loadBannerData(${type}) 실패:`, e.message);
    return [];
  }
}

async function saveBannerData(type, data) {
  try {
    const model = BannerModel[type];
    if (!model) return;

    await model.deleteMany({});
    if (data.length > 0) {
      await model.insertMany(data);
    }
    console.log(`✅ saveBannerData(${type}) 저장 완료: ${data.length}건`);
  } catch (e) {
    console.log(`❌ saveBannerData(${type}) 실패:`, e.message);
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
  const newPriority =
    updatedData.priority !== undefined
      ? Number(updatedData.priority)
      : oldPriority;

  /* ===============================
     우선순위 재정렬
  =============================== */
  if (newPriority !== oldPriority) {
    list.forEach((item) => {
      if (item.id === id) return;

      if (newPriority < oldPriority) {
        if (item.priority >= newPriority && item.priority < oldPriority) {
          item.priority += 1;
        }
      } else {
        if (item.priority <= newPriority && item.priority > oldPriority) {
          item.priority -= 1;
        }
      }
    });
  }

  /* ===============================
     전체 필드 업데이트
  =============================== */
  const safeUpdate = {};
  const updateKeys = [
    "eventCode", "bannerType", "mediaType", "banner",
    "bannerDesc", "startDate", "endDate", "linkType",
    "linkUrl", "linkData"
  ];

  updateKeys.forEach(key => {
    if (updatedData[key] !== undefined) {
      safeUpdate[key] = updatedData[key];
    }
  });

  list[index] = {
    ...oldItem,
    ...safeUpdate,
    priority: newPriority,
    updatedAt: new Date().toISOString(),
  };

  await saveBannerData(type, list);

  /* ===============================
    Slack 알림 (진짜 변경된 항목만)
  =============================== */
  try {
    const LABEL_MAP = {
      priority: "우선순위",
      startDate: "노출시작일",
      endDate: "노출종료일",
      banner: "배너명",
      bannerDesc: "배너내용",
      bannerType: "배너구분",
      mediaType: "매체유형",
      linkType: "바로가기속성",
      linkUrl: "링크",
      linkData: "링크데이터",
      eventCode: "이벤트코드",
    };

    const changedDetails = [];

    Object.keys(LABEL_MAP).forEach((key) => {
      const before = oldItem[key] ?? "";
      const after = list[index][key] ?? "";

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

  /* ===============================
     🔥 Slack 화면 전체 유저 갱신
  =============================== */
  try {
    const uniqueUsers = [...new Set(list.map(i => i.createdBy))];
    console.log("🔄 Slack 갱신 대상 유저:", uniqueUsers);

    for (const userId of uniqueUsers) {
      try {
        await publishBannerMain(userId, type);
        console.log(`✅ publishBannerMain 성공: ${userId}`);
        await publishMyReservations(userId, type);
        console.log(`✅ publishMyReservations 성공: ${userId}`);
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

  const newList = list.filter((item) => item.id !== id);

  newList
    .sort((a, b) => a.priority - b.priority)
    .forEach((item, idx) => {
      item.priority = idx + 1;
    });

  await saveBannerData(type, newList);

  /* ===============================
    Slack DM
  =============================== */
  try {
    await app.client.chat.postMessage({
      channel: target.createdBy,
      text: `⚠️ 관리자에 의해 *"${target.banner}"* 게시물이 삭제되었습니다.`,
    });
  } catch (e) {
    console.log("Slack DM 실패:", e.message);
  }

  /* ===============================
    🔥 Slack 화면 강제 갱신 (전체 유저)
  =============================== */
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
 * 홈 화면 (3개 버튼)
 * ====================================================== */

async function publishHome(userId) {
  await app.client.views.publish({
    user_id: userId,
    view: {
      type: "home",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📢 배너 스케줄 관리" },
        },
        { type: "divider" },
        {
          type: "actions",
          elements: Object.entries(BANNER_TYPES).map(([type, label]) => ({
            type: "button",
            text: { type: "plain_text", text: label },
            action_id: `open_banner_tab_${type}`,
            value: type,
          })),
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
        text: { type: "plain_text", text: "👤 내 예약 보기" },
        action_id: "my_reservations",
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
 * 내 예약 보기
 * ====================================================== */

async function publishMyReservations(userId, type) {
  const allData = await loadBannerData(type);
  const myList = allData.filter((item) => item.createdBy === userId);

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `👤 ${BANNER_TYPES[type]} 내 예약` },
    },
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "⬅ 돌아가기" },
          action_id: "back_to_banner_main",
          value: type,
        },
      ],
    },
    { type: "divider" },
  ];

  if (myList.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "등록한 예약이 없습니다." },
    });
  } else {
    myList.forEach((item) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${item.banner}*\n` +
            `${item.startDate} ~ ${item.endDate}\n` +
            `> ${item.bannerDesc || ""}`,
        },
      });

    blocks.push({
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "✏️ 수정" }, action_id: "edit_my_reservation", value: `${type}:${item.id}` },
          { type: "button", text: { type: "plain_text", text: "🗑 삭제" }, style: "danger", action_id: "delete_reservation", value: `${type}:${item.id}` },
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
  await publishHome(event.user);
});

Object.keys(BANNER_TYPES).forEach((type) => {
  app.action(`open_banner_tab_${type}`, async ({ ack, body }) => {
    await ack();
    await publishBannerMain(body.user.id, type);
  });
});

app.action("my_reservations", async ({ ack, body }) => {
  await ack();
  const type = body.actions?.[0]?.value;
  if (!type) return;
  await publishMyReservations(body.user.id, type);
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
          block_id: "event_code_block",
          label: { type: "plain_text", text: "타겟 이벤트코드" },
          element: {
            type: "plain_text_input",
            action_id: "event_code",
            initial_value: item.eventCode || "",
          },
        },
        {
          type: "input",
          block_id: "banner_type_block",
          label: { type: "plain_text", text: "배너구분" },
          element: {
            type: "static_select",
            action_id: "banner_type",
            initial_option: item.bannerType
              ? {
                  text: { type: "plain_text", text: {
                    "00": "00. 디폴트", "01": "01. 상단배너", "02": "02. 서비스배너",
                    "03": "03. 플로팅배너", "04": "04. 이벤트공지", "05": "05. 로그아웃배너"
                  }[item.bannerType] || item.bannerType },
                  value: item.bannerType,
                }
              : undefined,
            options: [
              { text: { type: "plain_text", text: "00. 디폴트" }, value: "00" },
              { text: { type: "plain_text", text: "01. 상단배너" }, value: "01" },
              { text: { type: "plain_text", text: "02. 서비스배너" }, value: "02" },
              { text: { type: "plain_text", text: "03. 플로팅배너" }, value: "03" },
              { text: { type: "plain_text", text: "04. 이벤트공지" }, value: "04" },
              { text: { type: "plain_text", text: "05. 로그아웃배너" }, value: "05" },
            ],
          },
        },
        {
          type: "input",
          block_id: "media_type_block",
          label: { type: "plain_text", text: "매체유형" },
          element: {
            type: "static_select",
            action_id: "media_type",
            initial_option: item.mediaType
              ? {
                  text: { type: "plain_text", text: item.mediaType === "tree" ? "나무" : "N2" },
                  value: item.mediaType,
                }
              : undefined,
            options: [
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
          label: { type: "plain_text", text: "바로가기링크(선택사항)" },
          element: {
            type: "plain_text_input",
            action_id: "link_url",
            initial_value: item.linkUrl || "",
          },
        },
        {
          type: "input",
          block_id: "link_data_block",
          optional: true,
          label: { type: "plain_text", text: "바로가기링크데이터(선택사항)" },
          element: {
            type: "plain_text_input",
            action_id: "link_data",
            initial_value: item.linkData || "",
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

  const list = await loadBannerData(type);
  
  const newList = list.filter(item => item.id !== id);

  newList.sort((a, b) => a.priority - b.priority)
    .forEach((item, idx) => { item.priority = idx + 1; });

  await saveBannerData(type, newList);
  await publishMyReservations(userId, type);
});

app.action("back_to_banner_main", async ({ ack, body }) => {
  await ack();
  const type = body.actions?.[0]?.value;
  if (!type) return;
  await publishBannerMain(body.user.id, type);
});

app.action("go_home", async ({ ack, body }) => {
  await ack();
  await publishHome(body.user.id);
});

/* ======================================================
 * 등록 모달
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
            block_id: "event_code_block",
            label: { type: "plain_text", text: "타겟 이벤트코드" },
            element: {
              type: "plain_text_input",
              action_id: "event_code",
              placeholder: { type: "plain_text", text: "* ex) NMSV01" },
            },
          },
          {
            type: "input",
            block_id: "banner_type_block",
            label: { type: "plain_text", text: "배너구분" },
            element: {
              type: "static_select",
              action_id: "banner_type",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
                { text: { type: "plain_text", text: "00. 디폴트" }, value: "00" },
                { text: { type: "plain_text", text: "01. 상단배너" }, value: "01" },
                { text: { type: "plain_text", text: "02. 서비스배너" }, value: "02" },
                { text: { type: "plain_text", text: "03. 플로팅배너" }, value: "03" },
                { text: { type: "plain_text", text: "04. 이벤트공지" }, value: "04" },
                { text: { type: "plain_text", text: "05. 로그아웃배너" }, value: "05" },
              ],
            },
          },
          {
            type: "input",
            block_id: "media_type_block",
            label: { type: "plain_text", text: "매체유형" },
            element: {
              type: "static_select",
              action_id: "media_type",
              placeholder: { type: "plain_text", text: "선택하세요" },
              options: [
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
            label: { type: "plain_text", text: "바로가기링크(선택사항)" },
            element: {
              type: "plain_text_input",
              action_id: "link_url",
            },
          },
          {
            type: "input",
            block_id: "link_data_block",
            optional: true,
            label: { type: "plain_text", text: "바로가기링크데이터(선택사항)" },
            element: {
              type: "plain_text_input",
              action_id: "link_data",
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

    list.push({
      id: Date.now().toString(),
      priority: maxPriority + 1,
      eventCode: v.event_code_block.event_code.value,
      bannerType: v.banner_type_block.banner_type.selected_option?.value || "",
      mediaType: v.media_type_block.media_type.selected_option?.value || "",
      banner: v.banner_block.banner.value,
      bannerDesc: v.banner_desc_block.banner_desc.value,
      startDate: v.start_date_block.start_date.selected_date,
      endDate: v.end_date_block.end_date.selected_date,
      linkType: v.link_type_block.link_type.selected_option?.value || "",
      linkUrl: v.link_url_block?.link_url?.value || "",
      linkData: v.link_data_block?.link_data?.value || "",
      createdBy: body.user.id,
      createdAt: new Date().toISOString(),
    });

    await saveBannerData(type, list);
    await publishBannerMain(body.user.id, type);
  });
});

app.view(/edit_modal_(.*)/, async ({ ack, view, body }) => {
  await ack();

  const { id, type } = JSON.parse(view.private_metadata);
  const v = view.state.values;

  const list = await loadBannerData(type);
  const index = list.findIndex((i) => i.id === id);
  if (index === -1) return;

  list[index] = {
    ...list[index],
    eventCode: v.event_code_block.event_code.value,
    bannerType: v.banner_type_block.banner_type.selected_option?.value || list[index].bannerType,
    mediaType: v.media_type_block.media_type.selected_option?.value || list[index].mediaType,
    banner: v.banner_block.banner.value,
    bannerDesc: v.banner_desc_block.banner_desc.value,
    startDate: v.start_date_block.start_date.selected_date,
    endDate: v.end_date_block.end_date.selected_date,
    linkType: v.link_type_block.link_type.selected_option?.value || list[index].linkType,
    linkUrl: v.link_url_block?.link_url?.value || "",
    linkData: v.link_data_block?.link_data?.value || "",
    updatedAt: new Date().toISOString(),
  };

  await saveBannerData(type, list);
  await publishBannerMain(body.user.id, type);
  await publishMyReservations(body.user.id, type);
});

/* ======================================================
 * 서버 실행
 * ====================================================== */

(async () => {
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack App 실행중 (port ${PORT})`);
})();