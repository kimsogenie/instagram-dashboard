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

const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("react-chartjs-2").then((m) => m.Line), { ssr: false });
const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });

/* ─── Constants ─── */
const SAMPLE_DATA = [
  { title: "신제품 출시 영상", date: "09/03", reach: 12400, views: 8200, likes: 342, comments: 67, shares: 45, clicks: 289 },
  { title: "브랜드 히스토리", date: "09/07", reach: 9800, views: 5100, likes: 198, comments: 22, shares: 33, clicks: 145 },
  { title: "이벤트 공지", date: "09/10", reach: 21300, views: 14800, likes: 521, comments: 234, shares: 187, clicks: 892 },
  { title: "가을 캠페인 티저", date: "09/14", reach: 18700, views: 12100, likes: 689, comments: 89, shares: 92, clicks: 456 },
  { title: "제품 사용법 영상", date: "09/18", reach: 9200, views: 7300, likes: 243, comments: 31, shares: 34, clicks: 312 },
  { title: "직원 인터뷰", date: "09/21", reach: 11500, views: 6800, likes: 412, comments: 56, shares: 123, clicks: 201 },
  { title: "스타일링 제안", date: "09/24", reach: 15600, views: 9400, likes: 578, comments: 145, shares: 67, clicks: 534 },
  { title: "콜라보 챌린지", date: "09/27", reach: 19800, views: 13200, likes: 445, comments: 198, shares: 312, clicks: 778 },
];

const SAMPLE_CSV =
  "제목,날짜,도달,조회,좋아요,댓글,공유,클릭\n" +
  "신제품 출시 영상,09/03,12400,8200,342,67,45,289\n" +
  "브랜드 히스토리,09/07,9800,5100,198,22,33,145\n" +
  "이벤트 공지,09/10,21300,14800,521,234,187,892\n" +
  "가을 캠페인 티저,09/14,18700,12100,689,89,92,456\n" +
  "제품 사용법 영상,09/18,9200,7300,243,31,34,312\n" +
  "직원 인터뷰,09/21,11500,6800,412,56,123,201\n" +
  "스타일링 제안,09/24,15600,9400,578,145,67,534\n" +
  "콜라보 챌린지,09/27,19800,13200,445,198,312,778";

const COL_ALIASES = {
  title:    ["제목", "title", "콘텐츠", "content", "게시물", "post", "이름", "name"],
  date:     ["날짜", "date", "일자", "업로드일", "게시일"],
  reach:    ["도달", "reach", "도달수"],
  views:    ["조회", "view", "views", "조회수", "재생", "impression", "impressions", "노출"],
  likes:    ["좋아요", "like", "likes", "좋아요수", "reaction", "reactions"],
  comments: ["댓글", "comment", "comments", "댓글수"],
  shares:   ["공유", "share", "shares", "공유수"],
  clicks:   ["클릭", "click", "clicks", "클릭수", "link click", "링크 클릭"],
};

const REQUIRED_NUMERIC = ["reach", "views", "likes", "comments", "shares", "clicks"];

const METRIC_KEYS = [
  { key: "reach",    label: "도달 Top" },
  { key: "views",    label: "조회 Top" },
  { key: "likes",    label: "좋아요 Top" },
  { key: "comments", label: "댓글 Top" },
  { key: "shares",   label: "공유 Top" },
  { key: "clicks",   label: "클릭 Top" },
];

const FALLBACK_INSIGHTS = {
  reach:    "도달이 높은 게시물. 게시 시간대, 해시태그, 타겟 설정을 기록해두고 다음 포스팅에 동일 조건을 적용해보세요.",
  views:    "조회 수가 높은 콘텐츠. 썸네일 또는 영상 첫 3초가 주목을 끌었을 가능성이 높아요. 동일 포맷 반복을 검토하세요.",
  likes:    "감성·비주얼 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
  comments: "캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요. 멘션·이벤트성 포스팅이었는지도 확인하세요.",
  shares:   "공유 유도 문구나 챌린지·공감형 요소가 있었을 가능성. 어떤 바이럴 트리거가 작동했는지 분석해두세요.",
  clicks:   "링크 클릭이 높은 콘텐츠. CTA 문구, 링크 위치, 랜딩페이지 연결이 잘 됐을 가능성. CTR(클릭률)도 같이 확인해보세요.",
};

