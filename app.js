/**
 * Banner Schedule Slack App (Multi Banner Type Version + Image Cache)
 */

require("dotenv").config();

const { App, ExpressReceiver } = require("@slack/bolt");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const puppeteer = require("puppeteer");

/* ======================================================
 * 기본 설정
 * ====================================================== */

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const CACHE_FILE = path.join(DATA_DIR, "calendarCache.json");

/* 🔥 WEB_BASE_URL 안전 방어 */
const BASE_URL =
  process.env.WEB_BASE_URL && process.env.WEB_BASE_URL.startsWith("http")
    ? process.env.WEB_BASE_URL
    : "http://localhost:3001";

console.log("🌐 WEB BASE URL:", BASE_URL);

// 수정 — 형식 검증 추가
function loadCache() {
    if (!fs.existsSync(CACHE_FILE)) {
        const empty = { home: "", floating: "", interest: "" };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(empty, null, 2));
        return empty;
    }

    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

    // 배열이거나 잘못된 형식이면 초기화
    if (Array.isArray(raw) || !raw.home === undefined) {
        const empty = { home: "", floating: "", interest: "" };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(empty, null, 2));
        return empty;
    }

    return raw;
}

function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

/* ======================================================
 * 배너 타입 설정
 * ====================================================== */

const BANNER_TYPES = {
  home: "🏠 홈배너",
  floating: "📌 플로팅배너",
  interest: "⭐ 관심그룹탭배너",
};

/* ======================================================
 * JSON 유틸
 * ====================================================== */

function getDataFile(type) {
  return path.join(DATA_DIR, `${type}.json`);
}

function loadBannerData(type) {
  const file = getDataFile(type);
  if (!fs.existsSync(file)) return [];

  let data = JSON.parse(fs.readFileSync(file, "utf8"));

  let needSave = false;

  data = data.map((item, index) => {
    if (!item.id) {
      item.id = Date.now().toString() + "_" + index;
      needSave = true;
    }

    if (item.priority == null) {
      item.priority = index + 1;
      needSave = true;
    }

    return item;
  });

  if (needSave) {
    saveBannerData(type, data);
  }

  return data;
}



