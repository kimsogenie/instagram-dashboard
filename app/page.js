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

/* ─── Sample & Constants ─── */
const SAMPLE_DATA = [
  { title: "신제품 출시 비하인드 컷", date: "09/03", likes: 342, comments: 67, saves: 189, shares: 45, reach: 4820 },
  { title: "브랜드 히스토리 카드뉴스", date: "09/07", likes: 198, comments: 12, saves: 412, shares: 23, reach: 3210 },
  { title: "#이벤트 댓글로 친구 태그", date: "09/10", likes: 521, comments: 234, saves: 43, shares: 187, reach: 7840 },
  { title: "가을 캠페인 티저 영상", date: "09/14", likes: 689, comments: 89, saves: 156, shares: 92, reach: 9200 },
  { title: "제품 사용법 How-to 가이드", date: "09/18", likes: 243, comments: 31, saves: 567, shares: 34, reach: 3890 },
  { title: "직원 인터뷰 릴스", date: "09/21", likes: 412, comments: 56, saves: 89, shares: 123, reach: 6540 },
  { title: "오늘 뭐 입지? 스타일링", date: "09/24", likes: 578, comments: 145, saves: 234, shares: 67, reach: 7100 },
  { title: "OOTD 콜라보 챌린지", date: "09/27", likes: 445, comments: 198, saves: 78, shares: 312, reach: 8200 },
];

const SAMPLE_CSV =
  "제목,날짜,좋아요,댓글,저장,공유,도달\n" +
  "신제품 출시 비하인드 컷,09/03,342,67,189,45,4820\n" +
  "브랜드 히스토리 카드뉴스,09/07,198,12,412,23,3210\n" +
  "이벤트 댓글로 친구 태그,09/10,521,234,43,187,7840\n" +
  "가을 캠페인 티저 영상,09/14,689,89,156,92,9200\n" +
  "제품 사용법 How-to 가이드,09/18,243,31,567,34,3890\n" +
  "직원 인터뷰 릴스,09/21,412,56,89,123,6540\n" +
  "오늘 뭐 입지 스타일링,09/24,578,145,234,67,7100\n" +
  "OOTD 콜라보 챌린지,09/27,445,198,78,312,8200";

const COL_ALIASES = {
  title: ["제목", "title", "콘텐츠", "content", "게시물", "post", "이름", "name"],
  date: ["날짜", "date", "일자", "업로드일", "게시일"],
  likes: ["좋아요", "like", "likes", "좋아요수"],
  comments: ["댓글", "comment", "comments", "댓글수"],
  saves: ["저장", "save", "saves", "저장수", "bookmark"],
  shares: ["공유", "share", "shares", "공유수"],
  reach: ["도달", "reach", "노출", "impression", "impressions", "도달수"],
};

const REQUIRED_NUMERIC = ["likes", "comments", "saves", "shares", "reach"];

const METRIC_KEYS = [
  { key: "likes", label: "좋아요 Top" },
  { key: "comments", label: "댓글 Top" },
  { key: "saves", label: "저장 Top" },
  { key: "shares", label: "공유 Top" },
  { key: "reach", label: "도달 Top" },
];

const FALLBACK_INSIGHTS = {
  likes: "비주얼·감성 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
  comments: "캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요. 멘션·이벤트성 포스팅이었는지도 확인하세요.",
  saves: "정보성·유용성이 높은 콘텐츠. 저장 유도 문구 또는 팁·리스트·가이드 형식이었을 가능성이 높아요.",
  shares: "공유 유도 문구나 챌린지·밈·공감형 요소가 있었을 가능성. 어떤 바이럴 트리거가 작동했는지 분석해두세요.",
  reach: "해시태그 전략이 잘 먹혔거나 탐색 피드 유입이 많았을 가능성. 이 포스팅의 해시태그 조합을 기록해두세요.",
};

/* ─── CSV Parsing ─── */
function parseRawCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
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

function applyMapping(rows, mapping) {
  return rows
    .map((row, i) => ({
      title: row[mapping.title] || `게시물 ${i + 1}`,
      date: row[mapping.date] || "",
      likes: parseInt(row[mapping.likes]) || 0,
      comments: parseInt(row[mapping.comments]) || 0,
      saves: parseInt(row[mapping.saves]) || 0,
      shares: parseInt(row[mapping.shares]) || 0,
      reach: parseInt(row[mapping.reach]) || 0,
    }))
    .filter((d) => REQUIRED_NUMERIC.some((k) => d[k] > 0));
}

/* ─── Utilities ─── */
const avg = (data, key) =>
  data.length ? data.reduce((s, d) => s + d[key], 0) / data.length : 0;

