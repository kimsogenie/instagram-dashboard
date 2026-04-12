"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const Bar      = dynamic(() => import("react-chartjs-2").then((m) => m.Bar),      { ssr: false });
const Line     = dynamic(() => import("react-chartjs-2").then((m) => m.Line),     { ssr: false });
const Doughnut = dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), { ssr: false });

/* ═══════════════════════════════════════
   NEON PALETTE
═══════════════════════════════════════ */
const NEON = {
  likes:"#ff6b9d", comments:"#00d4ff", saves:"#7fff6b",
  shares:"#ffb347", reach:"#c084fc", views:"#38bdf8",
  clicks:"#f472b6", reach2:"#3b82f6",
};
const METRIC_COLOR = (k) => NEON[k] || "#fff";
const DAYS_KO = ["일","월","화","수","목","금","토"];
const DAY_COLORS = ["#c084fc","#ff6b9d","#00d4ff","#7fff6b","#ffb347","#f472b6","#38bdf8"];

/* ═══════════════════════════════════════
   PLATFORM CONFIGS
═══════════════════════════════════════ */
const PLATFORMS = {
  instagram: {
    id:"instagram", name:"Instagram", emoji:"📸", accent:"#e1306c",
    metricKeys:["likes","comments","saves","shares","reach"],
    metricLabels:{ likes:"좋아요", comments:"댓글", saves:"저장", shares:"공유", reach:"도달" },
    requiredNumeric:["likes","comments","saves","shares","reach"],
    engagementKeys:["likes","comments","saves","shares"],
    engagementLabels:["좋아요","댓글","저장","공유"],
    colAliases:{
      title:["제목","title","콘텐츠","content","게시물","post","이름","name"],
      date:["날짜","date","일자","업로드일","게시일"],
      category:["카테고리","category","분류","유형","type","콘텐츠 유형"],
      likes:["좋아요","like","likes","좋아요수"],
      comments:["댓글","comment","comments","댓글수"],
      saves:["저장","save","saves","저장수","bookmark"],
      shares:["공유","share","shares","공유수"],
      reach:["도달","reach","노출","impression","impressions","도달수"],
    },
    filterOptions:[
      { label:"도달 Top 3",  sortKey:"reach" },
      { label:"좋아요 Top 3", sortKey:"likes" },
      { label:"댓글 Top 3",  sortKey:"comments" },
    ],
    mainBarLabel:"도달 & 인게이지먼트",
    summaryCards:(data,prev)=>[
      { label:"총 게시물",  val:`${data.length}개`,                           prev: prev ? `${prev.length}개` : null },
      { label:"평균 좋아요", val:Math.round(avg(data,"likes")).toLocaleString(), prevNum: prev ? avg(prev,"likes") : null, curNum: avg(data,"likes") },
      { label:"평균 저장",  val:Math.round(avg(data,"saves")).toLocaleString(), prevNum: prev ? avg(prev,"saves") : null, curNum: avg(data,"saves") },
      { label:"총 도달",    val:data.reduce((s,d)=>s+d.reach,0).toLocaleString(), prevNum: prev ? prev.reduce((s,d)=>s+d.reach,0) : null, curNum: data.reduce((s,d)=>s+d.reach,0) },
    ],
    sampleCSV:"제목,날짜,카테고리,좋아요,댓글,저장,공유,도달\n신제품 출시 비하인드 컷,2025/03/03,제품,342,67,189,45,4820\n브랜드 히스토리 카드뉴스,2025/03/07,브랜드,198,12,412,23,3210\n이벤트 댓글로 친구 태그,2025/03/10,이벤트,521,234,43,187,7840\n가을 캠페인 티저 영상,2025/03/14,캠페인,689,89,156,92,9200\n제품 사용법 How-to,2025/03/18,정보,243,31,567,34,3890\n직원 인터뷰 릴스,2025/03/21,브랜드,412,56,89,123,6540\n오늘 뭐 입지 스타일링,2025/03/24,제품,578,145,234,67,7100\nOOTD 콜라보 챌린지,2025/03/27,이벤트,445,198,78,312,8200",
    sampleData:[
      { title:"신제품 출시 비하인드 컷", date:"2025/03/03", category:"제품", likes:342, comments:67, saves:189, shares:45, reach:4820 },
      { title:"브랜드 히스토리 카드뉴스", date:"2025/03/07", category:"브랜드", likes:198, comments:12, saves:412, shares:23, reach:3210 },
      { title:"이벤트 댓글로 친구 태그", date:"2025/03/10", category:"이벤트", likes:521, comments:234, saves:43, shares:187, reach:7840 },
      { title:"가을 캠페인 티저 영상", date:"2025/03/14", category:"캠페인", likes:689, comments:89, saves:156, shares:92, reach:9200 },
      { title:"제품 사용법 How-to", date:"2025/03/18", category:"정보", likes:243, comments:31, saves:567, shares:34, reach:3890 },
      { title:"직원 인터뷰 릴스", date:"2025/03/21", category:"브랜드", likes:412, comments:56, saves:89, shares:123, reach:6540 },
      { title:"오늘 뭐 입지 스타일링", date:"2025/03/24", category:"제품", likes:578, comments:145, saves:234, shares:67, reach:7100 },
      { title:"OOTD 콜라보 챌린지", date:"2025/03/27", category:"이벤트", likes:445, comments:198, saves:78, shares:312, reach:8200 },
    ],
    defaultChecklist:(data)=>{
      const top=(k)=>[...data].sort((a,b)=>b[k]-a[k])[0];
      const bot=(k)=>[...data].sort((a,b)=>a[k]-b[k])[0];
      return [
        `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
        `저장 Best "${top("saves").title}" — 콘텐츠 형식 분석 후 유사 포맷 확장 기획`,
        top("shares").shares>avg(data,"shares")*1.3?`공유 Best "${top("shares").title}" — 바이럴 트리거 기록, 다음 달 재시도`:`공유 수 전반 낮음 — 챌린지·공유 유도 포맷 테스트`,
        `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 해시태그 비교`,
        `Best 게시물 업로드 시간대·요일 정리 후 최적 타임 설정`,
        `감성형 vs 정보형 비율 분류 → 다음 달 콘텐츠 믹스 조정`,
      ];
    },
    fallbackInsights:{
      likes:"비주얼·감성 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
      comments:"캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요. 멘션·이벤트성 포스팅이었는지도 확인하세요.",
      saves:"정보성·유용성이 높은 콘텐츠. 저장 유도 문구 또는 팁·리스트·가이드 형식이었을 가능성이 높아요.",
      shares:"공유 유도 문구나 챌린지·밈·공감형 요소가 있었을 가능성. 바이럴 트리거가 무엇이었는지 분석해두세요.",
      reach:"해시태그 전략이 잘 먹혔거나 탐색 피드 유입이 많았을 가능성. 이 포스팅의 해시태그 조합을 기록해두세요.",
    },
  },
  facebook: {
    id:"facebook", name:"Facebook", emoji:"📘", accent:"#1877f2",
    metricKeys:["reach","views","likes","comments","shares","clicks"],
    metricLabels:{ reach:"도달", views:"조회", likes:"좋아요", comments:"댓글", shares:"공유", clicks:"클릭" },
    requiredNumeric:["reach","views","likes","comments","shares","clicks"],
    engagementKeys:["likes","comments","shares","clicks"],
    engagementLabels:["좋아요","댓글","공유","클릭"],
    colAliases:{
      title:["제목","title","콘텐츠","content","게시물","post","이름","name"],
      date:["날짜","date","일자","업로드일","게시일"],
      category:["카테고리","category","분류","유형","type","콘텐츠 유형"],
      reach:["도달","reach","도달수"],
      views:["조회","view","views","조회수","재생","impression","impressions","노출"],
      likes:["좋아요","like","likes","좋아요수","reaction","reactions"],
      comments:["댓글","comment","comments","댓글수"],
      shares:["공유","share","shares","공유수"],
      clicks:["클릭","click","clicks","클릭수","link click","링크 클릭"],
    },
    filterOptions:[
      { label:"도달 Top 3",  sortKey:"reach" },
      { label:"조회 Top 3",  sortKey:"views" },
      { label:"클릭 Top 3",  sortKey:"clicks" },
    ],
    mainBarLabel:"도달 & 조회",
    summaryCards:(data,prev)=>[
      { label:"총 게시물",  val:`${data.length}개`,                           prev: prev ? `${prev.length}개` : null },
      { label:"평균 도달",  val:Math.round(avg(data,"reach")).toLocaleString(), prevNum: prev ? avg(prev,"reach") : null, curNum: avg(data,"reach") },
      { label:"평균 조회",  val:Math.round(avg(data,"views")).toLocaleString(), prevNum: prev ? avg(prev,"views") : null, curNum: avg(data,"views") },
      { label:"평균 클릭",  val:Math.round(avg(data,"clicks")).toLocaleString(), prevNum: prev ? avg(prev,"clicks") : null, curNum: avg(data,"clicks") },
    ],
    sampleCSV:"제목,날짜,카테고리,도달,조회,좋아요,댓글,공유,클릭\n신제품 출시 영상,2025/03/03,제품,12400,8200,342,67,45,289\n브랜드 히스토리,2025/03/07,브랜드,9800,5100,198,22,33,145\n이벤트 공지,2025/03/10,이벤트,21300,14800,521,234,187,892\n가을 캠페인 티저,2025/03/14,캠페인,18700,12100,689,89,92,456\n제품 사용법 영상,2025/03/18,정보,9200,7300,243,31,34,312\n직원 인터뷰,2025/03/21,브랜드,11500,6800,412,56,123,201\n스타일링 제안,2025/03/24,제품,15600,9400,578,145,67,534\n콜라보 챌린지,2025/03/27,이벤트,19800,13200,445,198,312,778",
    sampleData:[
      { title:"신제품 출시 영상", date:"2025/03/03", category:"제품", reach:12400, views:8200, likes:342, comments:67, shares:45, clicks:289 },
      { title:"브랜드 히스토리", date:"2025/03/07", category:"브랜드", reach:9800, views:5100, likes:198, comments:22, shares:33, clicks:145 },
      { title:"이벤트 공지", date:"2025/03/10", category:"이벤트", reach:21300, views:14800, likes:521, comments:234, shares:187, clicks:892 },
      { title:"가을 캠페인 티저", date:"2025/03/14", category:"캠페인", reach:18700, views:12100, likes:689, comments:89, shares:92, clicks:456 },
      { title:"제품 사용법 영상", date:"2025/03/18", category:"정보", reach:9200, views:7300, likes:243, comments:31, shares:34, clicks:312 },
      { title:"직원 인터뷰", date:"2025/03/21", category:"브랜드", reach:11500, views:6800, likes:412, comments:56, shares:123, clicks:201 },
      { title:"스타일링 제안", date:"2025/03/24", category:"제품", reach:15600, views:9400, likes:578, comments:145, shares:67, clicks:534 },
      { title:"콜라보 챌린지", date:"2025/03/27", category:"이벤트", reach:19800, views:13200, likes:445, comments:198, shares:312, clicks:778 },
    ],
    defaultChecklist:(data)=>{
      const top=(k)=>[...data].sort((a,b)=>b[k]-a[k])[0];
      const bot=(k)=>[...data].sort((a,b)=>a[k]-b[k])[0];
      return [
        `댓글 Best "${top("comments").title}" — 캡션 CTA 여부 확인, 다음 달 반영`,
        `클릭 Best "${top("clicks").title}" — CTA 문구·링크 배치 기록 후 반복 적용`,
        `공유 Best "${top("shares").title}" — 바이럴 트리거 분석, 다음 달 재시도`,
        `도달 Top "${top("reach").title}" vs Bottom "${bot("reach").title}" — 타겟 설정·게시 시간 비교`,
        `조회 수 높은 게시물의 영상 길이·썸네일 패턴 기록`,
        `좋아요/클릭 비율 기준 감성형 vs 정보형 분류 → 다음 달 콘텐츠 믹스 조정`,
      ];
    },
    fallbackInsights:{
      reach:"도달이 높은 게시물. 게시 시간대, 타겟 설정을 기록해두고 다음 포스팅에 동일 조건을 적용해보세요.",
      views:"조회 수가 높은 콘텐츠. 썸네일 또는 영상 첫 3초가 주목을 끌었을 가능성. 동일 포맷 반복을 검토하세요.",
      likes:"감성·비주얼 퀄리티가 높은 콘텐츠. 게시 시간대와 이미지 스타일을 기록하고 유사 포맷 반복 여부를 검토하세요.",
      comments:"캡션에 질문형 CTA나 댓글 유도 문구가 있었을 가능성이 높아요.",
      shares:"공유 유도 문구나 챌린지·공감형 요소가 있었을 가능성. 바이럴 트리거를 분석해두세요.",
      clicks:"링크 클릭이 높은 콘텐츠. CTA 문구, 링크 위치, 랜딩페이지 연결이 잘 됐을 가능성.",
    },
  },
};

/* ═══════════════════════════════════════
   CSV PARSING
═══════════════════════════════════════ */
function splitCSVLine(line) {
  const cols=[]; let cur=""; let inQ=false;
  for(const ch of line){
    if(ch==='"'){inQ=!inQ;}
    else if(ch===','&&!inQ){cols.push(cur.trim());cur="";}
    else{cur+=ch;}
  }
  cols.push(cur.trim());
  return cols;
}

function parseRawCSV(text) {
  const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2) return {headers:[],rows:[]};
  const headers=splitCSVLine(lines[0]).map(h=>h.replace(/^\uFEFF/,""));
  const rows=lines.slice(1).map(line=>{
    const cols=splitCSVLine(line);
    const obj={};
    headers.forEach((h,i)=>{obj[h]=cols[i]??""});
    return obj;
  });
  return {headers,rows};
}

function autoDetectMapping(aliases,headers) {
  const mapping={}; const lower=headers.map(h=>h.toLowerCase());
  for(const [field,aliasList] of Object.entries(aliases)){
    for(const alias of aliasList){
      const idx=lower.findIndex(h=>h.includes(alias.toLowerCase()));
      if(idx!==-1){mapping[field]=headers[idx];break;}
    }
  }
  return mapping;
}

function toInt(val){
  if(!val) return 0;
  return parseInt(String(val).replace(/[,\s"']/g,""),10)||0;
}

function applyMapping(rows,mapping,metricKeys){
  return rows.map((row,i)=>{
    const obj={
      title:row[mapping.title]||`게시물 ${i+1}`,
      date:row[mapping.date]||"",
      category:row[mapping.category]||"",
    };
    metricKeys.forEach(k=>{obj[k]=toInt(row[mapping[k]]);});
    return obj;
  }).filter(d=>metricKeys.some(k=>d[k]>0));
}

/* ═══════════════════════════════════════
   DATE PARSING → DAY OF WEEK
═══════════════════════════════════════ */
function parseDate(str) {
  if(!str) return null;
  // Supported: YYYY/MM/DD, YYYY-MM-DD, MM/DD/YYYY, MM/DD (assume current year)
  let d=null;
  const s=str.trim();
  if(/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(s)){
    d=new Date(s.replace(/\//g,"-"));
  } else if(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(s)){
    const [m,dd,y]=s.split(/[\/\-]/);
    d=new Date(`${y}-${m}-${dd}`);
  } else if(/^\d{2}[\/\-]\d{2}$/.test(s)){
    const y=new Date().getFullYear();
    const [m,dd]=s.split(/[\/\-]/);
    d=new Date(`${y}-${m}-${dd}`);
  }
  return d&&!isNaN(d)?d:null;
}

function getDayOfWeek(dateStr){
  const d=parseDate(dateStr);
  return d?DAYS_KO[d.getDay()]:null;
}

/* ═══════════════════════════════════════
   UTILITIES
═══════════════════════════════════════ */
const avg=(data,key)=>data.length?data.reduce((s,d)=>s+(d[key]||0),0)/data.length:0;
const safeRatio=(top,mean)=>mean>0?`+${((top/mean-1)*100).toFixed(0)}%`:null;
const shortLabel=(t,max=8)=>t.length>max?t.slice(0,max)+"…":t;
const momChange=(cur,prev)=>{
  if(!prev||prev===0) return null;
  const pct=((cur-prev)/prev*100);
  return {pct:pct.toFixed(1),up:pct>=0};
};

function downloadSampleCSV(platform){
  const cfg=PLATFORMS[platform];
  const blob=new Blob(["\uFEFF"+cfg.sampleCSV],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`${platform}_sample_template.csv`; a.click();
  URL.revokeObjectURL(url);
}

function smartYScale(data,keys){
  const vals=data.flatMap(d=>keys.map(k=>d[k]||0)).filter(v=>v>0);
  if(!vals.length) return {};
  const max=Math.max(...vals), min=Math.min(...vals);
  const pad=Math.max((max-min)*0.18,max*0.08);
  return {min:Math.max(0,min-pad),max:max+pad};
}

/* ═══════════════════════════════════════
   CHART OPTIONS
═══════════════════════════════════════ */
const TOOLTIP={backgroundColor:"#141414",borderColor:"#2a2a2a",borderWidth:1,titleColor:"#fff",bodyColor:"#ddd",padding:10};
const GRID_C="rgba(255,255,255,0.06)";
const TICK_C="#888";

const makeChartOpts=(scaleY,fullTitles)=>({
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{labels:{color:"#ccc",font:{size:11},boxWidth:10,padding:14},position:"top"},
    tooltip:{...TOOLTIP,callbacks:{title:(items)=>fullTitles[items[0].dataIndex]||""}},
  },
  scales:{
    x:{grid:{color:GRID_C},ticks:{color:TICK_C,font:{size:10},maxRotation:35}},
    y:{grid:{color:GRID_C},ticks:{color:TICK_C,font:{size:10}},...scaleY},
  },
});

/* ═══════════════════════════════════════
   LOCALSTORAGE
═══════════════════════════════════════ */
const LS_KEY=(platform)=>`sna_dashboard_${platform}`;

function saveToStorage(platform,data,prevData){
  try{ localStorage.setItem(LS_KEY(platform),JSON.stringify({data,prevData,savedAt:new Date().toISOString()})); }
  catch(e){}
}

function loadFromStorage(platform){
  try{
    const raw=localStorage.getItem(LS_KEY(platform));
    return raw?JSON.parse(raw):null;
  } catch(e){ return null; }
}

function clearStorage(platform){
  try{ localStorage.removeItem(LS_KEY(platform)); } catch(e){}
}

/* ═══════════════════════════════════════
   MAPPING UI
═══════════════════════════════════════ */
function MappingUI({platform,headers,initialMapping,onConfirm,onCancel}){
  const cfg=PLATFORMS[platform];
  const [mapping,setMapping]=useState(initialMapping);
  const fields=[
    {key:"title",label:"게시물 제목",req:false},
    {key:"date",label:"날짜",req:false},
    {key:"category",label:"카테고리",req:false},
    ...cfg.metricKeys.map(k=>({key:k,label:cfg.metricLabels[k],req:true})),
  ];
  const missing=fields.filter(f=>f.req&&!mapping[f.key]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
      <div style={{background:"#111",border:"1px solid #222",borderRadius:14,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:8}}>컬럼 매핑 설정</div>
        <div style={{fontSize:12.5,color:"#666",lineHeight:1.65,marginBottom:24}}>파일의 컬럼명을 자동 인식하지 못했어요.<br/>각 항목에 해당하는 컬럼을 직접 선택해주세요.</div>
        {fields.map(({key,label,req})=>(
          <div key={key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontSize:13,color:"#999",minWidth:90}}>{label}{req&&<span style={{color:"#e05555",marginLeft:2}}>*</span>}</div>
            <select style={{flex:1,background:"#0c0c0c",border:"1px solid #252525",borderRadius:8,color:"#ccc",padding:"8px 10px",fontSize:12,fontFamily:"inherit",outline:"none"}}
              value={mapping[key]||""}
              onChange={e=>setMapping(p=>({...p,[key]:e.target.value||undefined}))}>
              <option value="">— 선택 안 함 —</option>
              {headers.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
        {missing.length>0&&<div style={{fontSize:12,color:"#e07755",marginTop:8}}>필수: {missing.map(f=>f.label).join(", ")}</div>}
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onCancel} style={{background:"transparent",border:"1px solid #222",borderRadius:8,color:"#666",padding:"10px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
          <button disabled={missing.length>0} onClick={()=>onConfirm(mapping)}
            style={{flex:1,background:missing.length?"#181818":"#fff",color:missing.length?"#333":"#000",border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:missing.length?"default":"pointer",fontFamily:"inherit"}}>
            이 설정으로 분석하기 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   FILE UPLOAD BLOCK
═══════════════════════════════════════ */
function FileUpload({label,selectedFile,onFile,onRemove,fileRef}){
  const[drag,setDrag]=useState(false);
  return(
    <div>
      <div onClick={()=>fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)onFile(f);}}
        style={{border:`1.5px dashed ${drag?"#555":"#252525"}`,background:drag?"#111":"transparent",borderRadius:10,padding:"22px 24px",textAlign:"center",cursor:"pointer",marginBottom:10}}>
        <input type="file" accept=".csv,.txt" ref={fileRef} style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);}}/>
        <div style={{fontSize:20,marginBottom:6,opacity:0.4}}>📂</div>
        <div style={{fontSize:13,color:"#888",fontWeight:500}}>{label}</div>
        <div style={{fontSize:11,color:"#555",marginTop:4}}>클릭하거나 파일을 드래그하세요</div>
      </div>
      {selectedFile&&(
        <div style={{display:"flex",alignItems:"center",gap:10,background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
          <span style={{fontSize:13}}>📄</span>
          <span style={{fontSize:12,color:"#999",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selectedFile}</span>
          <button onClick={e=>{e.stopPropagation();onRemove();}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN
═══════════════════════════════════════ */
export default function Home(){
  const[view,setView]=useState("input");
  const[platform,setPlatform]=useState("instagram");
  // current month
  const[csvText,setCsvText]=useState("");
  const[fileText,setFileText]=useState(null);
  const[selectedFile,setSelectedFile]=useState(null);
  // prev month
  const[prevCsvText,setPrevCsvText]=useState("");
  const[prevFileText,setPrevFileText]=useState(null);
  const[prevSelectedFile,setPrevSelectedFile]=useState(null);
  const[showPrevUpload,setShowPrevUpload]=useState(false);
  // data
  const[data,setData]=useState([]);
  const[prevData,setPrevData]=useState(null);
  const[savedAt,setSavedAt]=useState(null);
  // ui
  const[error,setError]=useState("");
  const[parsedRaw,setParsedRaw]=useState(null);
  const[showMapping,setShowMapping]=useState(false);
  const[mappingTarget,setMappingTarget]=useState("current"); // "current"|"prev"
  const[sortKey,setSortKey]=useState("reach");
  const[sortAsc,setSortAsc]=useState(false);
  const[checked,setChecked]=useState({});
  const dashRef=useRef(null);
  const fileRef=useRef(null);
  const prevFileRef=useRef(null);

  const cfg=PLATFORMS[platform];

  // localStorage load on mount
  useEffect(()=>{
    const saved=loadFromStorage(platform);
    if(saved?.data?.length){
      setData(saved.data);
      setPrevData(saved.prevData||null);
      setSavedAt(saved.savedAt);
      setView("dashboard");
    }
  },[platform]);

  function selectPlatform(p){
    if(p===platform) return;
    setPlatform(p);
    setSortKey(PLATFORMS[p].metricKeys[0]);
    setData([]); setPrevData(null); setSavedAt(null); setChecked({});
    setCsvText(""); setFileText(null); setSelectedFile(null);
    setPrevCsvText(""); setPrevFileText(null); setPrevSelectedFile(null);
    setShowPrevUpload(false); setError("");
    // load storage for new platform
    const saved=loadFromStorage(p);
    if(saved?.data?.length){
      setData(saved.data); setPrevData(saved.prevData||null); setSavedAt(saved.savedAt);
      setView("dashboard");
    } else {
      setView("input");
    }
  }

  function readFile(file,setter){
    const r=new FileReader();
    r.onload=e=>setter(e.target.result);
    r.readAsText(file,"UTF-8");
  }

  function uploadData(){
    const raw=fileText||csvText;
    if(!raw?.trim()){setError("이번 달 데이터를 입력해주세요.");return;}
    const{headers,rows}=parseRawCSV(raw);
    if(!headers.length){setError("파일을 읽지 못했어요.");return;}
    const mapping=autoDetectMapping(cfg.colAliases,headers);
    const missingReq=cfg.requiredNumeric.filter(k=>!mapping[k]);
    if(missingReq.length){setParsedRaw({headers,rows});setMappingTarget("current");setShowMapping(true);}
    else{finalizeMain(rows,mapping);}
  }

  function finalizeMain(rows,mapping){
    setShowMapping(false);
    const parsed=applyMapping(rows,mapping,cfg.metricKeys);
    if(!parsed.length){setError("유효한 데이터 행이 없어요.");return;}

    // parse prev if provided
    const prevRaw=prevFileText||prevCsvText;
    if(prevRaw?.trim()){
      const{headers:ph,rows:pr}=parseRawCSV(prevRaw);
      const pm=autoDetectMapping(cfg.colAliases,ph);
      const missingPrev=cfg.requiredNumeric.filter(k=>!pm[k]);
      if(missingPrev.length){
        setParsedRaw({headers:ph,rows:pr,mainData:parsed});
        setMappingTarget("prev");
        setShowMapping(true);
        return;
      }
      const pp=applyMapping(pr,pm,cfg.metricKeys);
      finalizeBoth(parsed,pp);
    } else {
      finalizeBoth(parsed,null);
    }
  }

  function finalizeBoth(current,prev){
    setShowMapping(false);
    setError("");
    setData(current);
    setPrevData(prev);
    const now=new Date().toISOString();
    setSavedAt(now);
    saveToStorage(platform,current,prev);
    setView("dashboard");
  }

  function handleMappingConfirm(mapping){
    if(mappingTarget==="prev"&&parsedRaw.mainData){
      const pp=applyMapping(parsedRaw.rows,mapping,cfg.metricKeys);
      finalizeBoth(parsedRaw.mainData,pp);
    } else {
      finalizeMain(parsedRaw.rows,mapping);
    }
  }

  function goBack(){
    setView("input"); setChecked({});
  }

  function clearData(){
    clearStorage(platform);
    setData([]); setPrevData(null); setSavedAt(null); setChecked({});
    setView("input");
  }

  function exportPDF(){
    window.print();
  }

  // sort
  const sortedData=[...data].sort((a,b)=>{
    const av=a[sortKey]??"",bv=b[sortKey]??"";
    const res=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));
    return sortAsc?res:-res;
  });
  const maxes={};
  cfg.metricKeys.forEach(k=>{maxes[k]=data.length?Math.max(...data.map(d=>d[k]||0)):0;});

  // chart data
  const labels=data.map(d=>shortLabel(d.title));
  const fullTitles=data.map(d=>d.title);
  const engKeys=cfg.engagementKeys;
  const engLabels=cfg.engagementLabels;
  const engColors=engKeys.map(METRIC_COLOR);

  const mainBarDatasets=cfg.id==="facebook"
    ?[
        {label:"도달",data:data.map(d=>d.reach),backgroundColor:NEON.reach,borderRadius:4,borderSkipped:false},
        {label:"조회",data:data.map(d=>d.views),backgroundColor:NEON.views,borderRadius:4,borderSkipped:false},
      ]
    :[
        {label:"도달",data:data.map(d=>d.reach),backgroundColor:NEON.reach,borderRadius:4,borderSkipped:false},
        {label:"총 인게이지먼트",data:data.map(d=>(d.likes||0)+(d.comments||0)+(d.saves||0)+(d.shares||0)),backgroundColor:NEON.reach2,borderRadius:4,borderSkipped:false},
      ];

  const engLine={
    labels,
    datasets:engKeys.map((k,i)=>({
      label:engLabels[i],data:data.map(d=>d[k]||0),
      borderColor:engColors[i],backgroundColor:"transparent",
      borderWidth:2,pointRadius:3,pointBackgroundColor:engColors[i],tension:0.3,
    })),
  };

  const donutData={
    labels:engLabels,
    datasets:[{
      data:engKeys.map(k=>data.reduce((s,d)=>s+(d[k]||0),0)),
      backgroundColor:engColors,borderColor:"#0c0c0c",borderWidth:2,hoverOffset:6,
    }],
  };

  // day of week analysis
  const dayStats=DAYS_KO.map(day=>{
    const posts=data.filter(d=>getDayOfWeek(d.date)===day);
    const stat={day,count:posts.length};
    engKeys.forEach(k=>{stat[k]=posts.length?Math.round(avg(posts,k)):0;});
    return stat;
  }).filter(s=>s.count>0);

  const dayBarData={
    labels:dayStats.map(s=>`${s.day} (${s.count}개)`),
    datasets:engKeys.map((k,i)=>({
      label:engLabels[i],data:dayStats.map(s=>s[k]),
      backgroundColor:engColors[i],borderRadius:4,borderSkipped:false,
    })),
  };

  // category
  const hasCat=data.some(d=>d.category);
  const cats=hasCat?[...new Set(data.map(d=>d.category).filter(Boolean))]:[];
  const catStats=cats.map(cat=>{
    const posts=data.filter(d=>d.category===cat);
    const stat={category:cat,count:posts.length};
    engKeys.forEach(k=>{stat[k+"_avg"]=Math.round(avg(posts,k));});
    return stat;
  });
  const catBarColors=["#c084fc","#ff6b9d","#00d4ff","#7fff6b","#ffb347","#f472b6","#38bdf8","#fb923c"];
  const catBarData={
    labels:catStats.map(c=>c.category),
    datasets:engKeys.map((k,i)=>({
      label:`${cfg.metricLabels[k]} (평균)`,
      data:catStats.map(c=>c[k+"_avg"]),
      backgroundColor:catBarColors[i%catBarColors.length],
      borderRadius:4,borderSkipped:false,
    })),
  };

  const checklistItems=cfg.defaultChecklist(data.length?data:cfg.sampleData);

  /* ── PLATFORM TABS ── */
  const PlatformTabs=({marginBottom=28})=>(
    <div style={{display:"flex",gap:8,marginBottom}}>
      {[{id:"instagram",label:"📸 Instagram",accent:"#e1306c"},{id:"facebook",label:"📘 Facebook",accent:"#1877f2"}].map(p=>{
        const active=platform===p.id;
        return(
          <button key={p.id} onClick={()=>selectPlatform(p.id)} style={{
            background:active?`${p.accent}18`:"transparent",
            color:active?"#fff":"#555",
            border:`1.5px solid ${active?p.accent:"#222"}`,
            borderRadius:24,padding:"8px 18px",fontSize:13,
            fontWeight:active?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
          }}>{p.label}</button>
        );
      })}
    </div>
  );

  /* ══════════════════════
     INPUT SCREEN
  ══════════════════════ */
  if(view==="input") return(
    <>
      {showMapping&&parsedRaw&&(
        <MappingUI platform={platform} headers={parsedRaw.headers}
          initialMapping={autoDetectMapping(cfg.colAliases,parsedRaw.headers)}
          onConfirm={handleMappingConfirm} onCancel={()=>setShowMapping(false)}/>
      )}
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 24px"}}>
        <div style={{width:"100%",maxWidth:560}}>
          <PlatformTabs marginBottom={28}/>

          <div style={{fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",color:"#888",marginBottom:12,fontWeight:600}}>
            {cfg.name} Analytics
          </div>
          <h1 style={{fontSize:28,fontWeight:700,lineHeight:1.2,marginBottom:8,color:"#fff"}}>
            월간 {cfg.name} 성과 대시보드
          </h1>
          <p style={{color:"#aaa",fontSize:13,lineHeight:1.65,marginBottom:28}}>
            이번 달 데이터를 올리면 지표 분석, 요일별·카테고리별 인사이트,<br/>전월 비교까지 한번에 뽑아드려요.
          </p>

          {/* 이번달 업로드 */}
          <div style={{fontSize:11,color:"#aaa",fontWeight:600,marginBottom:8,letterSpacing:"0.06em"}}>이번 달 데이터 *</div>
          <FileUpload label="CSV 파일 업로드" selectedFile={selectedFile}
            onFile={f=>{readFile(f,setFileText);setSelectedFile(f.name);}}
            onRemove={()=>{setFileText(null);setSelectedFile(null);if(fileRef.current)fileRef.current.value="";}}
            fileRef={fileRef}/>

          <button onClick={()=>downloadSampleCSV(platform)}
            style={{width:"100%",background:"transparent",border:"1px solid #1e1e1e",borderRadius:8,padding:"9px 0",fontSize:12,color:"#aaa",cursor:"pointer",marginBottom:14,fontFamily:"inherit"}}>
            📥 샘플 CSV 템플릿 다운로드
          </button>

          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{flex:1,height:1,background:"#1a1a1a"}}/>
            <span style={{fontSize:11,color:"#2d2d2d"}}>OR</span>
            <div style={{flex:1,height:1,background:"#1a1a1a"}}/>
          </div>

          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder="이번 달 데이터 직접 붙여넣기"
            style={{width:"100%",height:90,background:"#111",border:"1px solid #1c1c1c",borderRadius:10,color:"#ccc",fontSize:12,padding:"11px 14px",resize:"vertical",outline:"none",fontFamily:"monospace",lineHeight:1.6,marginBottom:16}}/>

          {/* 전월 비교 토글 */}
          <button onClick={()=>setShowPrevUpload(p=>!p)}
            style={{width:"100%",background:"transparent",border:`1px dashed ${showPrevUpload?"#444":"#1e1e1e"}`,borderRadius:8,padding:"10px 0",fontSize:12,color:showPrevUpload?"#aaa":"#555",cursor:"pointer",marginBottom:14,fontFamily:"inherit",transition:"all 0.2s"}}>
            {showPrevUpload?"▲ 전월 비교 데이터 닫기":"＋ 전월 비교 데이터 추가 (선택사항)"}
          </button>

          {showPrevUpload&&(
            <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:"16px",marginBottom:14}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:10,letterSpacing:"0.06em"}}>전월 데이터</div>
              <FileUpload label="전월 CSV 파일 업로드" selectedFile={prevSelectedFile}
                onFile={f=>{readFile(f,setPrevFileText);setPrevSelectedFile(f.name);}}
                onRemove={()=>{setPrevFileText(null);setPrevSelectedFile(null);if(prevFileRef.current)prevFileRef.current.value="";}}
                fileRef={prevFileRef}/>
              <textarea value={prevCsvText} onChange={e=>setPrevCsvText(e.target.value)} placeholder="전월 데이터 직접 붙여넣기"
                style={{width:"100%",height:70,background:"#111",border:"1px solid #1c1c1c",borderRadius:8,color:"#ccc",fontSize:12,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"monospace",lineHeight:1.6,marginTop:4}}/>
            </div>
          )}

          {error&&<div style={{color:"#e05555",fontSize:12,marginBottom:8}}>{error}</div>}

          {savedAt&&(
            <div style={{fontSize:11,color:"#444",marginBottom:10}}>
              💾 저장된 데이터 있음 — {new Date(savedAt).toLocaleDateString("ko-KR")}
              <button onClick={()=>{setView("dashboard");}} style={{marginLeft:10,background:"transparent",border:"none",color:"#666",fontSize:11,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>불러오기</button>
              <button onClick={clearData} style={{marginLeft:8,background:"transparent",border:"none",color:"#444",fontSize:11,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>삭제</button>
            </div>
          )}

          <div style={{display:"flex",gap:10}}>
            <button disabled={!csvText.trim()&&!fileText} onClick={uploadData}
              style={{flex:1,background:csvText.trim()||fileText?"#fff":"#181818",color:csvText.trim()||fileText?"#000":"#2d2d2d",border:"none",borderRadius:10,padding:13,fontSize:14,fontWeight:600,cursor:csvText.trim()||fileText?"pointer":"default",fontFamily:"inherit"}}>
              대시보드 생성 →
            </button>
            <button onClick={()=>{setData(cfg.sampleData);setPrevData(null);setSavedAt(null);setView("dashboard");}}
              style={{background:"transparent",color:"#555",border:"1px solid #1e1e1e",borderRadius:10,padding:"13px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              샘플 보기
            </button>
          </div>
        </div>
      </div>
    </>
  );

  /* ══════════════════════
     DASHBOARD
  ══════════════════════ */
  return(
    <div ref={dashRef} style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px 64px"}}>

      {/* Header */}
      <div className="no-print" style={{marginBottom:28}}>
        <PlatformTabs marginBottom={16}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",color:"#888",marginBottom:6,fontWeight:600}}>{cfg.name} Analytics</div>
            <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>월간 성과 대시보드</div>
            <div style={{fontSize:12,color:"#888",marginTop:4}}>
              총 {data.length}개 게시물 분석
              {savedAt&&<span style={{marginLeft:8,color:"#333"}}>· 저장됨 {new Date(savedAt).toLocaleDateString("ko-KR")}</span>}
              {prevData&&<span style={{marginLeft:8,color:"#3b82f6",fontSize:11}}>· 전월 비교 중</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={goBack} style={{background:"transparent",color:"#555",border:"1px solid #1e1e1e",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← 재입력</button>
            <button onClick={exportPDF} style={{background:"#fff",color:"#000",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📄 PDF 저장</button>
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only" style={{marginBottom:24,borderBottom:"2px solid #333",paddingBottom:16}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>{cfg.name} 월간 성과 보고서</div>
        <div style={{fontSize:12,color:"#888",marginTop:4}}>총 {data.length}개 게시물 · {new Date().toLocaleDateString("ko-KR")}</div>
      </div>

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${cfg.summaryCards(data,prevData).length},1fr)`,gap:10,marginBottom:28}}>
        {cfg.summaryCards(data,prevData).map(s=>{
          const change=s.prevNum!=null?momChange(s.curNum,s.prevNum):null;
          return(
            <div key={s.label} style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:10,padding:"16px 18px"}}>
              <div style={{fontSize:10,color:"#888",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{s.val}</div>
              {change&&(
                <div style={{fontSize:11,marginTop:6,color:change.up?"#7fff6b":"#ff6b6b",fontWeight:600}}>
                  {change.up?"▲":"▼"} {Math.abs(change.pct)}% vs 전월
                </div>
              )}
              {!change&&s.prev&&(
                <div style={{fontSize:11,color:"#333",marginTop:6}}>전월: {s.prev}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 데이터 흐름 */}
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>데이터 흐름</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20,gridColumn:"span 2"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>{cfg.mainBarLabel}</div>
          <div style={{fontSize:11,color:"#888",marginBottom:16}}>전체 {data.length}개 게시물 — 막대 위 마우스 오버 시 전체 제목 확인</div>
          <div style={{height:220}}>
            <Bar data={{labels,datasets:mainBarDatasets}} options={makeChartOpts({min:0},fullTitles)}/>
          </div>
        </div>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>인게이지먼트 추이</div>
          <div style={{fontSize:11,color:"#888",marginBottom:16}}>게시 순서에 따른 각 지표 변화</div>
          <div style={{height:200}}>
            <Line data={engLine} options={makeChartOpts(smartYScale(data,engKeys),fullTitles)}/>
          </div>
        </div>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>인게이지먼트 구성 비율</div>
          <div style={{fontSize:11,color:"#888",marginBottom:16}}>전체 데이터 기준 각 지표의 비중</div>
          <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Doughnut data={donutData} options={{
              responsive:true,maintainAspectRatio:false,cutout:"68%",
              plugins:{
                legend:{labels:{color:"#ccc",font:{size:11},boxWidth:10,padding:12},position:"right"},
                tooltip:{...TOOLTIP,callbacks:{label:(ctx)=>{const t=ctx.dataset.data.reduce((a,b)=>a+b,0);const p=t?((ctx.parsed/t)*100).toFixed(1):0;return ` ${ctx.parsed.toLocaleString()} (${p}%)`;}}}
              },
            }}/>
          </div>
        </div>
      </div>

      {/* Top 3 비교 */}
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>Top 3 인게이지먼트 비교</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:28}}>
        {cfg.filterOptions.map(({label,sortKey:sk})=>{
          const top3=[...data].sort((a,b)=>b[sk]-a[sk]).slice(0,3);
          const t3labels=top3.map(d=>shortLabel(d.title));
          const t3titles=top3.map(d=>d.title);
          const t3bar={labels:t3labels,datasets:engKeys.map((k,i)=>({
            label:engLabels[i],data:top3.map(d=>d[k]||0),
            backgroundColor:engColors[i],borderRadius:4,borderSkipped:false,
          }))};
          return(
            <div key={sk} style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>{label}</div>
              <div style={{fontSize:11,color:"#888",marginBottom:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{top3.map(d=>d.title).join(" · ")}</div>
              <div style={{height:200}}>
                <Bar data={t3bar} options={makeChartOpts(smartYScale(top3,engKeys),t3titles)}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* 요일별 성과 */}
      {dayStats.length>0&&(
        <>
          <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>요일별 평균 인게이지먼트</div>
          <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20,marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>요일별 평균 성과</div>
            <div style={{fontSize:11,color:"#888",marginBottom:16}}>어떤 요일에 올린 콘텐츠가 가장 잘 반응하는지 — 다음 달 업로드 타임 설정에 활용하세요</div>
            <div style={{height:220}}>
              <Bar data={dayBarData} options={makeChartOpts(smartYScale(dayStats,engKeys),dayStats.map(s=>`${s.day}요일 (${s.count}개 게시물)`))}/>
            </div>
            {/* 요일 카드 */}
            <div style={{display:"grid",gridTemplateColumns:`repeat(${dayStats.length},1fr)`,gap:8,marginTop:16}}>
              {dayStats.map((s,i)=>(
                <div key={s.day} style={{background:"#0d0d0d",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:700,color:DAY_COLORS[i%DAY_COLORS.length],marginBottom:6}}>{s.day}</div>
                  <div style={{fontSize:10,color:"#444",marginBottom:8}}>{s.count}개</div>
                  {engKeys.map((k,ki)=>(
                    <div key={k} style={{marginBottom:4}}>
                      <div style={{fontSize:9,color:"#555"}}>{cfg.metricLabels[k]}</div>
                      <div style={{fontSize:13,fontWeight:600,color:engColors[ki]}}>{s[k].toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 카테고리별 */}
      {hasCat&&catStats.length>0&&(
        <>
          <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>카테고리별 인게이지먼트</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
            <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:20,gridColumn:"span 2"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>카테고리별 평균 인게이지먼트</div>
              <div style={{fontSize:11,color:"#888",marginBottom:16}}>어떤 콘텐츠 유형이 가장 잘 반응하는지 한눈에 비교</div>
              <div style={{height:220}}>
                <Bar data={catBarData} options={makeChartOpts({min:0},catStats.map(c=>`${c.category} (${c.count}개)`))}/>
              </div>
            </div>
            {catStats.map((cat,ci)=>(
              <div key={cat.category} style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{cat.category}</span>
                  <span style={{fontSize:11,color:"#888",background:"#1a1a1a",padding:"3px 10px",borderRadius:20}}>{cat.count}개</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${engKeys.length},1fr)`,gap:8}}>
                  {engKeys.map((k,ki)=>(
                    <div key={k} style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#666",marginBottom:4}}>{cfg.metricLabels[k]}</div>
                      <div style={{fontSize:16,fontWeight:700,color:catBarColors[ki%catBarColors.length]}}>{cat[k+"_avg"].toLocaleString()}</div>
                      <div style={{fontSize:10,color:"#444"}}>avg</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 지표별 Top 카드 */}
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>지표별 최고 성과 콘텐츠</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,marginBottom:28}}>
        {cfg.metricKeys.map(key=>{
          const top=[...data].sort((a,b)=>b[key]-a[key])[0];
          const ratio=safeRatio(top[key],avg(data,key));
          const nColor=METRIC_COLOR(key);
          // MoM for this metric
          const prevAvgVal=prevData?avg(prevData,key):null;
          const change=prevAvgVal!=null?momChange(top[key],prevAvgVal):null;
          return(
            <div key={key} style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:10,color:"#ddd",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>{cfg.metricLabels[key]} Top</span>
                {ratio&&<span title="이번 달 전체 평균 대비" style={{fontSize:10,color:nColor,background:`${nColor}18`,border:`1px solid ${nColor}40`,padding:"3px 8px",borderRadius:20}}>평균 대비 {ratio}</span>}
              </div>
              <div style={{fontSize:26,fontWeight:700,color:"#fff",marginBottom:5,letterSpacing:"-0.02em"}}>{top[key].toLocaleString()}</div>
              <div style={{fontSize:13,color:"#ddd",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={top.title}>{top.title}</div>
              {change&&(
                <div style={{fontSize:11,color:change.up?"#7fff6b":"#ff6b6b",marginBottom:8,fontWeight:600}}>
                  {change.up?"▲":"▼"} {Math.abs(change.pct)}% vs 전월 평균
                </div>
              )}
              <div style={{height:1,background:"#1e1e1e",marginBottom:10}}/>
              <div style={{fontSize:9.5,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>인사이트</div>
              <div style={{fontSize:12.5,color:"#ccc",lineHeight:1.65}}>{cfg.fallbackInsights[key]}</div>
            </div>
          );
        })}
      </div>

      {/* 체크리스트 */}
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>다음 달을 위한 체크리스트</div>
      <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,padding:"20px 22px",marginBottom:28}}>
        <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>데이터 기반 점검 항목</div>
        <div style={{fontSize:12,color:"#aaa",marginBottom:18}}>인게이지먼트 패턴에서 도출한 액션 포인트예요.</div>
        {checklistItems.map((item,i)=>(
          <div key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:i<checklistItems.length-1?"1px solid #1a1a1a":"none",cursor:"pointer"}}>
            <div style={{width:18,height:18,border:`1.5px solid ${checked[i]?"#7fff6b":"#2a2a2a"}`,borderRadius:5,flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",background:checked[i]?"#7fff6b":"transparent",userSelect:"none"}}>
              {checked[i]&&<span style={{fontSize:11,color:"#000",fontWeight:700}}>✓</span>}
            </div>
            <div style={{fontSize:13,color:"#ccc",lineHeight:1.6,flex:1}}>{item}</div>
          </div>
        ))}
      </div>

      {/* 전체 테이블 */}
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:14,fontWeight:600}}>전체 게시물</div>
      <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:12,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:620}}>
          <thead>
            <tr>
              {[["title","게시물"],["date","날짜"],["category","카테고리"],...cfg.metricKeys.map(k=>[k,cfg.metricLabels[k]])].map(([k,l])=>(
                <th key={k} onClick={()=>{if(sortKey===k)setSortAsc(p=>!p);else{setSortKey(k);setSortAsc(false);}}}
                  style={{padding:"12px 14px",textAlign:"left",color:sortKey===k?"#fff":"#888",fontWeight:600,fontSize:11,borderBottom:"1px solid #1e1e1e",cursor:"pointer",whiteSpace:"nowrap"}}>
                  {l}{sortKey===k?(sortAsc?" ↑":" ↓"):""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((post,i)=>(
              <tr key={i} style={{borderBottom:i<sortedData.length-1?"1px solid #171717":"none"}}>
                <td style={{padding:"11px 14px",color:"#ddd",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={post.title}>{post.title}</td>
                <td style={{padding:"11px 14px",color:"#666",fontFamily:"monospace",fontSize:11}}>{post.date}</td>
                <td style={{padding:"11px 14px",color:"#888",fontSize:12}}>{post.category||"—"}</td>
                {cfg.metricKeys.map(k=>(
                  <td key={k} style={{padding:"11px 14px",color:post[k]===maxes[k]?"#fff":"#aaa",fontWeight:post[k]===maxes[k]?700:400,fontFamily:"monospace",fontSize:12}}>
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