function saveBannerData(type, data) {
  const file = getDataFile(type);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
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

receiver.router.get("/api/banner/:type", (req, res) => {
  res.json(loadBannerData(req.params.type));
});

/* ======================================================
 * 관리자 수정 API
 * ====================================================== */
receiver.router.post("/api/admin/update/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const updatedData = req.body;

  const list = loadBannerData(type);
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

  // 수정 코드 (보내온 값만 업데이트)
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


  saveBannerData(type, list);

  /* ===============================
    Slack 알림 (진짜 변경된 항목만)
  =============================== */
  try {
    const LABEL_MAP = {
      priority: "우선순위",
      startDate: "노출시작일",
      endDate: "노출종료일",
      banner: "배너명",
      bannerContent: "배너내용",
      bannerCategory: "배너구분",
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

      // 🔥 문자열로 통일해서 비교
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

    for (const userId of uniqueUsers) {
      await publishBannerMain(userId, type);
      await publishMyReservations(userId, type);  // 🔥 추가
    }

  } catch (e) {
    console.log("Slack 화면 갱신 실패:", e.message);
  }

  res.json({ success: true });
});


/* ======================================================
 * 관리자 삭제 API
 * ====================================================== */
receiver.router.delete("/api/admin/delete/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  const list = loadBannerData(type);
  const target = list.find((item) => item.id === id);

  if (!target) {
    return res.status(404).json({ error: "Not found" });
  }

  const newList = list.filter((item) => item.id !== id);

  // 🔥 삭제 후 priority 재정렬
  newList
    .sort((a, b) => a.priority - b.priority)
    .forEach((item, idx) => {
      item.priority = idx + 1;
    });

  saveBannerData(type, newList);

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
      🔥 Slack 화면 강제 갱신
    =============================== */
    try {
      // 홈 탭 갱신
      await publishBannerMain(target.createdBy, type);

      // 내 예약 보기 갱신
      await publishMyReservations(target.createdBy, type);

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
 * 날짜 유틸 (주간리스트 복구용)
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
 * 이미지 생성 + 캐시
 * ====================================================== */

async function generateCalendarImage(type) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const targetUrl = `${BASE_URL}/banner/${type}`;
  console.log("📸 캡처 URL:", targetUrl);

  await page.goto(targetUrl, { waitUntil: "networkidle0" });

  // 특정 요소가 로드됐는지 기다리기 (예: 캘린더 이미지의 셀렉터)
  // 예를 들어, 캘린더 이미지에 id가 'calendar-image'라고 가정
  // await page.waitForSelector('#calendar-image', { timeout: 5000 });

  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();

  return screenshot;
}

async function regenerateCalendar(type) {
  const imageBuffer = await generateCalendarImage(type);

  const uploadResult = await app.client.files.uploadV2({
    file: imageBuffer,
    filename: `${type}_calendar.png`,
  });

  const uploadedFile = uploadResult?.files?.[0];
  if (!uploadedFile?.id) {
    console.log("❌ 파일 업로드 실패");
    return "";
  }

  try {
    await app.client.files.sharedPublicURL({
      file: uploadedFile.id,
    });
  } catch (e) {
    console.log("⚠️ sharedPublicURL 실패 (권한 문제 가능):", e?.data?.error || e?.message);
  }

  // 🔥 sharedPublicURL 반영 딜레이 방어 (최대 3회 재시도)
  let fileInfo;
  for (let i = 0; i < 3; i++) {
    try {
      const info = await app.client.files.info({
        file: uploadedFile.id,
      });
      fileInfo = info.file;

      if (fileInfo.public_url_shared) break;

      console.log(`⏳ public_url_shared 대기중... (${i + 1}/3)`);
      await new Promise((res) => setTimeout(res, 1000));
    } catch (e) {
      console.log("⚠️ files.info 실패:", e?.data?.error || e?.message);
      return "";
    }
  }

  if (!fileInfo?.public_url_shared) {
    console.log("❌ public_url_shared 끝까지 없음 → 워크스페이스 public 공유 제한 가능성");
    return "";
  }

// 🔥 실제 이미지 접근 URL 생성 (CDN 썸네일 사용)
  let publicUrl = fileInfo.thumb_1024 
    || fileInfo.thumb_720 
    || fileInfo.thumb_480;

  if (!publicUrl) {
    console.log("❌ 썸네일 URL 없음");
    return "";
  }

  console.log("🖼 생성된 이미지 URL:", publicUrl);

  const cache = loadCache();
  cache[type] = publicUrl;
  saveCache(cache);

  return publicUrl;

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
 * 배너 메인 화면 (주간리스트 복구 + 이미지 상단)
 * ====================================================== */

async function publishBannerMain(userId, type) {
  const cache = loadCache();
  const calendarUrl = cache[type];
  const allData = loadBannerData(type);

  const dates = getThisWeekDates();
  const ranks = Array.from({ length: 7 }, (_, i) => i + 1); // 1~7 (5순위 + 대기2)

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${BANNER_TYPES[type]} 관리` },
    },
    { type: "divider" },
  ];

  // ✅ 이미지가 있으면 상단에 표시
  if (calendarUrl && calendarUrl.startsWith("http")) {
    blocks.push({
      type: "image",
      image_url: calendarUrl,
      alt_text: "월간 배너 일정",
    });
    blocks.push({ type: "divider" });
  }

  // ✅ 버튼들
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

  // ✅ 주간 리스트 복구
  dates.forEach((date) => {
    const yyyyMMdd = date.toISOString().slice(0, 10);

    const dayItems = allData.filter(
      (d) => d.startDate <= yyyyMMdd && d.endDate >= yyyyMMdd
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
 * 내 예약 보기 (복구: 날짜/부서/담당자 포함)
 * ====================================================== */

async function publishMyReservations(userId, type) {
  const myList = loadBannerData(type).filter((item) => item.createdBy === userId);

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
            { type: "button", text: { type: "plain_text", text: "✏️ 수정" }, action_id: "edit_my_reservation", value: item.id },
            { type: "button", text: { type: "plain_text", text: "🗑 삭제" }, style: "danger", action_id: "delete_reservation", value: item.id },
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
 * 이벤트 핸들러 (✅ 홈버튼 클릭 안먹는 문제 해결 핵심!!)
 * ====================================================== */

app.event("app_home_opened", async ({ event }) => {
  await publishHome(event.user);
});

// ✅ 홈 화면 3개 버튼 클릭 핸들러 (이게 빠져서 안 눌렸던 거)
Object.keys(BANNER_TYPES).forEach((type) => {
  app.action(`open_banner_tab_${type}`, async ({ ack, body }) => {
    await ack();
    await publishBannerMain(body.user.id, type);
  });
});

// ✅ 내 예약 보기 버튼 핸들러 (🔥 이게 빠져있음)
app.action("my_reservations", async ({ ack, body }) => {
  await ack();

  const type = body.actions?.[0]?.value;
  if (!type) return;

  await publishMyReservations(body.user.id, type);
});


// ✅ 내 예약 보기
app.action("edit_my_reservation", async ({ ack, body, client }) => {
  await ack();

  const id = body.actions?.[0]?.value;
  if (!id) return;

  let type = null;
  let item = null;

  Object.keys(BANNER_TYPES).forEach((t) => {
    const list = loadBannerData(t);
    const found = list.find((i) => i.id === id);
    if (found) {
      type = t;
      item = found;
    }
  });

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

  const id = body.actions?.[0]?.value;
  const userId = body.user.id;

  if (!id) return;

  // 어떤 타입에서 눌렀는지 알아야 함
  // 수정 — 모든 타입에서 실제 검색
  app.action("delete_reservation", async ({ ack, body }) => {
      await ack();

      const id = body.actions?.[0]?.value;
      const userId = body.user.id;
      if (!id) return;

      let type = null;
      let targetItem = null;

      for (const t of Object.keys(BANNER_TYPES)) {
          const list = loadBannerData(t);
          const found = list.find(i => i.id === id);
          if (found) {
              type = t;
              targetItem = found;
              break;
          }
      }

      if (!type) return;

      const list = loadBannerData(type);
      const newList = list.filter(item => item.id !== id);

      newList.sort((a, b) => a.priority - b.priority)
          .forEach((item, idx) => { item.priority = idx + 1; });

      saveBannerData(type, newList);
      await publishMyReservations(userId, type);
  });

  const list = loadBannerData(type);
  const newList = list.filter(item => item.id !== id);

  saveBannerData(type, newList);

  await publishMyReservations(userId, type);
});

// ✅ 내예약 -> 돌아가기
app.action("back_to_banner_main", async ({ ack, body }) => {
  await ack();
  const type = body.actions?.[0]?.value;
  if (!type) return;
  await publishBannerMain(body.user.id, type);
});

// ✅ 이전화면 -> 홈
app.action("go_home", async ({ ack, body }) => {
  await ack();
  await publishHome(body.user.id);
});

/* ======================================================
 * 등록 모달 (예전 양식 복구)
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

          // 🔹 타겟 이벤트코드
          {
            type: "input",
            block_id: "event_code_block",
            label: { type: "plain_text", text: "타겟 이벤트코드" },
            element: {
              type: "plain_text_input",
              action_id: "event_code",
              placeholder: {
                type: "plain_text",
                text: "* ex) NMSV01",
              },
            },
          },

          // 🔹 배너구분 (콤보박스)
          {
            type: "input",
            block_id: "banner_type_block",
            label: { type: "plain_text", text: "배너구분" },
            element: {
              type: "static_select",
              action_id: "banner_type",
              placeholder: {
                type: "plain_text",
                text: "선택하세요",
              },
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

          // 🔹 매체유형
          {
            type: "input",
            block_id: "media_type_block",
            label: { type: "plain_text", text: "매체유형" },
            element: {
              type: "static_select",
              action_id: "media_type",
              placeholder: {
                type: "plain_text",
                text: "선택하세요",
              },
              options: [
                { text: { type: "plain_text", text: "나무" }, value: "tree" },
                { text: { type: "plain_text", text: "N2" }, value: "n2" },
              ],
            },
          },

          // 🔹 배너명 (기존 유지)
          {
            type: "input",
            block_id: "banner_block",
            label: { type: "plain_text", text: "배너명" },
            element: {
              type: "plain_text_input",
              action_id: "banner",
            },
          },

          // 🔹 배너내용
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

          // 🔹 노출시작 희망일자
          {
            type: "input",
            block_id: "start_date_block",
            label: { type: "plain_text", text: "노출시작 희망일자" },
            element: {
              type: "datepicker",
              action_id: "start_date",
            },
          },

          // 🔹 노출종료일자
          {
            type: "input",
            block_id: "end_date_block",
            label: { type: "plain_text", text: "노출종료 희망일자" },
            element: {
              type: "datepicker",
              action_id: "end_date",
            },
          },

          // 🔹 바로가기속성
          {
            type: "input",
            block_id: "link_type_block",
            label: { type: "plain_text", text: "바로가기속성" },
            element: {
              type: "static_select",
              action_id: "link_type",
              placeholder: {
                type: "plain_text",
                text: "선택하세요",
              },
              options: [
                { text: { type: "plain_text", text: "화면오픈" }, value: "screen" },
                { text: { type: "plain_text", text: "팝업오픈" }, value: "popup" },
                { text: { type: "plain_text", text: "프레임팝업" }, value: "frame_popup" },
                { text: { type: "plain_text", text: "URL" }, value: "url" },
              ],
            },
          },

          // 🔹 바로가기링크
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

          // 🔹 바로가기링크데이터
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
    const list = loadBannerData(type);

    const maxPriority =
    list.length > 0
      ? Math.max(...list.map((i) => i.priority || 0))
      : 0;


    list.push({
    id: Date.now().toString(),
        priority: maxPriority + 1, // ✅ 자동 우선순위 부여

        eventCode: v.event_code_block.event_code.value,
        bannerType:
          v.banner_type_block.banner_type.selected_option?.value || "",
        mediaType:
          v.media_type_block.media_type.selected_option?.value || "",
        banner: v.banner_block.banner.value,
        bannerDesc: v.banner_desc_block.banner_desc.value,
        startDate: v.start_date_block.start_date.selected_date,
        endDate: v.end_date_block.end_date.selected_date,
        linkType:
          v.link_type_block.link_type.selected_option?.value || "",
        linkUrl: v.link_url_block?.link_url?.value || "",
        linkData: v.link_data_block?.link_data?.value || "",

        createdBy: body.user.id,
        createdAt: new Date().toISOString(),
    });


    saveBannerData(type, list);

    // ✅ 등록 후 이미지 갱신 시도 (실패해도 앱은 계속 동작)
    // 🔥 Slack 화면 강제 갱신
    await publishBannerMain(body.user.id, type);
  });
});

  app.view(/edit_modal_(.*)/, async ({ ack, view, body }) => {
  await ack();

  const { id, type } = JSON.parse(view.private_metadata);
  const v = view.state.values;

  const list = loadBannerData(type);
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


  saveBannerData(type, list);

  // 🔥 Slack 화면 즉시 반영
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