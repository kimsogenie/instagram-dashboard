"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const Bar      = dynamic(() => import("react-chartjs-2").then((m) => m.Bar),      { ssr: false });
const Line     = dynamic(() => import("react-chartjs-2").then((m) => m.Line),     { ssr: false });
const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });

/* ═══════════════════════════════════════════════
   PLATFORM CONFIGS
═══════════════════════════════════════════════ */
const PLATFORMS = {
  instagram: {
    id:        "instagram",
    name:      "Instagram",
    emoji:     "📸",
    accent:    "#e1306c",
    metricKeys: ["likes","comments","saves","shares","reach"],
    metricLabels: { likes:"좋아요", comments:"댓글", saves:"저장", shares:"공유", reach:"도달" },
    requiredNumeric: ["likes","comments","saves","shares","reach"],
    colAliases: {
      title:    ["제목","title","콘텐츠","content","게시물","post","이름","name"],
      date:     ["날짜","date","일자","업로드일","게시일"],
      likes:    ["좋아요","like","likes","좋아요수"],
      comments: ["댓글","comment","comments","댓글수"],
      saves:    ["저장","save","saves","저장수","bookmark"],
      shares:   ["공유","share","shares","공유수"],
      reach:    ["도달","reach","노출","impression","impressions","도달수"],
    },
    filterOptions: [
      { key:"all",           label:"전체" },
      { key:"top3_reach",    label:"도달 Top 3",  sortKey:"reach" },
      { key:"top3_likes",    label:"좋아요 Top 3", sortKey:"likes" },
      { key:"top3_comments", label:"댓글 Top 3",  sortKey:"comments" },
    ],
    summaryCards: (data) => [
      { label:"총 게시물",  val:`${data.length}개` },
      { label:"평균 좋아요", val:Math.round(avg(data,"likes")).toLocaleString() },
      { label:"평균 저장",  val:Math.round(avg(data,"saves")).toLocaleString() },
      { label:"총 도달",    val:data.reduce((s,d)=>s+d.reach,0).toLocaleString() },
    ],
    engagementKeys:   ["likes","comments","saves","shares"],
    engagementLabels: ["좋아요","댓글","저장","공유"],
    mainBarKeys:      ["reach"],
    mainBarLabel:     "도달",
    sampleCSV: "제목,날짜,좋아요,댓글,저장,공유,도달\n신제품 출시 비하인드 컷,09/03,342,67,189,45,4820\n브랜드 히스토리 카드뉴스,09/07,198,12,412,23,3210\n이벤트 댓글로 친구 태그,09/10,521,234,43,187,7840\n가을 캠페인 티저 영상,09/14,689,89,156,92,9200\n제품 사용법 How-to,09/18,243,31,567,34,3890\n직원 인터뷰 릴스,09/21,412,56,89,123,6540\n오늘 뭐 입지 스타일링,09/24,578,145,234,67,7100\nOOTD 콜라보 챌린지,09/27,445,198,78,312,8200",
    sampleData: [
      { title:"신제품 출시 비하인드 컷", date:"09/03", likes:342, comments:67, saves:189, shares:45, reach:4820 },
      { title:"브랜드 히스토리 카드뉴스", date:"09/07", likes:198, comments:12, saves:412, shares:23, reach:3210 },
      { title:"이벤트 댓글로 친구 태그", date:"09/10", likes:521, comments:234, saves:43, shares:187, reach:7840 },
      { title:"가을 캠페인 티저 영상", date:"09/14", likes:689, comments:89, saves:156, shares:92, reach:9200 },
      { title:"제품 사용법 How-to", date:"09/18", likes:243, comments:31, saves:567, shares:34, reach:3890 },
      { title:"직원 인터뷰 릴스", date:"09/21", likes:412, comments:56, saves:89, shares:123, reach:6540 },
      { title:"오늘 뭐 입지 스타일링", date:"09/24", likes:578, comments:145, saves:234, shares:67, reach:7100 },
      { title:"OOTD 콜라보 챌린지", date:"09/27", likes:445, comments:198, saves:78, shares:312, reach:8200 },
    ],
    fallbackInsights: {
      likes:    "비주얼·감성 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
      comments: "캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요. 멘션·이벤트성 포스팅이었는지도 확인하세요.",
      saves:    "정보성·유용성이 높은 콘텐츠. 저장 유도 문구 또는 팁·리스트·가이드 형식이었을 가능성이 높아요.",
      shares:   "공유 유도 문구나 챌린지·밈·공감형 요소가 있었을 가능성. 어떤 바이럴 트리거가 작동했는지 분석해두세요.",
      reach:    "해시태그 전략이 잘 먹혔거나 탐색 피드 유입이 많았을 가능성. 이 포스팅의 해시태그 조합을 기록해두세요.",
    },
    defaultChecklist: (data) => {
      const top = (k) => [...data].sort((a,b)=>b[k]-a[k])[0];
      const bot = (k) => [...data].sort((a,b)=>a[k]-b[k])[0];
      return [
        `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
        `저장 Best "${top("saves").title}" — 콘텐츠 형식 분석 후 유사 포맷 확장 기획`,
        top("shares").shares > avg(data,"shares")*1.3
          ? `공유 Best "${top("shares").title}" — 바이럴 트리거 기록, 다음 달 재시도`
          : `공유 수 전반 낮음 — 챌린지·공유 유도 포맷 테스트`,
        `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 해시태그 비교`,
        `Best 게시물 업로드 시간대·요일 정리 후 최적 타임 설정`,
        `감성형 vs 정보형 비율 분류 → 다음 달 콘텐츠 믹스 조정`,
      ];
    },
  },
  facebook: {
    id:        "facebook",
    name:      "Facebook",
    emoji:     "📘",
    accent:    "#1877f2",
    metricKeys: ["reach","views","likes","comments","shares","clicks"],
    metricLabels: { reach:"도달", views:"조회", likes:"좋아요", comments:"댓글", shares:"공유", clicks:"클릭" },
    requiredNumeric: ["reach","views","likes","comments","shares","clicks"],
    colAliases: {
      title:    ["제목","title","콘텐츠","content","게시물","post","이름","name"],
      date:     ["날짜","date","일자","업로드일","게시일"],
      reach:    ["도달","reach","도달수"],
      views:    ["조회","view","views","조회수","재생","impression","impressions","노출"],
      likes:    ["좋아요","like","likes","좋아요수","reaction","reactions"],
      comments: ["댓글","comment","comments","댓글수"],
      shares:   ["공유","share","shares","공유수"],
      clicks:   ["클릭","click","clicks","클릭수","link click","링크 클릭"],
    },
    filterOptions: [
      { key:"all",           label:"전체" },
      { key:"top3_reach",    label:"도달 Top 3",  sortKey:"reach" },
      { key:"top3_views",    label:"조회 Top 3",  sortKey:"views" },
      { key:"top3_clicks",   label:"클릭 Top 3",  sortKey:"clicks" },
    ],
    summaryCards: (data) => [
      { label:"총 게시물",  val:`${data.length}개` },
      { label:"평균 도달",  val:Math.round(avg(data,"reach")).toLocaleString() },
      { label:"평균 조회",  val:Math.round(avg(data,"views")).toLocaleString() },
      { label:"평균 클릭",  val:Math.round(avg(data,"clicks")).toLocaleString() },
    ],
    engagementKeys:   ["likes","comments","shares","clicks"],
    engagementLabels: ["좋아요","댓글","공유","클릭"],
    mainBarKeys:      ["reach","views"],
    mainBarLabel:     "도달 & 조회",
    sampleCSV: "제목,날짜,도달,조회,좋아요,댓글,공유,클릭\n신제품 출시 영상,09/03,12400,8200,342,67,45,289\n브랜드 히스토리,09/07,9800,5100,198,22,33,145\n이벤트 공지,09/10,21300,14800,521,234,187,892\n가을 캠페인 티저,09/14,18700,12100,689,89,92,456\n제품 사용법 영상,09/18,9200,7300,243,31,34,312\n직원 인터뷰,09/21,11500,6800,412,56,123,201\n스타일링 제안,09/24,15600,9400,578,145,67,534\n콜라보 챌린지,09/27,19800,13200,445,198,312,778",
    sampleData: [
      { title:"신제품 출시 영상", date:"09/03", reach:12400, views:8200, likes:342, comments:67, shares:45, clicks:289 },
      { title:"브랜드 히스토리", date:"09/07", reach:9800, views:5100, likes:198, comments:22, shares:33, clicks:145 },
      { title:"이벤트 공지", date:"09/10", reach:21300, views:14800, likes:521, comments:234, shares:187, clicks:892 },
      { title:"가을 캠페인 티저", date:"09/14", reach:18700, views:12100, likes:689, comments:89, shares:92, clicks:456 },
      { title:"제품 사용법 영상", date:"09/18", reach:9200, views:7300, likes:243, comments:31, shares:34, clicks:312 },
      { title:"직원 인터뷰", date:"09/21", reach:11500, views:6800, likes:412, comments:56, shares:123, clicks:201 },
      { title:"스타일링 제안", date:"09/24", reach:15600, views:9400, likes:578, comments:145, shares:67, clicks:534 },
      { title:"콜라보 챌린지", date:"09/27", reach:19800, views:13200, likes:445, comments:198, shares:312, clicks:778 },
    ],
    fallbackInsights: {
      reach:    "도달이 높은 게시물. 게시 시간대, 타겟 설정을 기록해두고 다음 포스팅에 동일 조건을 적용해보세요.",
      views:    "조회 수가 높은 콘텐츠. 썸네일 또는 영상 첫 3초가 주목을 끌었을 가능성. 동일 포맷 반복을 검토하세요.",
      likes:    "감성·비주얼 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
      comments: "캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요.",
      shares:   "공유 유도 문구나 챌린지·공감형 요소가 있었을 가능성. 어떤 바이럴 트리거가 작동했는지 분석해두세요.",
      clicks:   "링크 클릭이 높은 콘텐츠. CTA 문구, 링크 위치, 랜딩페이지 연결이 잘 됐을 가능성.",
    },
    defaultChecklist: (data) => {
      const top = (k) => [...data].sort((a,b)=>b[k]-a[k])[0];
      const bot = (k) => [...data].sort((a,b)=>a[k]-b[k])[0];
      return [
        `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
        `클릭 Best "${top("clicks").title}" — CTA 문구·링크 배치 기록 후 반복 적용`,
        `공유 Best "${top("shares").title}" — 바이럴 트리거 분석, 다음 달 재시도`,
        `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 타겟 설정·게시 시간 비교`,
        `조회 수 높은 게시물의 영상 길이·썸네일 패턴 기록`,
        `좋아요/클릭 비율 기준 감성형 vs 정보형 분류 → 다음 달 콘텐츠 믹스 조정`,
      ];
    },
  },
};

