import { useState, useCallback } from "react";
import Head from "next/head";

const fmt$ = n =>
  n >= 1_000_000 ? `$${(n/1e6).toFixed(2)}M`
  : n >= 1_000 ? `$${(n/1e3).toFixed(1)}K`
  : `$${(n??0).toFixed(0)}`;

const fmtPct = n => `${((n??0)*100).toFixed(0)}%`;
const shortAddr = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "—";
const hashColor = s =>
  `hsl(${[...s].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)%360},65%,55%)`;

async function fetchLeaderboard() {
  const r = await fetch("/api/leaderboard?category=1&limit=25&sortBy=profit&timeWindow=all");
  if (!r.ok) throw new Error(`Leaderboard HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : j.data ?? j.leaderboard ?? j.results ?? [];
}

async function fetchProfile(addr) {
  try {
    const r = await fetch(`/api/profile?address=${addr}`);
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fetchPositions(addr) {
  try {
    const r = await fetch(`/api/positions?user=${addr}&limit=50`);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : j.positions ?? [];
  } catch { return []; }
}

async function fetchActivity(addr) {
  try {
    const r = await fetch(`/api/activity?user=${addr}&limit=30`);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : j.history ?? j.data ?? [];
  } catch { return []; }
}

function buildConsensus(traders, field) {
  const map = {};
  for (const t of traders) {
    for (const item of (t[field]??[])) {
      const key = item.conditionId??item.market??item.marketId??item.slug;
      if (!key) continue;
      if (!map[key]) map[key] = {
        key,
        question: item.title??item.question??item.market??key,
        endDate: item.endDate??item.resolvedAt??null,
        traders: [],
      };
      if (!map[key].traders.find(x=>x.address===t.address)) {
        map[key].traders.push({
          name: t.name??shortAddr(t.address),
          address: t.address,
          outcome: item.outcome??"—",
          size: item.size??item.amount??0,
          avgPrice: item.avgPrice??item.price??null,
          profit: item.profit??null,
        });
      }
    }
  }
  return Object.values(map)
    .filter(m=>m.traders.length>=2)
    .sort((a,b)=>b.traders.length-a.traders.length);
}

const OPEN_MARKETS = [
  { key:"nba_finals_2026", question:"Will the OKC Thunder win the 2026 NBA Finals?", endDate:"2026-06-22" },
  { key:"nfl_mvp_2027", question:"Will Patrick Mahomes win the 2026-27 NFL MVP?", endDate:"2027-02-10" },
  { key:"mlb_ws_2026", question:"Will the Dodgers win the 2026 World Series?", endDate:"2026-10-31" },
  { key:"nhl_cup_2026", question:"Will the Florida Panthers win the 2026 Stanley Cup?", endDate:"2026-06-25" },
  { key:"wimbledon_2026", question:"Will Carlos Alcaraz win Wimbledon 2026?", endDate:"2026-07-13" },
  { key:"euro_2026", question:"Will France win UEFA Euro 2026?", endDate:"2026-07-30" },
  { key:"nba_scoring_2627", question:"Will SGA lead NBA scoring in 2026-27?", endDate:"2027-04-01" },
  { key:"nfl_sb_lxi", question:"Will the Kansas City Chiefs reach Super Bowl LXI?", endDate:"2027-02-08" },
];

const PAST_MARKETS = [
  { key:"nba_mvp_2026", question:"Shai Gilgeous-Alexander wins 2026 NBA MVP?", endDate:"2026-05-01" },
  { key:"nfl_sb_lx", question:"Eagles win Super Bowl LX?", endDate:"2026-02-09" },
  { key:"ncaa_2026", question:"Duke wins 2026 NCAA Championship?", endDate:"2026-04-06" },
  { key:"masters_2026", question:"Rory McIlroy wins 2026 Masters?", endDate:"2026-04-13" },
  { key:"roland_2026", question:"Jannik Sinner wins Roland Garros 2026?", endDate:"2026-06-08" },
  { key:"nhl_g7_2026", question:"Game 7 in 2026 NHL Conference Finals?", endDate:"2026-05-30" },
];

function demoOpenPos(addr) {
  const seed = addr.charCodeAt(addr.length-2)+addr.charCodeAt(addr.length-1);
  return OPEN_MARKETS.filter((_,i)=>(seed+i*7)%3!==0).slice(0,5).map(m=>({
    conditionId:m.key, title:m.question,
    outcome:(seed+m.key.length)%2===0?"Yes":"No",
    size:1000+((seed*m.key.length)%9000),
    avgPrice:0.35+((seed%30)/100), endDate:m.endDate,
  }));
}

function demoActivity(addr) {
  const seed = addr.charCodeAt(2)+addr.charCodeAt(3);
  return PAST_MARKETS.filter((_,i)=>(seed+i*5)%3!==0).slice(0,4).map(m=>({
    conditionId:m.key, title:m.question,
    outcome:(seed+m.key.length)%2===0?"Yes":"No",
    profit:500+((seed*m.key.length)%5000), resolvedAt:m.endDate,
  }));
}

const DEMO_TRADERS = [
  {address:"0xbeachboy4000",name:"beachboy4",profit:4357027,volume:12961398,winRate:0.71},
  {address:"0xhorizon1111",name:"HorizonSplendidView",profit:2980000,volume:8200000,winRate:0.68},
  {address:"0xreachsky222",name:"reachingthesky",profit:2410000,volume:8900000,winRate:0.65},
  {address:"0xsharpleye333",name:"SharpEye_77",profit:1950000,volume:5400000,winRate:0.63},
  {address:"0xwhalewatch44",name:"WhaleWatcher",profit:1720000,volume:9100000,winRate:0.58},
  {address:"0xoddsmaker55",name:"OddsMaker_Pro",profit:1540000,volume:4200000,winRate:0.66},
  {address:"0xsportsguru66",name:"SportsGuru_X",profit:1380000,volume:3800000,winRate:0.62},
  {address:"0xedgefinder77",name:"EdgeFinder",profit:1210000,volume:6100000,winRate:0.59},
  {address:"0xalphabet888",name:"AlphaBet888",profit:1090000,volume:2900000,winRate:0.70},
  {address:"0xmarkethawk99",name:"MarketHawk",profit:980000,volume:5500000,winRate:0.61},
  {address:"0xlineman_X00",name:"LinemanX",profit:870000,volume:2200000,winRate:0.64},
  {address:"0xcoverstats11",name:"CoverStats",profit:810000,volume:3100000,winRate:0.60},
  {address:"0xparlayking12",name:"ParlayKing",profit:750000,volume:1900000,winRate:0.57},
  {address:"0xaquilapred13",name:"AquilaPredictor",profit:720000,volume:4300000,winRate:0.63},
  {address:"0xgridironb14",name:"GridironBrain",profit:680000,volume:2700000,winRate:0.62},
  {address:"0xfastpitch15",name:"FastPitch_XX",profit:640000,volume:1600000,winRate:0.68},
  {address:"0xcourtsideaa16",name:"CourtSide_AA",profit:610000,volume:2400000,winRate:0.65},
  {address:"0xpuckstopbb17",name:"PuckStop_BB",profit:580000,volume:1800000,winRate:0.61},
  {address:"0xturfwarcc18",name:"TurfWar_CC",profit:550000,volume:2100000,winRate:0.60},
  {address:"0xdraftkingdd19",name:"DraftKing_DD",profit:520000,volume:3500000,winRate:0.58},
  {address:"0xwinprobee20",name:"WinProb_EE",profit:490000,volume:1400000,winRate:0.67},
  {address:"0xbaserunff21",name:"BaseRunner_FF",profit:460000,volume:1200000,winRate:0.64},
  {address:"0xfoullinegg22",name:"FoulLine_GG",profit:430000,volume:2000000,winRate:0.59},
  {address:"0xhoopdreamhh23",name:"HoopDream_HH",profit:400000,volume:1700000,winRate:0.62},
  {address:"0xpitcherii24",name:"PitcherPal_II",profit:380000,volume:1300000,winRate:0.60},
].map(t=>({...t,avatar:null,openPositions:demoOpenPos(t.address),activity:demoActivity(t.address)}));

function Avatar({trader,size=36}) {
  if (trader.avatar) return <img src={trader.avatar} alt="" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} />;
  const initials=(trader.name||"?").slice(0,2).toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:hashColor(trader.address||trader.name||"x"),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.35,color:"#fff"}}>{initials}</div>;
}

function TraderRow({trader,rank,onClick,selected}) {
  const pos=(trader.profit??0)>=0;
  const goldColors=["#ffd700","#c0c0c0","#cd7f32"];
  return <div onClick={()=>onClick(trader)} style={{cursor:"pointer",background:selected?"rgba(0,230,150,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${selected?"#00e696":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",gap:11,marginBottom:5,transition:"border 0.15s"}}>
    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:rank<=3?goldColors[rank-1]:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rank<=3?"#000":"#888"}}>{rank}</div>
    <Avatar trader={trader} size={32}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{color:"#eee",fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trader.name}</div>
      <div style={{color:"#444",fontSize:10}}>{shortAddr(trader.address)}</div>
    </div>
    <div style={{textAlign:"right",flexShrink:0}}>
      <div style={{color:pos?"#00e696":"#ff4d6d",fontWeight:700,fontSize:13}}>{pos?"+":""}{fmt$(trader.profit??0)}</div>
      <div style={{color:"#444",fontSize:10}}>{trader.winRate!=null?`${(trader.winRate*100).toFixed(0)}% wr`:""}</div>
    </div>
  </div>;
}

function ConsensusCard({bet,type}) {
  const n=bet.traders.length;
  const heat=Math.min((n-2)/4,1);
  const borderColor=type==="future"?`hsl(${150-heat*60},80%,55%)`:`hsl(${230+heat*20},70%,60%)`;
  return <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderLeft:`4px solid ${borderColor}`,borderRadius:10,padding:"14px 16px",marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
      <div style={{color:"#f0f0f0",fontWeight:600,fontSize:14,flex:1,lineHeight:1.4}}>{bet.question}</div>
      <div style={{background:type==="future"?"rgba(0,230,150,0.12)":"rgba(123,140,255,0.12)",color:type==="future"?"#00e696":"#7b8cff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,flexShrink:0}}>{n} traders agree</div>
    </div>
    {bet.endDate&&<div style={{color:"#444",fontSize:11,marginTop:4}}>{type==="future"?"Closes":"Resolved"}: {new Date(bet.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>}
    <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
      {bet.traders.map((t,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.05)",borderRadius:20,padding:"4px 10px",fontSize:11,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:hashColor(t.address),flexShrink:0}}/>
          <span style={{color:"#ccc"}}>{t.name}</span>
          {t.outcome&&t.outcome!=="—"&&<span style={{color:t.outcome==="Yes"?"#00e696":"#ff8c00",fontWeight:700}}>→ {t.outcome}</span>}
          {t.size>0&&<span style={{color:"#666"}}>{fmt$(t.size)}</span>}
        </div>
      ))}
    </div>
  </div>;
}

function PositionLine({p}) {
  const isYes=(p.outcome||"").toLowerCase()==="yes";
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
    <span style={{padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,flexShrink:0,background:isYes?"rgba(0,230,150,0.12)":"rgba(255,77,109,0.12)",color:isYes?"#00e696":"#ff4d6d"}}>{p.outcome||"?"}</span>
    <span style={{flex:1,color:"#ccc",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title??p.question??p.conditionId??"—"}</span>
    <span style={{color:"#888",fontSize:11,flexShrink:0}}>{fmt$(p.size||0)}</span>
    {p.avgPrice!=null&&<span style={{color:"#555",fontSize:10,flexShrink:0}}>{fmtPct(p.avgPrice)}</span>}
  </div>;
}

export default function Home() {
  const [tab,setTab]=useState("future");
  const [traders,setTraders]=useState([]);
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState("");
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [futureCross,setFutureCross]=useState([]);
  const [pastCross,setPastCross]=useState([]);
  const [ready