/* ─── Neon Colors ─── */
const NEON = {
  reach:    "#c084fc",
  views:    "#00d4ff",
  likes:    "#ff6b9d",
  comments: "#ffb347",
  shares:   "#7fff6b",
  clicks:   "#f472b6",
  bar2:     "#3b82f6",
};

/* ─── CSV Parser ─── */
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

function autoDetectMapping(headers) {
  const mapping = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
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

function applyMapping(rows, mapping) {
  return rows
    .map((row, i) => ({
      title:    row[mapping.title] || `게시물 ${i + 1}`,
      date:     row[mapping.date] || "",
      reach:    toInt(row[mapping.reach]),
      views:    toInt(row[mapping.views]),
      likes:    toInt(row[mapping.likes]),
      comments: toInt(row[mapping.comments]),
      shares:   toInt(row[mapping.shares]),
      clicks:   toInt(row[mapping.clicks]),
    }))
    .filter((d) => REQUIRED_NUMERIC.some((k) => d[k] > 0));
}

/* ─── Utilities ─── */
const avg = (data, key) => data.length ? data.reduce((s, d) => s + d[key], 0) / data.length : 0;
const safeRatio = (top, mean) => mean > 0 ? `+${((top / mean - 1) * 100).toFixed(0)}%` : null;
const shortLabel = (t, max = 8) => t.length > max ? t.slice(0, max) + "…" : t;

function downloadSampleCSV() {
  const blob = new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "facebook_sample_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function smartYScale(data, keys) {
  const vals = data.flatMap((d) => keys.map((k) => d[k])).filter((v) => v > 0);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const pad = Math.max((max - min) * 0.18, max * 0.08);
  return { min: Math.max(0, min - pad), max: max + pad };
}

/* ─── Chart config ─── */
const TOOLTIP = { backgroundColor: "#141414", borderColor: "#2a2a2a", borderWidth: 1, titleColor: "#fff", bodyColor: "#ddd", padding: 10 };
const GRID_C = "rgba(255,255,255,0.06)";
const TICK_C = "#888";
const LEGEND = { labels: { color: "#ccc", font: { size: 11 }, boxWidth: 10, padding: 14 }, position: "top" };

const barLineOpts = (scaleY, fullTitles) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: LEGEND,
    tooltip: { ...TOOLTIP, callbacks: { title: (items) => fullTitles[items[0].dataIndex] || "" } },
  },
  scales: {
    x: { grid: { color: GRID_C }, ticks: { color: TICK_C, font: { size: 10 }, maxRotation: 35 } },
    y: { grid: { color: GRID_C }, ticks: { color: TICK_C, font: { size: 10 } }, ...scaleY },
  },
});

