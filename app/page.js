"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const Bar = dynamic(() => import("react-chartjs-2").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("react-chartjs-2").then((m) => m.Line), { ssr: false });
const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });

/* ── Sample Data ── */
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

/* ── Utilities ── */
function avg(data, key) {
  return data.reduce((s, d) => s + d[key], 0) / data.length;
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const hasHeader = isNaN(parseInt((lines[0].split(",")[2] || "").trim()));
  const result = [];
  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 7) continue;
    result.push({
      title: cols[0] || `게시물 ${i}`,
      date: cols[1] || "",
      likes: parseInt(cols[2]) || 0,
      comments: parseInt(cols[3]) || 0,
      saves: parseInt(cols[4]) || 0,
      shares: parseInt(cols[5]) || 0,
      reach: parseInt(cols[6]) || 0,
    });
  }
  return result;
}

function shortLabel(title, max = 9) {
  return title.length > max ? title.slice(0, max) + "…" : title;
}

/* ── Chart Options ── */
const GRID = "rgba(255,255,255,0.04)";
const TICK = "#2a2a2a";

const baseTooltip = {
  backgroundColor: "#181818",
  borderColor: "#2a2a2a",
  borderWidth: 1,
  titleColor: "#888",
  bodyColor: "#ccc",
  padding: 10,
};