const safeRatio = (top, mean) =>
  mean > 0 ? `+${((top / mean - 1) * 100).toFixed(0)}%` : null;

const shortLabel = (t, max = 8) => (t.length > max ? t.slice(0, max) + "…" : t);

function downloadSampleCSV() {
  const blob = new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "instagram_sample_template.csv"; a.click();
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

/* ─── Chart Base ─── */
const TOOLTIP = { backgroundColor: "#1a1a1a", borderColor: "#2e2e2e", borderWidth: 1, titleColor: "#bbb", bodyColor: "#ddd", padding: 10 };
const GRID_C = "rgba(255,255,255,0.05)";
const TICK_C = "#666";
const LEGEND = { labels: { color: "#888", font: { size: 11 }, boxWidth: 10, padding: 14 }, position: "top" };

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

/* ─── Mapping UI Component ─── */
function MappingUI({ headers, initialMapping, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(initialMapping);
  const fields = [
    { key: "title", label: "게시물 제목", req: false },
    { key: "date", label: "날짜", req: false },
    { key: "likes", label: "좋아요", req: true },
    { key: "comments", label: "댓글", req: true },
    { key: "saves", label: "저장", req: true },
    { key: "shares", label: "공유", req: true },
    { key: "reach", label: "도달", req: true },
  ];
  const missing = fields.filter((f) => f.req && !mapping[f.key]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>컬럼 매핑 설정</div>
        <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.65, marginBottom: 24 }}>
          파일의 컬럼명을 자동 인식하지 못했어요.<br />
          각 항목에 해당하는 컬럼을 직접 선택해주세요.
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
          <div style={{ fontSize: 12, color: "#e07755", marginTop: 8 }}>
            필수: {missing.map((f) => f.label).join(", ")}
          </div>
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
export default function Home() {
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
  const [aiSummary, setAiSummary] = useState("");
  const [aiInsights, setAiInsights] = useState({});
  const [aiChecklist, setAiChecklist] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
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
    if (missingReq.length) {
      setParsedRaw({ headers, rows });
      setShowMapping(true);
    } else {
      finalize(rows, mapping);
    }
  }

  function finalize(rows, mapping) {
    setShowMapping(false);
    const parsed = applyMapping(rows, mapping);
    if (!parsed.length) { setError("유효한 데이터 행이 없어요. 컬럼 매핑이나 데이터 형식을 확인해주세요."); return; }
    setError(""); setData(parsed); setView("dashboard");
    fetchAI(parsed);
  }

  async function fetchAI(posts) {
    setAiLoading(true); setAiSummary(""); setAiInsights({}); setAiChecklist([]); setAiError(false);
    try {
      const res = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ posts }) });
      if (!res.ok) throw new Error();
      const r = await res.json();
      if (r.error) throw new Error();
      setAiSummary(r.summary || ""); setAiInsights(r.insights || {}); setAiChecklist(r.checklist || []);
    } catch { setAiError(true); }
    finally { setAiLoading(false); }
  }

  function goBack() {
    setView("input"); setAiSummary(""); setAiInsights({}); setAiChecklist([]); setChecked({}); setAiError(false);
  }

  const sortedData = [...data].sort((a, b) => {
    const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
    const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? res : -res;
  });
  const maxes = {};
  ["likes","comments","saves","shares","reach"].forEach((k) => { maxes[k] = data.length ? Math.max(...data.map((d) => d[k])) : 0; });

  const checklistItems = aiChecklist.length ? aiChecklist : data.length ? (() => {
    const top = (k) => [...data].sort((a,b) => b[k]-a[k])[0];
    const bot = (k) => [...data].sort((a,b) => a[k]-b[k])[0];
    return [
      `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
      `저장 Best "${top("saves").title}" — 콘텐츠 형식 분석 후 유사 포맷 확장 기획`,
      top("shares").shares > avg(data,"shares") * 1.3 ? `공유 Best "${top("shares").title}" — 바이럴 트리거 기록, 다음 달 재시도` : `공유 수 전반 낮음 — 챌린지·공유 유도 포맷 테스트`,
      `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 해시태그 비교`,
      `Best 게시물 업로드 시간대·요일 정리 후 최적 타임 설정`,
      `감성형 vs 정보형 비율 분류 → 다음 달 콘텐츠 믹스 조정`,
    ];
  })() : [];

  const labels = data.map((d) => shortLabel(d.title));
  const fullTitles = data.map((d) => d.title);
  const reachScaleY = smartYScale(data, ["reach", ...data.map(() => 0)]);
  const trendScaleY = smartYScale(data, ["likes","comments","saves","shares"]);

  const reachData = {
    labels,
    datasets: [
      { label: "도달", data: data.map((d) => d.reach), backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 3, borderSkipped: false },
      { label: "총 인게이지먼트", data: data.map((d) => d.likes+d.comments+d.saves+d.shares), backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, borderSkipped: false },
    ],
  };

  const trendData = {
    labels,
    datasets: [
      { label: "좋아요", data: data.map((d) => d.likes), borderColor: "rgba(255,255,255,0.8)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "댓글", data: data.map((d) => d.comments), borderColor: "rgba(255,255,255,0.5)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "저장", data: data.map((d) => d.saves), borderColor: "rgba(255,255,255,0.3)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "공유", data: data.map((d) => d.shares), borderColor: "rgba(255,255,255,0.16)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
    ],
  };

  const donutData = {
    labels: ["좋아요","댓글","저장","공유"],
    datasets: [{
      data: ["likes","comments","saves","shares"].map((k) => data.reduce((s,d) => s+d[k], 0)),
      backgroundColor: ["rgba(255,255,255,0.82)","rgba(255,255,255,0.5)","rgba(255,255,255,0.3)","rgba(255,255,255,0.16)"],
      borderColor: "#111", borderWidth: 2, hoverOffset: 5,
    }],
  };

  /* Input Screen */
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
          <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#555", marginBottom: 14, fontWeight: 600 }}>
            Instagram Analytics — Marketer Dashboard
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 10, color: "#fff" }}>
            월간 인스타그램<br />성과 대시보드
          </h1>
          <p style={{ color: "#777", fontSize: 13.5, lineHeight: 1.65, marginBottom: 28 }}>
            이번 달 게시물 데이터를 올리면 지표별 Best 콘텐츠,<br />
            트렌드 차트, AI 인사이트를 한번에 뽑아드려요.
          </p>

          {/* Upload Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
            style={{ border: `1.5px dashed ${isDragging ? "#555" : "#252525"}`, background: isDragging ? "#111" : "transparent", borderRadius: 12, padding: "34px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: 12 }}
          >
            <input type="file" accept=".csv,.txt" ref={fileRef} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
            <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.35 }}>📂</div>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 6, fontWeight: 500 }}>CSV 파일 업로드</div>
            <div style={{ fontSize: 12, color: "#444" }}>클릭하거나 파일을 여기로 드래그하세요</div>
          </div>

          {selectedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "11px 16px", marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <span style={{ fontSize: 13, color: "#999", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile}</span>
              <button onClick={(e) => { e.stopPropagation(); setFileText(null); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Sample Download */}
          <button
            onClick={downloadSampleCSV}
            style={{ width: "100%", background: "transparent", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 0", fontSize: 12, color: "#666", cursor: "pointer", marginBottom: 16, fontFamily: "inherit" }}
          >
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
          <div style={{ fontSize: 11, color: "#3d3d3d", marginBottom: 14, lineHeight: 1.7 }}>
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
            <button onClick={() => { setData(SAMPLE_DATA); setView("dashboard"); fetchAI(SAMPLE_DATA); }} style={{ background: "transparent", color: "#555", border: "1px solid #1e1e1e", borderRadius: 10, padding: "13px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              샘플 보기
            </button>
          </div>
        </div>
      </div>
    </>
  );

  /* Dashboard */
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 64px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#555", marginBottom: 6, fontWeight: 600 }}>Instagram Analytics</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>월간 성과 대시보드</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>총 {data.length}개 게시물 분석</div>
        </div>
        <button onClick={goBack} style={{ background: "transparent", color: "#555", border: "1px solid #1e1e1e", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← 재입력</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { label: "총 게시물", val: `${data.length}개` },
          { label: "평균 좋아요", val: Math.round(avg(data,"likes")).toLocaleString() },
          { label: "평균 저장", val: Math.round(avg(data,"saves")).toLocaleString() },
          { label: "총 도달", val: data.reduce((s,d)=>s+d.reach,0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>AI 분석 요약</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px 22px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.35, display: "inline-block" }} />
          Claude AI 분석
        </div>
        {aiLoading && <div style={{ fontSize: 13, color: "#444", fontStyle: "italic" }}>데이터 분석 중...</div>}
        {!aiLoading && aiError && (
          <div style={{ fontSize: 12.5, color: "#777", lineHeight: 1.7 }}>
            AI 분석을 사용하려면 <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, color: "#999", fontSize: 11 }}>ANTHROPIC_API_KEY</code> 환경변수를 등록해주세요.
            <br />Vercel이라면 프로젝트 Settings → Environment Variables에서 추가하면 돼요.
          </div>
        )}
        {!aiLoading && !aiError && aiSummary && (
          <div style={{ fontSize: 13.5, color: "#bbb", lineHeight: 1.75 }}>{aiSummary}</div>
        )}
      </div>

      {/* Charts */}
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>데이터 흐름</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20, gridColumn: "span 2" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 4 }}>게시물별 도달 & 인게이지먼트</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>가로축: 게시물 제목 (앞 8자) / 실제 제목은 막대 위에 마우스를 올리면 확인 가능</div>
          <div style={{ height: 220 }}>
            <Bar data={reachData} options={barLineOpts({ min: 0 }, fullTitles)} />
          </div>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 4 }}>지표 추이</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>게시 순서에 따른 각 지표 변화 — 마우스 오버 시 전체 제목 표시</div>
          <div style={{ height: 200 }}>
            <Line data={trendData} options={barLineOpts(trendScaleY, fullTitles)} />
          </div>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 4 }}>인게이지먼트 구성 비율</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>총 인게이지먼트에서 각 지표의 비중</div>
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Doughnut data={donutData} options={{
              responsive: true, maintainAspectRatio: false, cutout: "68%",
              plugins: {
                legend: { labels: { color: "#888", font: { size: 11 }, boxWidth: 10, padding: 12 }, position: "right" },
                tooltip: { ...TOOLTIP, callbacks: { label: (ctx) => { const t = ctx.dataset.data.reduce((a,b)=>a+b,0); const p = t ? ((ctx.parsed/t)*100).toFixed(1) : 0; return ` ${ctx.parsed.toLocaleString()} (${p}%)`; } } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>지표별 최고 성과 콘텐츠</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginBottom: 28 }}>
        {METRIC_KEYS.map(({ key, label }) => {
          const top = [...data].sort((a,b) => b[key]-a[key])[0];
          const ratio = safeRatio(top[key], avg(data, key));
          const insight = aiInsights[key] || FALLBACK_INSIGHTS[key];
          return (
            <div key={key} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
                {ratio && <span style={{ fontSize: 10, color: "#aaa", background: "#181818", padding: "3px 8px", borderRadius: 20 }}>{ratio}</span>}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 5, letterSpacing: "-0.02em" }}>{top[key].toLocaleString()}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={top.title}>{top.title}</div>
              <div style={{ height: 1, background: "#1e1e1e", marginBottom: 12 }} />
              <div style={{ fontSize: 9.5, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>인사이트</div>
              <div style={{ fontSize: 12.5, color: aiInsights[key] ? "#aaa" : "#666", lineHeight: 1.65 }}>{insight}</div>
            </div>
          );
        })}
      </div>

      {/* Checklist */}
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>다음 달을 위한 체크리스트</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px 22px", marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 4 }}>{aiChecklist.length ? "AI 액션 플랜" : "데이터 기반 점검 항목"}</div>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 18 }}>
          {aiChecklist.length ? "Claude가 실제 수치 기반으로 도출한 다음 달 액션 포인트." : "인게이지먼트 패턴에서 도출한 액션 포인트."}
        </div>
        {checklistItems.map((item, i) => (
          <div key={i} onClick={() => setChecked((p) => ({ ...p, [i]: !p[i] }))} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: i < checklistItems.length - 1 ? "1px solid #161616" : "none", cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, border: `1.5px solid ${checked[i] ? "#fff" : "#2a2a2a"}`, borderRadius: 5, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: checked[i] ? "#fff" : "transparent", userSelect: "none" }}>
              {checked[i] && <span style={{ fontSize: 11, color: "#000", fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, flex: 1 }}>{item}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>전체 게시물</div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 620 }}>
          <thead>
            <tr>
              {[["title","게시물"],["date","날짜"],["likes","좋아요"],["comments","댓글"],["saves","저장"],["shares","공유"],["reach","도달"]].map(([k,l]) => (
                <th key={k} onClick={() => { if(sortKey===k) setSortAsc(p=>!p); else { setSortKey(k); setSortAsc(false); } }}
                  style={{ padding: "12px 16px", textAlign: "left", color: sortKey===k ? "#aaa" : "#444", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #1e1e1e", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                  {l}{sortKey===k ? (sortAsc?" ↑":" ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post, i) => (
              <tr key={i} style={{ borderBottom: i < sortedData.length - 1 ? "1px solid #141414" : "none" }}>
                <td style={{ padding: "11px 16px", color: "#ccc", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={post.title}>{post.title}</td>
                <td style={{ padding: "11px 16px", color: "#3d3d3d", fontFamily: "monospace", fontSize: 11 }}>{post.date}</td>
                {["likes","comments","saves","shares","reach"].map((k) => (
                  <td key={k} style={{ padding: "11px 16px", color: post[k]===maxes[k] ? "#fff" : "#888", fontWeight: post[k]===maxes[k] ? 600 : 400, fontFamily: "monospace", fontSize: 12 }}>
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
