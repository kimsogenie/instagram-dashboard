import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req) {
  try {
    const { platform, data, prevData } = await req.json();
    if (!data?.length) return Response.json({ error: "no data" }, { status: 400 });

    const metricKeys = platform === "facebook"
      ? ["reach", "views", "likes", "comments", "shares", "clicks"]
      : ["likes", "comments", "saves", "shares", "reach"];

    const metricLabels = platform === "facebook"
      ? { reach:"도달", views:"조회", likes:"좋아요", comments:"댓글", shares:"공유", clicks:"클릭" }
      : { likes:"좋아요", comments:"댓글", saves:"저장", shares:"공유", reach:"도달" };

    const avg = (k) => data.reduce((s, d) => s + (d[k] || 0), 0) / data.length;

    // 데이터 요약
    const summary = metricKeys.map(k => {
      const top = [...data].sort((a, b) => b[k] - a[k])[0];
      const bot = [...data].sort((a, b) => a[k] - b[k])[0];
      return `${metricLabels[k]}: 평균 ${Math.round(avg(k)).toLocaleString()}, Top "${top.title}" (${top[k].toLocaleString()}), Bottom "${bot.title}" (${bot[k].toLocaleString()})`;
    }).join("\n");

    const cats = [...new Set(data.map(d => d.category).filter(Boolean))];
    const catSummary = cats.length
      ? "\n\n카테고리별 평균:\n" + cats.map(cat => {
          const posts = data.filter(d => d.category === cat);
          return `${cat} (${posts.length}개): ` + metricKeys.map(k =>
            `${metricLabels[k]} ${Math.round(posts.reduce((s,d)=>s+(d[k]||0),0)/posts.length)}`
          ).join(", ");
        }).join("\n")
      : "";

    // 요일별 데이터 추출 (최적 게시 시간 분석용)
    const dayMap = {};
    const engKeys = platform === "facebook"
      ? ["likes","comments","shares","clicks"]
      : ["likes","comments","saves","shares"];
    data.forEach(d => {
      if (d.date) {
        const parsed = parseDate(d.date);
        if (parsed) {
          const day = ["일","월","화","수","목","금","토"][parsed.getDay()];
          if (!dayMap[day]) dayMap[day] = [];
          dayMap[day].push(d);
        }
      }
    });
    const dayAvgs = Object.entries(dayMap).map(([day, posts]) => {
      const totalEng = posts.reduce((s, d) => s + engKeys.reduce((e, k) => e + (d[k]||0), 0), 0);
      return { day, count: posts.length, avgEng: Math.round(totalEng / posts.length) };
    }).sort((a, b) => b.avgEng - a.avgEng);
    const dayInfo = dayAvgs.length
      ? "\n\n요일별 평균 인게이지먼트: " + dayAvgs.map(d => `${d.day}요일(${d.count}개, 평균${d.avgEng})`).join(", ")
      : "";

    const momSummary = prevData?.length
      ? "\n\n전월 대비: " + metricKeys.map(k => {
          const cur = avg(k);
          const prev = prevData.reduce((s,d)=>s+(d[k]||0),0)/prevData.length;
          const pct = ((cur-prev)/prev*100).toFixed(1);
          return `${metricLabels[k]} ${pct > 0 ? "+" : ""}${pct}%`;
        }).join(", ")
      : "";

    const prompt = `너는 SNS 마케팅 전문가야. 아래 ${platform === "facebook" ? "Facebook" : "Instagram"} 월간 성과 데이터를 분석해서 JSON을 반환해.

[이번 달 데이터 요약 — 총 ${data.length}개 게시물]
${summary}${catSummary}${dayInfo}${momSummary}

반환 형식 (JSON만, 설명 없이):
{
  "monthly_summary": "이번 달 전체 성과 핵심 요약 1-2문장 (가장 눈에 띄는 수치와 변화 언급, 전월 비교 데이터 있으면 포함)",
  "optimal_time": "요일별 데이터 기반으로 다음 달 최적 게시 요일 추천 1문장 (구체적인 요일과 이유 포함)",
  "insights": {
    ${metricKeys.map(k => `"${k}": "이 지표 Top 게시물에 대한 구체적 인사이트 (2문장, 다음 달 액션 포인트 포함)"`).join(",\n    ")}
  },
  "checklist": [
    "다음 달을 위한 구체적 액션 포인트 1",
    "다음 달을 위한 구체적 액션 포인트 2",
    "다음 달을 위한 구체적 액션 포인트 3",
    "다음 달을 위한 구체적 액션 포인트 4",
    "다음 달을 위한 구체적 액션 포인트 5",
    "다음 달을 위한 구체적 액션 포인트 6"
  ]
}

규칙:
- 반드시 한국어로
- 실제 데이터 수치와 게시물 제목을 언급할 것
- 추상적인 말 금지, 마케터가 바로 실행할 수 있는 내용으로
- JSON 외 다른 텍스트 절대 포함하지 말 것`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    return Response.json(parsed);
  } catch (e) {
    console.error("insights error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// 날짜 파싱 헬퍼 (서버사이드용)
function parseDate(str) {
  if (!str) return null;
  const s = str.trim();
  let d = null;
  if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(s)) {
    d = new Date(s.replace(/\//g, "-"));
  } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(s)) {
    const [m, dd, y] = s.split(/[\/\-]/);
    d = new Date(`${y}-${m}-${dd}`);
  } else if (/^\d{2}[\/\-]\d{2}$/.test(s)) {
    const y = new Date().getFullYear();
    const [m, dd] = s.split(/[\/\-]/);
    d = new Date(`${y}-${m}-${dd}`);
  }
  return d && !isNaN(d) ? d : null;
}