/* ─── Mapping UI ─── */
function MappingUI({ headers, initialMapping, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(initialMapping);
  const fields = [
    { key: "title",    label: "게시물 제목", req: false },
    { key: "date",     label: "날짜",        req: false },
    { key: "reach",    label: "도달",        req: true },
    { key: "views",    label: "조회",        req: true },
    { key: "likes",    label: "좋아요",      req: true },
    { key: "comments", label: "댓글",        req: true },
    { key: "shares",   label: "공유",        req: true },
    { key: "clicks",   label: "클릭",        req: true },
  ];
  const missing = fields.filter((f) => f.req && !mapping[f.key]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>컬럼 매핑 설정</div>
        <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.65, marginBottom: 24 }}>
          파일의 컬럼명을 자동 인식하지 못했어요.<br />각 항목에 해당하는 컬럼을 직접 선택해주세요.
        </div>
        {fields.map(({ key, label, req }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "#999", minWidth: 90 }}>
              {label}{req && <span style={{ color: "#e05555", marginLeft: 2 }}>*</span>}
            </div>
            <select
              style={{ flex: 1, background: "#0c0c0c", border: "1px solid #252525", borderRadius: 8, color: "#ccc", padding: "8px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}
              value={mapping[key] || ""}
              onChange={(e) => setMapping((p) => ({ ...p, [key]: e.target.value || undefined }))}
            >
              <option value="">— 선택 안 함 —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
        {missing.length > 0 && (
          <div style={{ fontSize: 12, color: "#e07755", marginTop: 8 }}>필수: {missing.map((f) => f.label).join(", ")}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{ background: "transparent", border: "1px solid #222", borderRadius: 8, color: "#666", padding: "10px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
          <button
            disabled={missing.length > 0}
            onClick={() => onConfirm(mapping)}
            style={{ flex: 1, background: missing.length ? "#181818" : "#fff", color: missing.length ? "#333" : "#000", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: missing.length ? "default" : "pointer", fontFamily: "inherit" }}
          >
            이 설정으로 분석하기 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function FacebookDashboard() {
  const [view, setView] = useState("input");
  const [csvText, setCsvText] = useState("");
  const [fileText, setFileText] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRaw, setParsedRaw] = useState(null);
  const [showMapping, setShowMapping] = useState(false);
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState("reach");
  const [sortAsc, setSortAsc] = useState(false);
  const [checked, setChecked] = useState({});
  const [chartFilter, setChartFilter] = useState("all");
  const fileRef = useRef(null);

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
    const mapping = autoDetectMapping(headers);
    const missingReq = REQUIRED_NUMERIC.filter((k) => !mapping[k]);
    if (missingReq.length) { setParsedRaw({ headers, rows }); setShowMapping(true); }
    else { finalize(rows, mapping); }
  }

  function finalize(rows, mapping) {
    setShowMapping(false);
    const parsed = applyMapping(rows, mapping);
    if (!parsed.length) { setError("유효한 데이터 행이 없어요."); return; }
    setError(""); setData(parsed); setView("dashboard");
  }

  function goBack() {
    setView("input"); setChecked({}); setChartFilter("all");
  }

  /* Sort */
  const sortedData = [...data].sort((a, b) => {
    const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
    const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? res : -res;
  });

  const maxes = {};
  REQUIRED_NUMERIC.forEach((k) => { maxes[k] = data.length ? Math.max(...data.map((d) => d[k])) : 0; });

  /* Checklist */
  const checklistItems = data.length ? (() => {
    const top = (k) => [...data].sort((a, b) => b[k] - a[k])[0];
    const bot = (k) => [...data].sort((a, b) => a[k] - b[k])[0];
    return [
      `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
      `클릭 Best "${top("clicks").title}" — CTA 문구와 링크 배치를 기록하고 반복 적용`,
      `공유 Best "${top("shares").title}" — 바이럴 트리거 분석, 유사 콘텐츠 다음 달 재시도`,
      `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 타겟 설정·게시 시간 비교`,
      `조회 수 높은 게시물의 영상 길이·썸네일 패턴 기록`,
      `좋아요/클릭 비율 기준 감성형 vs 정보형 분류 → 다음 달 콘텐츠 믹스 조정`,
    ];
  })() : [];

  /* Chart filter */
  const filteredData = (() => {
    if (chartFilter === "top3_reach")    return [...data].sort((a, b) => b.reach - a.reach).slice(0, 3);
    if (chartFilter === "top3_views")    return [...data].sort((a, b) => b.views - a.views).slice(0, 3);
    if (chartFilter === "top3_clicks")   return [...data].sort((a, b) => b.clicks - a.clicks).slice(0, 3);
    return data;
  })();

  const labels = filteredData.map((d) => shortLabel(d.title));
  const fullTitles = filteredData.map((d) => d.title);

  const reachViewData = {
    labels,
    datasets: [
      { label: "도달", data: filteredData.map((d) => d.reach), backgroundColor: NEON.reach, borderRadius: 4, borderSkipped: false },
      { label: "조회", data: filteredData.map((d) => d.views), backgroundColor: NEON.views, borderRadius: 4, borderSkipped: false },
    ],
  };

  const engData = {
    labels,
    datasets: [
      { label: "좋아요", data: filteredData.map((d) => d.likes), borderColor: NEON.likes, backgroundColor: "transparent", borderWidth: 2, pointRadius: 3, pointBackgroundColor: NEON.likes, tension: 0.3 },
      { label: "댓글",   data: filteredData.map((d) => d.comments), borderColor: NEON.comments, backgroundColor: "transparent", borderWidth: 2, pointRadius: 3, pointBackgroundColor: NEON.comments, tension: 0.3 },
      { label: "공유",   data: filteredData.map((d) => d.shares), borderColor: NEON.shares, backgroundColor: "transparent", borderWidth: 2, pointRadius: 3, pointBackgroundColor: NEON.shares, tension: 0.3 },
      { label: "클릭",   data: filteredData.map((d) => d.clicks), borderColor: NEON.clicks, backgroundColor: "transparent", borderWidth: 2, pointRadius: 3, pointBackgroundColor: NEON.clicks, tension: 0.3 },
    ],
  };

  const donutTotals = ["likes", "comments", "shares", "clicks"].map((k) => data.reduce((s, d) => s + d[k], 0));
  const donutData = {
    labels: ["좋아요", "댓글", "공유", "클릭"],
    datasets: [{
      data: donutTotals,
      backgroundColor: [NEON.likes, NEON.comments, NEON.shares, NEON.clicks],
      borderColor: "#0c0c0c", borderWidth: 2, hoverOffset: 6,
    }],
  };

  const reachViewScale = smartYScale(filteredData, ["reach", "views"]);
  const engScale = smartYScale(filteredData, ["likes", "comments", "shares", "clicks"]);

  /* ─── INPUT ─── */
  if (view === "input") return (
    <>
      {showMapping && parsedRaw && (
        <MappingUI
          headers={parsedRaw.headers}
          initialMapping={autoDetectMapping(parsedRaw.headers)}
          onConfirm={(m) => finalize(parsedRaw.rows, m)}
          onCancel={() => setShowMapping(false)}
        />
      )}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 540 }}>

          {/* Platform Nav */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            <a href="/" style={{ fontSize: 12, color: "#555", textDecoration: "none", padding: "6px 14px", border: "1px solid #222", borderRadius: 20 }}>Instagram</a>
            <span style={{ fontSize: 12, color: "#fff", padding: "6px 14px", border: "1px solid #555", borderRadius: 20, background: "#1877f218", borderColor: "#1877f2" }}>Facebook</span>
          </div>

          <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#888", marginBottom: 14, fontWeight: 600 }}>
            Facebook Analytics — Marketer Dashboard
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 10, color: "#fff" }}>
            월간 페이스북<br />성과 대시보드
          </h1>
          <p style={{ color: "#aaa", fontSize: 13.5, lineHeight: 1.65, marginBottom: 28 }}>
            이번 달 게시물 데이터를 올리면 도달·조회·인게이지먼트<br />분석과 다음 달 체크리스트를 한번에 뽑아드려요.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
            style={{ border: `1.5px dashed ${isDragging ? "#555" : "#252525"}`, background: isDragging ? "#111" : "transparent", borderRadius: 12, padding: "34px 24px", textAlign: "center", cursor: "pointer", marginBottom: 12 }}
          >
            <input type="file" accept=".csv,.txt" ref={fileRef} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
            <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.35 }}>📂</div>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 6, fontWeight: 500 }}>CSV 파일 업로드</div>
            <div style={{ fontSize: 12, color: "#888" }}>클릭하거나 파일을 여기로 드래그하세요</div>
          </div>

          {selectedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "11px 16px", marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <span style={{ fontSize: 13, color: "#999", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile}</span>
              <button onClick={(e) => { e.stopPropagation(); setFileText(null); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          <button onClick={downloadSampleCSV} style={{ width: "100%", background: "transparent", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 0", fontSize: 12, color: "#aaa", cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}>
            📥 샘플 CSV 템플릿 다운로드 (형식 확인용)
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
            <span style={{ fontSize: 11, color: "#2d2d2d" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="데이터 직접 붙여넣기"
            style={{ width: "100%", height: 100, background: "#111", border: "1px solid #1c1c1c", borderRadius: 10, color: "#ccc", fontSize: 12, padding: "12px 14px", resize: "vertical", outline: "none", fontFamily: "monospace", lineHeight: 1.6, marginBottom: 8 }}
          />
          <div style={{ fontSize: 11, color: "#888", marginBottom: 14, lineHeight: 1.7 }}>
            헤더명이 달라도 업로드 후 컬럼 매핑 화면에서 연결할 수 있어요.
          </div>

          {error && <div style={{ color: "#e05555", fontSize: 12, marginBottom: 8 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={!csvText.trim() && !fileText}
              onClick={uploadData}
              style={{ flex: 1, background: csvText.trim() || fileText ? "#fff" : "#181818", color: csvText.trim() || fileText ? "#000" : "#2d2d2d", border: "none", borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 600, cursor: csvText.trim() || fileText ? "pointer" : "default", fontFamily: "inherit" }}
            >
              대시보드 생성 →
            </button>
            <button onClick={() => { setData(SAMPLE_DATA); setView("dashboard"); }} style={{ background: "transparent", color: "#555", border: "1px solid #1e1e1e", borderRadius: 10, padding: "13px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              샘플 보기
            </button>
          </div>
        </div>
      </div>
    </>
  );

  /* ─── DASHBOARD ─── */
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 64px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          {/* Platform Nav */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <a href="/" style={{ fontSize: 12, color: "#555", textDecoration: "none", padding: "5px 12px", border: "1px solid #222", borderRadius: 20 }}>Instagram</a>
            <span style={{ fontSize: 12, color: "#fff", padding: "5px 12px", border: "1px solid #1877f2", borderRadius: 20, background: "#1877f215" }}>Facebook</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#888", marginBottom: 6, fontWeight: 600 }}>Facebook Analytics</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>월간 성과 대시보드</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>총 {data.length}개 게시물 분석</div>
        </div>
        <button onClick={goBack} style={{ background: "transparent", color: "#555", border: "1px solid #1e1e1e", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← 재입력</button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { label: "총 게시물", val: `${data.length}개` },
          { label: "평균 도달", val: Math.round(avg(data, "reach")).toLocaleString() },
          { label: "평균 조회", val: Math.round(avg(data, "views")).toLocaleString() },
          { label: "평균 좋아요", val: Math.round(avg(data, "likes")).toLocaleString() },
          { label: "평균 공유", val: Math.round(avg(data, "shares")).toLocaleString() },
          { label: "평균 클릭", val: Math.round(avg(data, "clicks")).toLocaleString() },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>데이터 흐름</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all", label: "전체" },
            { key: "top3_reach", label: "도달 Top 3" },
            { key: "top3_views", label: "조회 Top 3" },
            { key: "top3_clicks", label: "클릭 Top 3" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setChartFilter(key)} style={{
              background: chartFilter === key ? "#fff" : "transparent",
              color: chartFilter === key ? "#000" : "#666",
              border: `1px solid ${chartFilter === key ? "#fff" : "#2a2a2a"}`,
              borderRadius: 20, padding: "5px 12px", fontSize: 11,
              fontWeight: chartFilter === key ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20, gridColumn: "span 2" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>게시물별 도달 & 조회</div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>
            {chartFilter === "all" ? `전체 ${data.length}개 게시물` : filteredData.map(d => d.title).join(" / ")} — 막대 위에 마우스를 올리면 전체 제목 확인 가능
          </div>
          <div style={{ height: 220 }}>
            <Bar data={reachViewData} options={barLineOpts({ min: 0 }, fullTitles)} />
          </div>
        </div>

        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>인게이지먼트 추이</div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>좋아요·댓글·공유·클릭 흐름 — 마우스 오버 시 전체 제목</div>
          <div style={{ height: 200 }}>
            <Line data={engData} options={barLineOpts(engScale, fullTitles)} />
          </div>
        </div>

        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>인게이지먼트 구성 비율</div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>총 인게이지먼트에서 각 지표의 비중</div>
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Doughnut data={donutData} options={{
              responsive: true, maintainAspectRatio: false, cutout: "68%",
              plugins: {
                legend: { labels: { color: "#ccc", font: { size: 11 }, boxWidth: 10, padding: 12 }, position: "right" },
                tooltip: { ...TOOLTIP, callbacks: { label: (ctx) => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); const p = t ? ((ctx.parsed / t) * 100).toFixed(1) : 0; return ` ${ctx.parsed.toLocaleString()} (${p}%)`; } } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>지표별 최고 성과 콘텐츠</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 28 }}>
        {METRIC_KEYS.map(({ key, label }) => {
          const top = [...data].sort((a, b) => b[key] - a[key])[0];
          const ratio = safeRatio(top[key], avg(data, key));
          const neonColor = NEON[key] || "#fff";
          return (
            <div key={key} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#ddd", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
                {ratio && (
                  <span title="이번 달 전체 평균 대비 해당 게시물의 수치" style={{ fontSize: 10, color: neonColor, background: `${neonColor}18`, border: `1px solid ${neonColor}40`, padding: "3px 8px", borderRadius: 20 }}>
                    평균 대비 {ratio}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 5, letterSpacing: "-0.02em" }}>{top[key].toLocaleString()}</div>
              <div style={{ fontSize: 13, color: "#ddd", marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={top.title}>{top.title}</div>
              <div style={{ height: 1, background: "#1e1e1e", marginBottom: 12 }} />
              <div style={{ fontSize: 9.5, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>인사이트</div>
              <div style={{ fontSize: 12.5, color: "#ccc", lineHeight: 1.65 }}>{FALLBACK_INSIGHTS[key]}</div>
            </div>
          );
        })}
      </div>

      {/* Checklist */}
      <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>다음 달을 위한 체크리스트</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px 22px", marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>데이터 기반 점검 항목</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>인게이지먼트 패턴에서 도출한 액션 포인트예요.</div>
        {checklistItems.map((item, i) => (
          <div key={i} onClick={() => setChecked((p) => ({ ...p, [i]: !p[i] }))} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: i < checklistItems.length - 1 ? "1px solid #1a1a1a" : "none", cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, border: `1.5px solid ${checked[i] ? "#7fff6b" : "#2a2a2a"}`, borderRadius: 5, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: checked[i] ? "#7fff6b" : "transparent", userSelect: "none" }}>
              {checked[i] && <span style={{ fontSize: 11, color: "#000", fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6, flex: 1 }}>{item}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>전체 게시물</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 700 }}>
          <thead>
            <tr>
              {[["title","게시물"],["date","날짜"],["reach","도달"],["views","조회"],["likes","좋아요"],["comments","댓글"],["shares","공유"],["clicks","클릭"]].map(([k, l]) => (
                <th key={k} onClick={() => { if (sortKey === k) setSortAsc(p => !p); else { setSortKey(k); setSortAsc(false); } }}
                  style={{ padding: "12px 14px", textAlign: "left", color: sortKey === k ? "#fff" : "#888", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #1e1e1e", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {l}{sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post, i) => (
              <tr key={i} style={{ borderBottom: i < sortedData.length - 1 ? "1px solid #171717" : "none" }}>
                <td style={{ padding: "11px 14px", color: "#ddd", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={post.title}>{post.title}</td>
                <td style={{ padding: "11px 14px", color: "#666", fontFamily: "monospace", fontSize: 11 }}>{post.date}</td>
                {["reach","views","likes","comments","shares","clicks"].map((k) => (
                  <td key={k} style={{ padding: "11px 14px", color: post[k] === maxes[k] ? "#fff" : "#aaa", fontWeight: post[k] === maxes[k] ? 700 : 400, fontFamily: "monospace", fontSize: 12 }}>
                    {post[k].toLocaleString()}
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