/* ═══════════════════════════════════════════════
   NEON COLORS
═══════════════════════════════════════════════ */
const NEON = {
  likes:    "#ff6b9d",
  comments: "#00d4ff",
  saves:    "#7fff6b",
  shares:   "#ffb347",
  reach:    "#c084fc",
  views:    "#38bdf8",
  clicks:   "#f472b6",
  reach2:   "#3b82f6",
};

const METRIC_COLOR = (key) => NEON[key] || "#fff";

/* ═══════════════════════════════════════════════
   CSV PARSING
═══════════════════════════════════════════════ */
function splitCSVLine(line) {
  const cols = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

function parseRawCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

function autoDetectMapping(aliases, headers) {
  const mapping = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const [field, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      const idx = lower.findIndex((h) => h.includes(alias.toLowerCase()));
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  return mapping;
}

function toInt(val) {
  if (!val) return 0;
  return parseInt(String(val).replace(/[,\s"']/g, ""), 10) || 0;
}

function applyMapping(rows, mapping, metricKeys) {
  return rows
    .map((row, i) => {
      const obj = {
        title: row[mapping.title] || `게시물 ${i + 1}`,
        date:  row[mapping.date]  || "",
      };
      metricKeys.forEach((k) => { obj[k] = toInt(row[mapping[k]]); });
      return obj;
    })
    .filter((d) => metricKeys.some((k) => d[k] > 0));
}

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
const avg = (data, key) =>
  data.length ? data.reduce((s, d) => s + (d[key] || 0), 0) / data.length : 0;

const safeRatio = (top, mean) =>
  mean > 0 ? `+${((top / mean - 1) * 100).toFixed(0)}%` : null;

const shortLabel = (t, max = 8) => t.length > max ? t.slice(0, max) + "…" : t;

function downloadSampleCSV(platform) {
  const cfg = PLATFORMS[platform];
  const blob = new Blob(["\uFEFF" + cfg.sampleCSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${platform}_sample_template.csv`; a.click();
  URL.revokeObjectURL(url);
}

function smartYScale(data, keys) {
  const vals = data.flatMap((d) => keys.map((k) => d[k] || 0)).filter((v) => v > 0);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const pad = Math.max((max - min) * 0.18, max * 0.08);
  return { min: Math.max(0, min - pad), max: max + pad };
}

/* ═══════════════════════════════════════════════
   CHART OPTIONS
═══════════════════════════════════════════════ */
const TOOLTIP = { backgroundColor:"#141414", borderColor:"#2a2a2a", borderWidth:1, titleColor:"#fff", bodyColor:"#ddd", padding:10 };
const GRID_C = "rgba(255,255,255,0.06)";
const TICK_C = "#888";

const makeChartOpts = (scaleY, fullTitles, stacked = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color:"#ccc", font:{ size:11 }, boxWidth:10, padding:14 }, position:"top" },
    tooltip: { ...TOOLTIP, callbacks: { title: (items) => fullTitles[items[0].dataIndex] || "" } },
  },
  scales: {
    x: {
      stacked,
      grid: { color: GRID_C },
      ticks: { color: TICK_C, font:{ size:10 }, maxRotation:35 },
    },
    y: {
      stacked,
      grid: { color: GRID_C },
      ticks: { color: TICK_C, font:{ size:10 } },
      ...scaleY,
    },
  },
});

/* ═══════════════════════════════════════════════
   MAPPING UI
═══════════════════════════════════════════════ */
function MappingUI({ platform, headers, initialMapping, onConfirm, onCancel }) {
  const cfg = PLATFORMS[platform];
  const [mapping, setMapping] = useState(initialMapping);
  const fields = [
    { key:"title", label:"게시물 제목", req:false },
    { key:"date",  label:"날짜",        req:false },
    ...cfg.metricKeys.map((k) => ({ key:k, label:cfg.metricLabels[k], req:true })),
  ];
  const missing = fields.filter((f) => f.req && !mapping[f.key]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:24 }}>
      <div style={{ background:"#111", border:"1px solid #222", borderRadius:14, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:8 }}>컬럼 매핑 설정</div>
        <div style={{ fontSize:12.5, color:"#666", lineHeight:1.65, marginBottom:24 }}>파일의 컬럼명을 자동 인식하지 못했어요.<br/>각 항목에 해당하는 컬럼을 직접 선택해주세요.</div>
        {fields.map(({ key, label, req }) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ fontSize:13, color:"#999", minWidth:80 }}>
              {label}{req && <span style={{ color:"#e05555", marginLeft:2 }}>*</span>}
            </div>
            <select
              style={{ flex:1, background:"#0c0c0c", border:"1px solid #252525", borderRadius:8, color:"#ccc", padding:"8px 10px", fontSize:12, fontFamily:"inherit", outline:"none" }}
              value={mapping[key] || ""}
              onChange={(e) => setMapping((p) => ({ ...p, [key]: e.target.value || undefined }))}
            >
              <option value="">— 선택 안 함 —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
        {missing.length > 0 && <div style={{ fontSize:12, color:"#e07755", marginTop:8 }}>필수: {missing.map((f) => f.label).join(", ")}</div>}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onCancel} style={{ background:"transparent", border:"1px solid #222", borderRadius:8, color:"#666", padding:"10px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>취소</button>
          <button
            disabled={missing.length > 0}
            onClick={() => onConfirm(mapping)}
            style={{ flex:1, background:missing.length ? "#181818" : "#fff", color:missing.length ? "#333" : "#000", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:600, cursor:missing.length ? "default" : "pointer", fontFamily:"inherit" }}
          >이 설정으로 분석하기 →</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════ */
export default function Home() {
  // view: "input" | "dashboard"
  const [view,         setView]         = useState("input");
  const [platform,     setPlatform]     = useState("instagram");
  const [csvText,      setCsvText]      = useState("");
  const [fileText,     setFileText]     = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error,        setError]        = useState("");
  const [isDragging,   setIsDragging]   = useState(false);
  const [parsedRaw,    setParsedRaw]    = useState(null);
  const [showMapping,  setShowMapping]  = useState(false);
  const [data,         setData]         = useState([]);
  const [sortKey,      setSortKey]      = useState("reach");
  const [sortAsc,      setSortAsc]      = useState(false);
  const [checked,      setChecked]      = useState({});

  const fileRef = useRef(null);

  const cfg = platform ? PLATFORMS[platform] : null;

  /* ── helpers ── */
  function selectPlatform(p) {
    if (p === platform) return;
    setPlatform(p);
    setSortKey(PLATFORMS[p].metricKeys[PLATFORMS[p].metricKeys.length - 1]);

    setData([]); setChecked({});
    setCsvText(""); setFileText(null); setSelectedFile(null); setError("");
    if (view === "dashboard") setView("input");
  }

  function readFile(file) {
    const r = new FileReader();
    r.onload = (e) => { setFileText(e.target.result); setSelectedFile(file.name); setError(""); };
    r.readAsText(file, "UTF-8");
  }

  function uploadData() {
    const raw = fileText || csvText;
    if (!raw?.trim()) { setError("데이터를 입력해주세요."); return; }
    const { headers, rows } = parseRawCSV(raw);
    if (!headers.length) { setError("파일을 읽지 못했어요."); return; }
    const mapping = autoDetectMapping(cfg.colAliases, headers);
    const missingReq = cfg.requiredNumeric.filter((k) => !mapping[k]);
    if (missingReq.length) { setParsedRaw({ headers, rows }); setShowMapping(true); }
    else { finalize(rows, mapping); }
  }

  function finalize(rows, mapping) {
    setShowMapping(false);
    const parsed = applyMapping(rows, mapping, cfg.metricKeys);
    if (!parsed.length) { setError("유효한 데이터 행이 없어요."); return; }
    setError(""); setData(parsed); setView("dashboard");
  }

  function goBack() {
    setView("input"); setChecked({});
  }



  /* ── sort ── */
  const sortedData = [...data].sort((a, b) => {
    const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
    const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? res : -res;
  });

  const maxes = {};
  if (cfg) cfg.metricKeys.forEach((k) => { maxes[k] = data.length ? Math.max(...data.map((d) => d[k] || 0)) : 0; });

  /* ── chart data (always full) ── */
  const labels     = data.map((d) => shortLabel(d.title));
  const fullTitles = data.map((d) => d.title);

  /* ── chart data ── */
  // Main bar: reach (+ views for facebook)
  const mainBarDatasets = cfg ? (
    cfg.id === "facebook"
      ? [
          { label:"도달", data:data.map((d) => d.reach), backgroundColor:NEON.reach, borderRadius:4, borderSkipped:false },
          { label:"조회", data:data.map((d) => d.views), backgroundColor:NEON.views, borderRadius:4, borderSkipped:false },
        ]
      : [
          { label:"도달", data:data.map((d) => d.reach), backgroundColor:NEON.reach, borderRadius:4, borderSkipped:false },
          { label:"총 인게이지먼트", data:data.map((d) => (d.likes||0)+(d.comments||0)+(d.saves||0)+(d.shares||0)), backgroundColor:NEON.reach2, borderRadius:4, borderSkipped:false },
        ]
  ) : [];

  // When Top3 active: grouped bar showing all engagement metrics per post
  // When all: line chart
  const engKeys   = cfg ? cfg.engagementKeys   : [];
  const engLabels = cfg ? cfg.engagementLabels : [];
  const engColors = engKeys.map(METRIC_COLOR);

  const engGroupedBar = {
    labels,
    datasets: engKeys.map((k, i) => ({
      label: engLabels[i],
      data:  data.map((d) => d[k] || 0),
      backgroundColor: engColors[i],
      borderRadius: 4,
      borderSkipped: false,
    })),
  };

  const engLine = {
    labels,
    datasets: engKeys.map((k, i) => ({
      label: engLabels[i],
      data:  data.map((d) => d[k] || 0),
      borderColor: engColors[i],
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: engColors[i],
      tension: 0.3,
    })),
  };

  const donutTotals = engKeys.map((k) => data.reduce((s, d) => s + (d[k] || 0), 0));
  const donutData = {
    labels: engLabels,
    datasets: [{
      data: donutTotals,
      backgroundColor: engColors,
      borderColor: "#0c0c0c", borderWidth: 2, hoverOffset: 6,
    }],
  };

  const mainBarScale = cfg?.id === "facebook"
    ? smartYScale(data, ["reach","views"])
    : { min: 0 };
  const engScale = smartYScale(data, engKeys);

  /* ══════════════════════════════════
     INPUT SCREEN
  ══════════════════════════════════ */
  if (view === "input") return (
    <>
      {showMapping && parsedRaw && (
        <MappingUI
          platform={platform}
          headers={parsedRaw.headers}
          initialMapping={autoDetectMapping(cfg.colAliases, parsedRaw.headers)}
          onConfirm={(m) => finalize(parsedRaw.rows, m)}
          onCancel={() => setShowMapping(false)}
        />
      )}
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px" }}>
        <div style={{ width:"100%", maxWidth:540 }}>
          {/* Platform Tab Switcher */}
          <div style={{ display:"flex", gap:8, marginBottom:28 }}>
            {[
              { id:"instagram", label:"📸 Instagram", accent:"#e1306c" },
              { id:"facebook",  label:"📘 Facebook",  accent:"#1877f2" },
            ].map((p) => {
              const isActive = platform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPlatform(p.id)}
                  style={{
                    background: isActive ? `${p.accent}15` : "transparent",
                    color: isActive ? "#fff" : "#555",
                    border: `1.5px solid ${isActive ? p.accent : "#222"}`,
                    borderRadius: 24,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:"#888", marginBottom:14, fontWeight:600 }}>
            {cfg.name} Analytics — Marketer Dashboard
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, lineHeight:1.2, marginBottom:10, color:"#fff" }}>
            월간 {cfg.name}<br/>성과 대시보드
          </h1>
          <p style={{ color:"#aaa", fontSize:13.5, lineHeight:1.65, marginBottom:28 }}>
            이번 달 게시물 데이터를 올리면 지표별 Best 콘텐츠,<br/>
            트렌드 차트를 한번에 뽑아드려요.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
            style={{ border:`1.5px dashed ${isDragging ? "#555" : "#252525"}`, background:isDragging ? "#111" : "transparent", borderRadius:12, padding:"34px 24px", textAlign:"center", cursor:"pointer", marginBottom:12 }}
          >
            <input type="file" accept=".csv,.txt" ref={fileRef} style={{ display:"none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
            <div style={{ fontSize:26, marginBottom:10, opacity:0.35 }}>📂</div>
            <div style={{ fontSize:14, color:"#888", marginBottom:6, fontWeight:500 }}>CSV 파일 업로드</div>
            <div style={{ fontSize:12, color:"#888" }}>클릭하거나 파일을 여기로 드래그하세요</div>
          </div>

          {selectedFile && (
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"#111", border:"1px solid #1e1e1e", borderRadius:10, padding:"11px 16px", marginBottom:12 }}>
              <span>📄</span>
              <span style={{ fontSize:13, color:"#999", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{selectedFile}</span>
              <button onClick={(e) => { e.stopPropagation(); setFileText(null); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
            </div>
          )}

          <button onClick={() => downloadSampleCSV(platform)} style={{ width:"100%", background:"transparent", border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 0", fontSize:12, color:"#aaa", cursor:"pointer", marginBottom:16, fontFamily:"inherit" }}>
            📥 샘플 CSV 템플릿 다운로드
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
            <span style={{ fontSize:11, color:"#2d2d2d" }}>OR</span>
            <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="데이터 직접 붙여넣기"
            style={{ width:"100%", height:100, background:"#111", border:"1px solid #1c1c1c", borderRadius:10, color:"#ccc", fontSize:12, padding:"12px 14px", resize:"vertical", outline:"none", fontFamily:"monospace", lineHeight:1.6, marginBottom:8 }}
          />
          <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>헤더명이 달라도 업로드 후 컬럼 매핑 화면에서 연결할 수 있어요.</div>

          {error && <div style={{ color:"#e05555", fontSize:12, marginBottom:8 }}>{error}</div>}

          <div style={{ display:"flex", gap:10 }}>
            <button
              disabled={!csvText.trim() && !fileText}
              onClick={uploadData}
              style={{ flex:1, background:csvText.trim()||fileText ? "#fff" : "#181818", color:csvText.trim()||fileText ? "#000" : "#2d2d2d", border:"none", borderRadius:10, padding:13, fontSize:14, fontWeight:600, cursor:csvText.trim()||fileText ? "pointer" : "default", fontFamily:"inherit" }}
            >
              대시보드 생성 →
            </button>
            <button onClick={() => { setData(cfg.sampleData); setView("dashboard"); }} style={{ background:"transparent", color:"#555", border:"1px solid #1e1e1e", borderRadius:10, padding:"13px 18px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              샘플 보기
            </button>
          </div>
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════
     DASHBOARD
  ══════════════════════════════════ */
  const checklistItems = cfg.defaultChecklist(data);

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px 64px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          {/* Platform Tab Switcher */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[
              { id:"instagram", label:"📸 Instagram", accent:"#e1306c" },
              { id:"facebook",  label:"📘 Facebook",  accent:"#1877f2" },
            ].map((p) => {
              const isActive = platform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPlatform(p.id)}
                  style={{
                    background: isActive ? `${p.accent}15` : "transparent",
                    color: isActive ? "#fff" : "#555",
                    border: `1.5px solid ${isActive ? p.accent : "#222"}`,
                    borderRadius: 24,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:"#888", marginBottom:6, fontWeight:600 }}>{cfg.name} Analytics</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#fff" }}>월간 성과 대시보드</div>
          <div style={{ fontSize:12, color:"#888", marginTop:4 }}>총 {data.length}개 게시물 분석</div>
        </div>
        <button onClick={goBack} style={{ background:"transparent", color:"#555", border:"1px solid #1e1e1e", borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          ← 재입력
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cfg.summaryCards(data).length}, 1fr)`, gap:10, marginBottom:28 }}>
        {cfg.summaryCards(data).map((s) => (
          <div key={s.label} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:10, padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:"#888", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#fff" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── 전체 흐름 차트 ── */}
      <div style={{ fontSize:10, color:"#888", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>데이터 흐름</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
        <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:20, gridColumn:"span 2" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>
            {cfg.id === "facebook" ? "게시물별 도달 & 조회" : "게시물별 도달 & 인게이지먼트"}
          </div>
          <div style={{ fontSize:11, color:"#888", marginBottom:16 }}>
            전체 {data.length}개 게시물 — 막대 위에 마우스를 올리면 전체 제목 확인 가능
          </div>
          <div style={{ height:220 }}>
            <Bar data={{ labels, datasets: mainBarDatasets }} options={makeChartOpts(mainBarScale, fullTitles)} />
          </div>
        </div>
        <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>인게이지먼트 추이</div>
          <div style={{ fontSize:11, color:"#888", marginBottom:16 }}>게시 순서에 따른 각 지표 변화</div>
          <div style={{ height:200 }}>
            <Line data={engLine} options={makeChartOpts(engScale, fullTitles)} />
          </div>
        </div>
        <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>인게이지먼트 구성 비율</div>
          <div style={{ fontSize:11, color:"#888", marginBottom:16 }}>전체 데이터 기준 각 지표의 비중</div>
          <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Doughnut data={donutData} options={{
              responsive:true, maintainAspectRatio:false, cutout:"68%",
              plugins: {
                legend: { labels:{ color:"#ccc", font:{ size:11 }, boxWidth:10, padding:12 }, position:"right" },
                tooltip: { ...TOOLTIP, callbacks: { label:(ctx) => { const t=ctx.dataset.data.reduce((a,b)=>a+b,0); const p=t?((ctx.parsed/t)*100).toFixed(1):0; return ` ${ctx.parsed.toLocaleString()} (${p}%)`; } } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* ── Top 3 인게이지먼트 비교 (항상 고정) ── */}
      <div style={{ fontSize:10, color:"#888", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>Top 3 인게이지먼트 비교</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:28 }}>
        {cfg.filterOptions.filter(f => f.sortKey).map(({ label, sortKey: sk }) => {
          const top3 = [...data].sort((a, b) => b[sk] - a[sk]).slice(0, 3);
          const t3labels = top3.map((d) => shortLabel(d.title));
          const t3titles = top3.map((d) => d.title);
          const t3bar = {
            labels: t3labels,
            datasets: engKeys.map((k, i) => ({
              label: engLabels[i],
              data: top3.map((d) => d[k] || 0),
              backgroundColor: engColors[i],
              borderRadius: 4,
              borderSkipped: false,
            })),
          };
          return (
            <div key={sk} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:11, color:"#888", marginBottom:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {top3.map(d => d.title).join(" · ")}
              </div>
              <div style={{ height:200 }}>
                <Bar data={t3bar} options={makeChartOpts(smartYScale(top3, engKeys), t3titles)} />
              </div>
            </div>
          );
        })}
      </div>


      {/* Metric Cards */}
      <div style={{ fontSize:10, color:"#888", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>지표별 최고 성과 콘텐츠</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10, marginBottom:28 }}>
        {cfg.metricKeys.map((key) => {
          const top    = [...data].sort((a,b) => b[key]-a[key])[0];
          const ratio  = safeRatio(top[key], avg(data, key));
          const nColor = METRIC_COLOR(key);
          return (
            <div key={key} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:10, color:"#ddd", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{cfg.metricLabels[key]} Top</span>
                {ratio && (
                  <span title="이번 달 전체 평균 대비 해당 게시물 수치" style={{ fontSize:10, color:nColor, background:`${nColor}18`, border:`1px solid ${nColor}40`, padding:"3px 8px", borderRadius:20 }}>
                    평균 대비 {ratio}
                  </span>
                )}
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:"#fff", marginBottom:5, letterSpacing:"-0.02em" }}>{top[key].toLocaleString()}</div>
              <div style={{ fontSize:13, color:"#ddd", marginBottom:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={top.title}>{top.title}</div>
              <div style={{ height:1, background:"#1e1e1e", marginBottom:12 }} />
              <div style={{ fontSize:9.5, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, fontWeight:600 }}>인사이트</div>
              <div style={{ fontSize:12.5, color:"#ccc", lineHeight:1.65 }}>{cfg.fallbackInsights[key]}</div>
            </div>
          );
        })}
      </div>

      {/* Checklist */}
      <div style={{ fontSize:10, color:"#888", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>다음 달을 위한 체크리스트</div>
      <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:"20px 22px", marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:4 }}>데이터 기반 점검 항목</div>
        <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>인게이지먼트 패턴에서 도출한 액션 포인트예요.</div>
        {checklistItems.map((item, i) => (
          <div key={i} onClick={() => setChecked((p) => ({ ...p, [i]:!p[i] }))} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 0", borderBottom:i<checklistItems.length-1?"1px solid #1a1a1a":"none", cursor:"pointer" }}>
            <div style={{ width:18, height:18, border:`1.5px solid ${checked[i]?"#7fff6b":"#2a2a2a"}`, borderRadius:5, flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", background:checked[i]?"#7fff6b":"transparent", userSelect:"none" }}>
              {checked[i] && <span style={{ fontSize:11, color:"#000", fontWeight:700 }}>✓</span>}
            </div>
            <div style={{ fontSize:13, color:"#ccc", lineHeight:1.6, flex:1 }}>{item}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ fontSize:10, color:"#888", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>전체 게시물</div>
      <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, minWidth:620 }}>
          <thead>
            <tr>
              {[["title","게시물"],["date","날짜"], ...cfg.metricKeys.map((k) => [k, cfg.metricLabels[k]])].map(([k, l]) => (
                <th key={k}
                  onClick={() => { if(sortKey===k) setSortAsc(p=>!p); else { setSortKey(k); setSortAsc(false); } }}
                  style={{ padding:"12px 14px", textAlign:"left", color:sortKey===k?"#fff":"#888", fontWeight:600, fontSize:11, borderBottom:"1px solid #1e1e1e", cursor:"pointer", whiteSpace:"nowrap" }}>
                  {l}{sortKey===k ? (sortAsc?" ↑":" ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post, i) => (
              <tr key={i} style={{ borderBottom:i<sortedData.length-1?"1px solid #171717":"none" }}>
                <td style={{ padding:"11px 14px", color:"#ddd", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={post.title}>{post.title}</td>
                <td style={{ padding:"11px 14px", color:"#666", fontFamily:"monospace", fontSize:11 }}>{post.date}</td>
                {cfg.metricKeys.map((k) => (
                  <td key={k} style={{ padding:"11px 14px", color:post[k]===maxes[k]?"#fff":"#aaa", fontWeight:post[k]===maxes[k]?700:400, fontFamily:"monospace", fontSize:12 }}>
                    {(post[k]||0).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
