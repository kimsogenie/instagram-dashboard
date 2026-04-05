import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { posts } = await req.json();

    if (!posts || !posts.length) {
      return Response.json({ error: "데이터가 없습니다." }, { status: 400 });
    }

    const dataText = posts
      .map(
        (p, i) =>
          `${i + 1}. "${p.title}" (${p.date}) — 좋아요:${p.likes} 댓글:${p.comments} 저장:${p.saves} 공유:${p.shares} 도달:${p.reach}`
      )
      .join("\n");

    const prompt = `당신은 인스타그램 마케터 전용 데이터 분석 도우미입니다.
아래는 이번 달 인스타그램 게시물 성과 데이터입니다. 실제 수치를 근거로 분석해주세요.

[이번 달 게시물 데이터]
${dataText}

다음 JSON 형식으로만 응답하세요. JSON 이외에 다른 텍스트는 절대 포함하지 마세요.

{
  "summary": "이번 달 전반적 성과 요약 (2~3문장, 구체적 수치 언급)",
  "insights": {
    "likes": "좋아요 최고 콘텐츠 기반 구체적 인사이트 (1~2문장)",
    "comments": "댓글 최고 콘텐츠 기반 구체적 인사이트 (1~2문장)",
    "saves": "저장 최고 콘텐츠 기반 구체적 인사이트 (1~2문장)",
    "shares": "공유 최고 콘텐츠 기반 구체적 인사이트 (1~2문장)",
    "reach": "도달 최고 콘텐츠 기반 구체적 인사이트 (1~2문장)"
  },
  "checklist": [
    "데이터 기반 액션 항목 1",
    "데이터 기반 액션 항목 2",
    "데이터 기반 액션 항목 3",
    "데이터 기반 액션 항목 4",
    "데이터 기반 액션 항목 5",
    "데이터 기반 액션 항목 6"
  ]
}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return Response.json(result);
  } catch (err) {
    console.error("Insights API error:", err);
    return Response.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