/* ── Main Component ── */
export default function Home() {
  const [view, setView] = useState("input"); // "input" | "dashboard"
  const [csvText, setCsvText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileText, setFileText] = useState(null);
  const [error, setError] = useState("");
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState("reach");
  const [sortAsc, setSortAsc] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // AI state
  const [aiSummary, setAiSummary] = useState("");
  const [aiInsights, setAiInsights] = useState({});
  const [aiChecklist, setAiChecklist] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fileInputRef = useRef(null);

  const canGenerate = csvText.trim() || fileText;

  /* ── File Handling ── */
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileText(e.target.result);
      setSelectedFile(file.name);
      setError("");
    };
    reader.readAsText(file, "UTF-8");
  }

  function removeFile() {
    setFileText(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      readFile(file);
    }
  }

  /* ── Data Upload ── */
  function uploadData() {
    const raw = fileText || csvText;
    const parsed = parseCSV(raw);
    if (!parsed.length) {
      setError("데이터를 읽지 못했어요. 형식을 다시 확인해주세요.");
      return;
    }
    setError("");
    setData(parsed);
    setView("dashboard");
    fetchAiInsights(parsed);
  }

  function loadSample() {
    setData(SAMPLE_DATA);
    setView("dashboard");
    fetchAiInsights(SAMPLE_DATA);
  }

  function goBack() {
    setView("input");
    setAiSummary("");
    setAiInsights({});
    setAiChecklist([]);
    setCheckedItems({});
  }

  /* ── AI Insights ── */
  async function fetchAiInsights(posts) {
    setAiLoading(true);
    setAiSummary("");
    setAiInsights({});
    setAiChecklist([]);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
      });

      if (!res.ok) throw new Error("API error");

      const result = await res.json();
      setAiSummary(result.summary || "");
      setAiInsights(result.insights || {});
      setAiChecklist(result.checklist || []);
    } catch (e) {
      console.error(e);
      // silently fall back to static insights
    } finally {
      setAiLoading(false);
    }
  }

  /* ── Sort ── */
  function handleSort(key) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sortedData = [...data].sort((a, b) => {
    const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
    const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? res : -res;
  });

  const maxes = {};
  ["likes", "comments", "saves", "shares", "reach"].forEach((k) => {
    maxes[k] = data.length ? Math.max(...data.map((d) => d[k])) : 0;
  });

  function sortLabel(key, label) {
    if (sortKey !== key) return label;
    return label + (sortAsc ? " ↑" : " ↓");
  }

  /* ── Checklist ── */
  function toggleCheck(i) {
    setCheckedItems((p) => ({ ...p, [i]: !p[i] }));
  }

  const checklistItems = aiChecklist.length
    ? aiChecklist
    : (() => {
        if (!data.length) return [];
        const commentTop = [...data].sort((a, b) => b.comments - a.comments)[0];
        const savesTop = [...data].sort((a, b) => b.saves - a.saves)[0];
        const sharesTop = [...data].sort((a, b) => b.shares - a.shares)[0];
        const reachTop = [...data].sort((a, b) => b.reach - a.reach)[0];
        const reachBot = [...data].sort((a, b) => a.reach - b.reach)[0];
        return [
          `댓글 Best "${commentTop.title}" — 캡션에 질문이나 댓글 유도 CTA가 있었는지 확인, 있었다면 다음 달 캡션에 반영`,
          `저장 Best "${savesTop.title}" — 콘텐츠 형식 분석 후 동일 포맷 확장 주제 2~3개 기획`,
          sharesTop.shares > avg(data, "shares") * 1.3
            ? `공유 Best "${sharesTop.title}" — 바이럴 트리거 기록, 다음 달 유사 콘텐츠 1회 이상 재시도`
            : `공유 수 전반적으로 낮음 — 공유 유도 문구 또는 챌린지성 포맷 테스트 고려`,
          `도달 Top "${reachTop.title}" vs Bottom "${reachBot.title}" — 해시태그 조합 비교 기록`,
          `Best 게시물들의 업로드 시간대·요일 정리 — 인사이트 탭 확인 후 최적 타임 설정`,
          `좋아요/저장 비율 기준 감성형 vs 정보형 분류 → 다음 달 콘텐츠 믹스 비율 조정`,
        ];
      })();

  /* ── Chart Data ── */
  const labels = data.map((d) => shortLabel(d.title));

  const reachChartData = {
    labels,
    datasets: [
      {
        label: "도달",
        data: data.map((d) => d.reach),
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "총 인게이지먼트",
        data: data.map((d) => d.likes + d.comments + d.saves + d.shares),
        backgroundColor: "rgba(255,255,255,0.22)",
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const trendChartData = {
    labels,
    datasets: [
      { label: "좋아요", data: data.map((d) => d.likes), borderColor: "rgba(255,255,255,0.8)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "댓글", data: data.map((d) => d.comments), borderColor: "rgba(255,255,255,0.45)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "저장", data: data.map((d) => d.saves), borderColor: "rgba(255,255,255,0.28)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
      { label: "공유", data: data.map((d) => d.shares), borderColor: "rgba(255,255,255,0.16)", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, tension: 0.3 },
    ],
  };

  const totals = {
    likes: data.reduce((s, d) => s + d.likes, 0),
    comments: data.reduce((s, d) => s + d.comments, 0),
    saves: data.reduce((s, d) => s + d.saves, 0),
    shares: data.reduce((s, d) => s + d.shares, 0),
  };

  const donutChartData = {
    labels: ["좋아요", "댓글", "저장", "공유"],
    datasets: [{
      data: [totals.likes, totals.comments, totals.saves, totals.shares],
      backgroundColor: ["rgba(255,255,255,0.82)", "rgba(255,255,255,0.48)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0.14)"],
      borderColor: "#111",
      borderWidth: 2,
      hoverOffset: 4,
    }],
  };

  const chartScaleOpts = {
    x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 } } },
    y: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 } } },
  };

  const legendOpts = {
    labels: { color: "#3a3a3a", font: { size: 11 }, boxWidth: 10, padding: 14 },
    position: "top",
  };

  /* ── Render ── */
  if (view === "input") {
    return (
      <div className="input-screen">
        <div className="input-wrap">
          <div className="eyebrow">Instagram Analytics — Marketer Dashboard</div>
          <h1 className="big-title">
            월간 인스타그램<br />성과 대시보드
          </h1>
          <p className="sub-desc">
            이번 달 게시물 데이터를 올리면 지표별 Best 콘텐츠,<br />
            트렌드 차트, AI 인사이트를 한번에 뽑아드려요.
          </p>

          {/* Upload Zone */}
          <div
            className={`upload-zone${isDragging ? " drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv,.txt"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className="upload-icon">📂</div>
            <div className="upload-label">CSV 파일 업로드</div>
            <div className="upload-sub">클릭하거나 파일을 여기로 드래그하세요</div>
          </div>

          {selectedFile && (
            <div className="file-selected">
              <span>📄</span>
              <span className="file-name">{selectedFile}</span>
              <button className="file-remove" onClick={removeFile}>×</button>
            </div>
          )}

          <div className="or-divider"><span>OR</span></div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="데이터 직접 붙여넣기 (헤더행 포함/미포함 모두 가능)"
          />

          <div className="format-hint">
            형식: <span>제목, 날짜, 좋아요, 댓글, 저장, 공유, 도달</span><br />
            예시: <span>신제품 출시 영상, 09/03, 342, 67, 189, 45, 4820</span>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="btn-row">
            <button
              className="btn-primary"
              disabled={!canGenerate}
              onClick={uploadData}
            >
              대시보드 생성 →
            </button>
            <button className="btn-secondary" onClick={loadSample}>
              샘플 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Dashboard */
  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <div className="eyebrow">Instagram Analytics</div>
          <div className="dash-title">월간 성과 대시보드</div>
          <div className="dash-sub">총 {data.length}개 게시물 분석</div>
        </div>
        <button className="btn-back" onClick={goBack}>← 데이터 재입력</button>
      </div>

      {/* Summary */}
      <div className="summary-row">
        {[
          { label: "총 게시물", val: data.length + "개" },
          { label: "평균 좋아요", val: Math.round(avg(data, "likes")).toLocaleString() },
          { label: "평균 저장", val: Math.round(avg(data, "saves")).toLocaleString() },
          { label: "총 도달", val: data.reduce((s, d) => s + d.reach, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.val}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="section-label">AI 분석 요약</div>
      <div className="ai-summary-card">
        <div className="ai-badge">
          <span className="ai-dot" />
          Claude AI 분석
        </div>
        {aiLoading ? (
          <div className="ai-loading">데이터 분석 중...</div>
        ) : aiSummary ? (
          <div className="ai-summary-text">{aiSummary}</div>
        ) : (
          <div className="ai-loading" style={{ color: "#2a2a2a" }}>분석 결과를 불러오지 못했어요. API 키를 확인해주세요.</div>
        )}
      </div>

      {/* Charts */}
      <div className="section-label">데이터 흐름</div>
      <div className="chart-grid">
        <div className="chart-card wide">
          <div className="chart-title">게시물별 도달 & 인게이지먼트</div>
          <div className="chart-desc">도달과 총 인게이지먼트(좋아요+댓글+저장+공유)를 게시물별 비교</div>
          <div className="chart-box" style={{ height: 220 }}>
            <Bar
              data={reachChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: legendOpts,
                  tooltip: { ...baseTooltip, callbacks: { title: (items) => data[items[0].dataIndex]?.title } },
                },
                scales: chartScaleOpts,
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">지표 추이</div>
          <div className="chart-desc">게시 순서에 따른 각 지표 변화</div>
          <div className="chart-box" style={{ height: 200 }}>
            <Line
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: legendOpts,
                  tooltip: { ...baseTooltip, callbacks: { title: (items) => data[items[0].dataIndex]?.title } },
                },
                scales: chartScaleOpts,
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">인게이지먼트 구성 비율</div>
          <div className="chart-desc">총 인게이지먼트에서 각 지표가 차지하는 비중</div>
          <div className="chart-box" style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Doughnut
              data={donutChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                  legend: { ...legendOpts, position: "right" },
                  tooltip: {
                    ...baseTooltip,
                    callbacks: {
                      label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ` ${ctx.parsed.toLocaleString()} (${pct}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="section-label">지표별 최고 성과 콘텐츠</div>
      <div className="metric-grid">
        {METRIC_KEYS.map(({ key, label }) => {
          const top = [...data].sort((a, b) => b[key] - a[key])[0];
          const ratio = ((top[key] / avg(data, key) - 1) * 100).toFixed(0);
          const insight = aiInsights[key] || FALLBACK_INSIGHTS[key];
          return (
            <div key={key} className="metric-card">
              <div className="metric-header">
                <span className="metric-name">{label}</span>
                <span className="metric-badge">+{ratio}%</span>
              </div>
              <div className="metric-number">{top[key].toLocaleString()}</div>
              <div className="metric-post-title" title={top.title}>{top.title}</div>
              <div className="divider" />
              <div className="insight-label">인사이트</div>
              <div className={`insight-text${aiInsights[key] ? " ai-loaded" : ""}`}>{insight}</div>
            </div>
          );
        })}
      </div>

      {/* Checklist */}
      <div className="section-label">다음 달을 위한 체크리스트</div>
      <div className="checklist-card">
        <div className="checklist-title">
          {aiChecklist.length ? "AI가 생성한 액션 플랜" : "데이터 기반 점검 항목"}
        </div>
        <div className="checklist-sub">
          {aiChecklist.length
            ? "이번 달 실제 수치를 바탕으로 Claude가 도출한 다음 달 액션 포인트예요."
            : "인게이지먼트 패턴에서 도출한 액션 포인트예요."}
        </div>
        {checklistItems.map((item, i) => (
          <div key={i} className="check-item" onClick={() => toggleCheck(i)}>
            <div className={`check-box${checkedItems[i] ? " checked" : ""}`}>
              {checkedItems[i] && <span className="check-mark">✓</span>}
            </div>
            <div className="check-text">{item}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="section-label">전체 게시물</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                { key: "title", label: "게시물" },
                { key: "date", label: "날짜" },
                { key: "likes", label: "좋아요" },
                { key: "comments", label: "댓글" },
                { key: "saves", label: "저장" },
                { key: "shares", label: "공유" },
                { key: "reach", label: "도달" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className={sortKey === key ? "active" : ""}
                  onClick={() => handleSort(key)}
                >
                  {sortLabel(key, label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post, i) => (
              <tr key={i}>
                <td title={post.title}>{post.title}</td>
                <td className="date-cell">{post.date}</td>
                <td className={post.likes === maxes.likes ? "top-cell" : "num-cell"}>{post.likes.toLocaleString()}</td>
                <td className={post.comments === maxes.comments ? "top-cell" : "num-cell"}>{post.comments.toLocaleString()}</td>
                <td className={post.saves === maxes.saves ? "top-cell" : "num-cell"}>{post.saves.toLocaleString()}</td>
                <td className={post.shares === maxes.shares ? "top-cell" : "num-cell"}>{post.shares.toLocaleString()}</td>
                <td className={post.reach === maxes.reach ? "top-cell" : "num-cell"}>{post.reach.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
