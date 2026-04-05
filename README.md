# 인스타그램 월간 성과 대시보드

마케터 전용 인스타그램 데이터 분석 대시보드.  
CSV 파일 업로드 → 지표별 Best 콘텐츠 + 차트 + Claude AI 인사이트 자동 생성.

---

## 배포 방법 (Vercel)

### 1단계 — GitHub에 올리기

```bash
# 터미널에서 프로젝트 폴더로 이동 후
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/본인아이디/instagram-dashboard.git
git push -u origin main
```

### 2단계 — Vercel 배포

1. vercel.com 접속 → `New Project`
2. GitHub 저장소 선택
3. **Environment Variables** 탭에서 추가:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (Anthropic 콘솔에서 복사)
4. `Deploy` 클릭

---

## 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일 열어서 ANTHROPIC_API_KEY 값 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## CSV 데이터 형식

```
제목, 날짜, 좋아요, 댓글, 저장, 공유, 도달
신제품 출시 영상, 09/03, 342, 67, 189, 45, 4820
브랜드 히스토리 카드뉴스, 09/07, 198, 12, 412, 23, 3210
```

헤더행 있어도 없어도 자동 파싱됩니다.

---

## 기술 스택

- Next.js 14
- Anthropic API (claude-haiku)
- Chart.js + react-chartjs-2
- Vercel
