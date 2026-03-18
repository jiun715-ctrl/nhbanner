/**
 * 배너 테스트 샘플 데이터 시드 스크립트
 * 실행: node seed_banners.js
 * 
 * - 기존 데이터 삭제 없이 추가만 함
 * - 배너명 앞에 T. 접두어로 테스트 데이터 구분
 * 
 * 조건:
 * - 홈배너: 배너명 10~16자, 서브타이틀 8~19자, 최대 15일
 * - 플로팅배너: 윗줄 10~12자 \n 아랫줄 5~9자, 배너내용 7~12자, 최대 3일
 * - 관심종목탭: 탭별 1개, 최대 15일
 */

require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});

const bannerSchema = new mongoose.Schema({}, { strict: false });

const BannerModel = {
  home:     mongoose.model("Home",     bannerSchema, "home"),
  floating: mongoose.model("Floating", bannerSchema, "floating"),
  interest: mongoose.model("Interest", bannerSchema, "interest"),
};

/* ======================================================
 * 홈배너 7개 (우선순위 1~5 + 대기 1~2)
 * 기간: 2026-03-10 ~ 2026-03-24 (15일, 최대치)
 * ====================================================== */
const homeData = [
  {
    priority: 1,
    banner: "T.이제 퇴직연금도 ELS!",          // 15자 ✓
    bannerDesc: "ELS 가입하고 이벤트 혜택까지",  // 17자 ✓
    productType: "financial",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 2,
    banner: "T.나무 해외주식 특별혜택",          // 14자 ✓
    bannerDesc: "수수료 최대 50% 절감 혜택",     // 16자 ✓
    productType: "foreign_stock",
    purpose: "sales_marketing",
    mediaType: "tree",
  },
  {
    priority: 3,
    banner: "T.ETF 월정액 투자 시작",           // 15자 ✓
    bannerDesc: "매달 자동으로 투자되는 ETF",    // 16자 ✓
    productType: "domestic_stock",
    purpose: "service",
    mediaType: "common",
  },
  {
    priority: 4,
    banner: "T.미국주식 수수료 무료",            // 13자 ✓
    bannerDesc: "지금 거래하면 수수료 0원",      // 14자 ✓
    productType: "foreign_stock",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 5,
    banner: "T.연금저축 가입 이벤트",            // 13자 ✓
    bannerDesc: "세액공제 최대 900만원 혜택",    // 16자 ✓
    productType: "pension",
    purpose: "info",
    mediaType: "tree",
  },
  {
    priority: 6,  // 대기 1번
    banner: "T.트래블월렛 환전 이벤트",          // 14자 ✓
    bannerDesc: "여행 전 환전하고 캐시백",       // 13자 ✓
    productType: "etc",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 7,  // 대기 2번
    banner: "T.주식 거래수수료 쿠폰",            // 13자 ✓
    bannerDesc: "한달간 수수료 할인 쿠폰 증정",  // 16자 ✓
    productType: "domestic_stock",
    purpose: "service",
    mediaType: "common",
  },
].map((item, idx) => ({
  id: `home_test_${Date.now() + idx}`,
  bannerType: "01",
  startDate: "2026-03-10",
  endDate: "2026-03-24",
  linkType: "screen_mts",
  linkData: "X08m5132",
  landingPage: "",
  linkUrl: "",
  desiredTab: "",
  desiredTabCustom: "",
  eventCode: "",
  createdBy: "U_TEST",
  createdAt: new Date().toISOString(),
  ...item,
}));

/* ======================================================
 * 플로팅배너 7개 (우선순위 1~5 + 대기 1~2)
 * 기간: 2026-03-18 ~ 2026-03-20 (3일, 최대치)
 * ====================================================== */
const floatingData = [
  {
    priority: 1,
    banner: "T.적립금 두 배로\\n받아가세요",     // 윗줄 11자✓ 아랫줄 6자✓
    bannerDesc: "지금 바로 참여",               // 8자 ✓
    productType: "etc",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 2,
    banner: "T.해외주식 무료 체험\\n시작해요",   // 윗줄 12자✓ 아랫줄 5자✓
    bannerDesc: "30일 무료 체험",               // 8자 ✓
    productType: "foreign_stock",
    purpose: "service",
    mediaType: "tree",
  },
  {
    priority: 3,
    banner: "T.ETF 투자 챌린지\\n함께해봐요",   // 윗줄 11자✓ 아랫줄 6자✓
    bannerDesc: "챌린지 참여하기",              // 8자 ✓
    productType: "domestic_stock",
    purpose: "service",
    mediaType: "common",
  },
  {
    priority: 4,
    banner: "T.미국주식 할인 혜택\\n지금 바로",  // 윗줄 12자✓ 아랫줄 5자✓
    bannerDesc: "수수료 50% 할인",              // 9자 ✓
    productType: "foreign_stock",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 5,
    banner: "T.연금 세액공제 혜택\\n가입하기",   // 윗줄 12자✓ 아랫줄 5자✓
    bannerDesc: "세액공제 혜택받기",            // 9자 ✓
    productType: "pension",
    purpose: "info",
    mediaType: "tree",
  },
  {
    priority: 6,  // 대기 1번
    banner: "T.트래블월렛 환전\\n지금 바로",     // 윗줄 11자✓ 아랫줄 5자✓
    bannerDesc: "환전 수수료 0원",              // 9자 ✓
    productType: "etc",
    purpose: "sales_marketing",
    mediaType: "common",
  },
  {
    priority: 7,  // 대기 2번
    banner: "T.국내주식 이벤트\\n쿠폰받기",      // 윗줄 11자✓ 아랫줄 5자✓
    bannerDesc: "수수료 할인 쿠폰",             // 9자 ✓
    productType: "domestic_stock",
    purpose: "service",
    mediaType: "common",
  },
].map((item, idx) => ({
  id: `floating_test_${Date.now() + idx}`,
  bannerType: "03",
  startDate: "2026-03-18",
  endDate: "2026-03-20",
  linkType: "screen_mts",
  linkData: "X08m5132",
  landingPage: "",
  linkUrl: "",
  desiredTab: "",
  desiredTabCustom: "",
  eventCode: "",
  createdBy: "U_TEST",
  createdAt: new Date().toISOString(),
  ...item,
}));

/* ======================================================
 * 관심종목탭 8개 (8개 탭 전부)
 * 기간: 2026-03-10 ~ 2026-03-24 (15일, 최대치)
 * ====================================================== */
const interestTabs = [
  { value: "realtime_best",  label: "실시간BEST" },
  { value: "expert_stock",   label: "투자고수종목" },
  { value: "domestic_rank",  label: "국내종목순위" },
  { value: "foreign_rank",   label: "해외종목순위" },
  { value: "etf_rank",       label: "ETF순위" },
  { value: "vi_stock",       label: "VI발동종목" },
  { value: "sector_stock",   label: "섹터 종목" },
  { value: "coin_price",     label: "코인시세" },
];

const interestProducts = [
  "domestic_stock", "domestic_stock", "domestic_stock", "foreign_stock",
  "domestic_stock", "domestic_stock", "both_stock", "etc",
];
const interestPurposes = [
  "sales_marketing", "info", "service", "sales_marketing",
  "service", "info", "sales_marketing", "service",
];

const interestData = interestTabs.map((tab, idx) => ({
  id: `interest_test_${Date.now() + idx}`,
  bannerType: "99",
  priority: idx + 1,
  banner: "",
  bannerDesc: "",
  desiredTab: tab.value,
  desiredTabCustom: "",
  productType: interestProducts[idx],
  purpose: interestPurposes[idx],
  mediaType: idx % 3 === 1 ? "tree" : "common",
  startDate: "2026-03-10",
  endDate: "2026-03-24",
  linkType: "url",
  linkData: "https://m.nhqv.com/test",
  landingPage: "",
  linkUrl: "",
  eventCode: "",
  createdBy: "U_TEST",
  createdAt: new Date().toISOString(),
}));

/* ======================================================
 * 실행
 * ====================================================== */
async function seed() {
  try {
    console.log("🌱 테스트 데이터 삽입 시작 (기존 데이터 유지)...\n");

    await BannerModel.home.insertMany(homeData);
    console.log(`✅ 홈배너 ${homeData.length}개 삽입 완료`);
    homeData.forEach(d => {
      const label = d.priority <= 5 ? `${d.priority}순위` : `대기${d.priority - 5}`;
      console.log(`   [${label}] ${d.banner}`);
    });

    await BannerModel.floating.insertMany(floatingData);
    console.log(`\n✅ 플로팅배너 ${floatingData.length}개 삽입 완료`);
    floatingData.forEach(d => {
      const label = d.priority <= 5 ? `${d.priority}순위` : `대기${d.priority - 5}`;
      console.log(`   [${label}] ${d.banner}`);
    });

    await BannerModel.interest.insertMany(interestData);
    console.log(`\n✅ 관심종목탭배너 ${interestData.length}개 삽입 완료`);
    interestData.forEach(d => console.log(`   [${d.desiredTab}]`));

    console.log("\n🎉 전체 시드 완료!");
    console.log("\n📌 테스트 확인:");
    console.log("   - 홈배너:     3월 10~24일 → 1~5순위 + 대기1~2");
    console.log("   - 플로팅배너: 3월 18~20일 → 1~5순위 + 대기1~2");
    console.log("   - 관심종목탭: 3월 10~24일 → 8개 탭 전부");
    console.log("\n🗑  테스트 데이터 삭제 시 MongoDB에서:");
    console.log('   db.home.deleteMany({ id: /home_test_/ })');
    console.log('   db.floating.deleteMany({ id: /floating_test_/ })');
    console.log('   db.interest.deleteMany({ id: /interest_test_/ })');

  } catch (e) {
    console.error("❌ 오류:", e.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
