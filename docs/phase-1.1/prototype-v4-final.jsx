import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════
// FONTS
// ═══════════════════════════════════════════════════════════════
const FontLoader = () => (
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Lilita+One&display=swap" rel="stylesheet" />
);

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const T = {
  font: "'Fredoka', sans-serif",
  fontD: "'Lilita One', sans-serif",
  r: { sm: 10, md: 16, lg: 22, xl: 28 },
  green:  {50:"#ECFDF5",100:"#D1FAE5",200:"#A7F3D0",300:"#6EE7B7",400:"#34D399",500:"#10B981",600:"#059669",700:"#047857",800:"#065F46"},
  amber:  {50:"#FFFBEB",100:"#FEF3C7",200:"#FDE68A",300:"#FCD34D",500:"#F59E0B",600:"#D97706",700:"#B45309"},
  red:    {50:"#FEF2F2",100:"#FEE2E2",300:"#FCA5A5",400:"#F87171",500:"#EF4444",600:"#DC2626"},
  pink:   {50:"#FDF2F8",100:"#FCE7F3",200:"#FBCFE8",300:"#F9A8D4",400:"#F472B6",500:"#EC4899"},
  sky:    {50:"#F0F9FF",100:"#E0F2FE",200:"#BAE6FD",400:"#38BDF8",500:"#0EA5E9"},
  slate:  {50:"#F8FAFC",100:"#F1F5F9",200:"#E2E8F0",300:"#CBD5E1",400:"#94A3B8",500:"#64748B",600:"#475569",700:"#334155",800:"#1E293B"},
};

// ═══════════════════════════════════════════════════════════════
// SUN DROP ICON (custom SVG, not just emoji)
// ═══════════════════════════════════════════════════════════════
const SunDropIcon = ({ size = 20, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: glow ? "drop-shadow(0 0 6px #FCD34D)" : "none" }}>
    <defs>
      <linearGradient id="sdg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <radialGradient id="sdshine" cx="35%" cy="30%">
        <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {/* Drop shape */}
    <path d="M12 2 C12 2 5 11 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 11 12 2 12 2Z"
      fill="url(#sdg)" stroke="#D97706" strokeWidth="0.8" />
    {/* Shine */}
    <ellipse cx="9.5" cy="13" rx="3" ry="4" fill="url(#sdshine)" />
    {/* Ray lines (small, subtle) */}
    <line x1="12" y1="15" x2="12" y2="12.5" stroke="#FEF3C7" strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const SunDropBrokenIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <defs>
      <linearGradient id="sdbr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
    {/* Cracked drop */}
    <path d="M12 2 C12 2 5 11 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 11 12 2 12 2Z"
      fill="url(#sdbr)" stroke="#DC2626" strokeWidth="0.8" />
    {/* Crack line */}
    <path d="M10 10 L13 14 L10 16 L13 19" fill="none" stroke="#7F1D1D" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// AVATARS
// ═══════════════════════════════════════════════════════════════
const AVATARS = [
  { id:"fox", emoji:"🦊", name:"Foxy" },
  { id:"cat", emoji:"🐱", name:"Whiskers" },
  { id:"panda", emoji:"🐼", name:"Bamboo" },
  { id:"owl", emoji:"🦉", name:"Hootie" },
  { id:"bunny", emoji:"🐰", name:"Hopper" },
  { id:"bear", emoji:"🐻", name:"Teddy" },
  { id:"penguin", emoji:"🐧", name:"Waddles" },
  { id:"frog", emoji:"🐸", name:"Ribbit" },
];

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const SKILL_PATH = {
  name: "Sports Talk", icon: "⚽",
  lessons: [
    { id:1, title:"Boxing Vocab", icon:"🥊", status:"completed", stars:2, daysAgo:12 },
    { id:2, title:"Gym Chat", icon:"🏋️", status:"completed", stars:3, daysAgo:5 },
    { id:3, title:"Match Day Talk", icon:"⚽", status:"current", stars:0, daysAgo:0 },
    { id:4, title:"Champion Interview", icon:"🏆", status:"locked", stars:0, daysAgo:0 },
  ],
};

// Garden trees (completed skill paths)
const GARDEN_TREES = [
  { id:"food", name:"Food & Cooking", icon:"🍕", x:140, y:180, health:15, daysAgo:21, gifts:[], decorations:[] },
  { id:"animals", name:"Animal World", icon:"🐾", x:380, y:140, health:90, daysAgo:3, gifts:["💧","✨"], decorations:["🎀"] },
  { id:"sports", name:"Sports Talk", icon:"⚽", x:260, y:320, health:60, daysAgo:5, gifts:["💧"], decorations:[] },
  { id:"space", name:"Space Explorer", icon:"🚀", x:500, y:250, health:35, daysAgo:14, gifts:[], decorations:["🔔"] },
  { id:"music", name:"Music & Dance", icon:"🎵", x:100, y:380, health:0, daysAgo:null, gifts:[], decorations:[] }, // empty plot
  { id:"travel", name:"Travel Talk", icon:"✈️", x:450, y:400, health:0, daysAgo:null, gifts:[], decorations:[] }, // empty plot
];

const LESSON_STEPS = [
  { tutorText:"Let's learn match day words! What's 'le gardien de but'?", helpText:"'Gardien' = keeper, 'but' = goal!",
    activity:{ type:"multiple_choice", question:"What does 'le gardien de but' mean?", options:["Goalkeeper","Referee","Striker","Coach"], correctIndex:0, sunlight:3 }},
  { tutorText:"Great! Fill in the blank 💪", helpText:"What do you yell when the ball goes in the net?",
    activity:{ type:"fill_blank", sentence:"The crowd shouted ___ when the ball hit the net!", correctAnswer:"goal", hint:"le but → g...", sunlight:3 }},
  { tutorText:"Build this sentence! ⚡", helpText:"Start with 'The' — who scored? Then what?",
    activity:{ type:"word_arrange", targetSentence:"The striker scored a goal", scrambledWords:["scored","The","goal","striker","a"], sunlight:3 }},
  { tutorText:"True or false? 🤔", helpText:"'L'arbitre' = the person who enforces the rules.",
    activity:{ type:"true_false", statement:"'L'arbitre' means 'the referee'.", isTrue:true, sunlight:2 }},
  { tutorText:"Match these football words! ⚽", helpText:"Some words sound similar in both languages!",
    activity:{ type:"matching", pairs:[{left:"le match",right:"the match"},{left:"l'équipe",right:"the team"},{left:"le penalty",right:"the penalty"},{left:"marquer",right:"to score"}], sunlight:4 }},
  { tutorText:"Final challenge — translate! 🏆", helpText:"'Notre' = our, 'a gagné' = won",
    activity:{ type:"translate", sourcePhrase:"Notre équipe a gagné le match!", acceptedAnswers:["our team won the match","our team won the game"], hint:"gagner = to win", sunlight:3 }},
];
const LESSON_MAX = LESSON_STEPS.reduce((s,st) => s + st.activity.sunlight, 0);

function healthFromDays(d, gifts=[]) {
  if (d===null) return 0;
  const eff = Math.max(0, d - gifts.length * 10);
  if(eff<=2) return 100; if(eff<=5) return 85; if(eff<=10) return 60;
  if(eff<=14) return 35; if(eff<=21) return 15; return 5;
}

// ═══════════════════════════════════════════════════════════════
// REWARD BURST (gain sun drops)
// ═══════════════════════════════════════════════════════════════
const SunDropBurst = ({ amount, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:60 }}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.div style={{ background:"linear-gradient(135deg, #FCD34D, #F59E0B)", padding:"14px 36px",
        borderRadius:T.r.xl, boxShadow:"0 0 60px rgba(245,158,11,0.5)", display:"flex", alignItems:"center", gap:10 }}
        initial={{scale:0,rotate:-10}} animate={{scale:[0,1.3,1],rotate:[0,5,0]}} transition={{type:"spring",stiffness:400,damping:15}}>
        <SunDropIcon size={36} glow />
        <span style={{ fontFamily:T.fontD, fontSize:30, color:"#fff", textShadow:"2px 2px 4px rgba(0,0,0,0.2)" }}>
          +{amount} Sun Drop{amount!==1?"s":""}
        </span>
      </motion.div>
      {Array.from({length:10}).map((_,i) => (
        <motion.div key={i} style={{ position:"absolute", width:8+Math.random()*10, height:8+Math.random()*10,
          borderRadius:Math.random()>0.5?"50%":"3px",
          background:["#FCD34D","#F59E0B","#FB923C","#4ADE80","#F472B6","#38BDF8"][i%6] }}
          initial={{x:0,y:0,opacity:1}}
          animate={{x:(Math.random()-0.5)*280,y:(Math.random()-0.5)*280,opacity:0,rotate:Math.random()*720}}
          transition={{duration:1+Math.random(),ease:"easeOut"}} />
      ))}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PENALTY BURST (lose sun drops — mirrors reward but RED/DANGER)
// ═══════════════════════════════════════════════════════════════
const PenaltyBurst = ({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 1600); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:60 }}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      {/* Red flash background */}
      <motion.div style={{ position:"absolute", inset:0, background:T.red[400] }}
        initial={{opacity:0}} animate={{opacity:[0,0.18,0]}} transition={{duration:0.6}} />
      {/* Penalty card */}
      <motion.div style={{ background:"linear-gradient(135deg, #FCA5A5, #EF4444)", padding:"14px 36px",
        borderRadius:T.r.xl, boxShadow:"0 0 50px rgba(239,68,68,0.4)", display:"flex", alignItems:"center", gap:10 }}
        initial={{scale:0,rotate:8}} animate={{scale:[0,1.2,1],rotate:[8,-3,0]}}
        transition={{type:"spring",stiffness:400,damping:15}}>
        <motion.div animate={{rotate:[0,-20,20,-10,10,0],y:[0,4,0]}} transition={{duration:0.5}}>
          <SunDropBrokenIcon size={36} />
        </motion.div>
        <span style={{ fontFamily:T.fontD, fontSize:28, color:"#fff", textShadow:"2px 2px 4px rgba(0,0,0,0.3)" }}>
          −1 Sun Drop
        </span>
      </motion.div>
      {/* Falling broken shards */}
      {Array.from({length:6}).map((_,i) => (
        <motion.div key={i} style={{ position:"absolute", fontSize:12+Math.random()*8 }}
          initial={{x:(Math.random()-0.5)*40, y:-20, opacity:1, rotate:0}}
          animate={{y:200+Math.random()*100, opacity:0, rotate:Math.random()*360,
            x:(Math.random()-0.5)*120}}
          transition={{duration:1.2+Math.random()*0.5, ease:"easeIn", delay:i*0.06}}>
          💔
        </motion.div>
      ))}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════
const Header = ({ avatar, sunDrops, streak, onAvatarClick }) => (
  <div style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(14px)",
    borderBottom:`2px solid ${T.green[100]}`, padding:"8px 16px", position:"sticky", top:0, zIndex:40 }}>
    <div style={{ maxWidth:700, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <motion.div whileTap={{scale:0.9}} onClick={onAvatarClick}
          style={{ width:38, height:38, borderRadius:"50%", cursor:"pointer",
            background:`linear-gradient(135deg, ${T.green[400]}, ${T.green[500]})`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:19,
            boxShadow:`0 2px 8px ${T.green[200]}` }}>{avatar.emoji}</motion.div>
        <span style={{ fontFamily:T.fontD, fontSize:17, color:T.green[800] }}>LingoFriends</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          <span style={{ fontSize:16 }}>🔥</span>
          <span style={{ fontFamily:T.font, fontWeight:700, fontSize:15, color:"#EA580C" }}>{streak}</span>
        </div>
        <div style={{ background:T.amber[100], borderRadius:T.r.md, padding:"5px 12px",
          border:`2px solid ${T.amber[300]}`, display:"flex", alignItems:"center", gap:5 }}>
          <SunDropIcon size={18} />
          <span style={{ fontFamily:T.font, fontWeight:800, fontSize:14, color:T.amber[700] }}>{sunDrops}</span>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// TAB BAR
// ═══════════════════════════════════════════════════════════════
const TabBar = ({ active, onChange }) => (
  <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50,
    background:"rgba(255,255,255,0.92)", backdropFilter:"blur(16px)",
    borderTop:`2px solid ${T.green[100]}`, padding:"6px 0 10px" }}>
    <div style={{ display:"flex", justifyContent:"center", gap:4, maxWidth:400, margin:"0 auto" }}>
      {[{id:"garden",icon:"🌳",label:"Garden"},{id:"path",icon:"🗺️",label:"Path"},{id:"friends",icon:"👥",label:"Friends"}].map(tab => (
        <motion.button key={tab.id} whileTap={{scale:0.92}} onClick={() => onChange(tab.id)}
          style={{ flex:1, background:active===tab.id?T.green[100]:"transparent", border:"none",
            borderRadius:T.r.md, padding:"8px 0", cursor:"pointer", display:"flex",
            flexDirection:"column", alignItems:"center", gap:2 }}>
          <span style={{ fontSize:22 }}>{tab.icon}</span>
          <span style={{ fontFamily:T.font, fontWeight:active===tab.id?700:500, fontSize:11,
            color:active===tab.id?T.green[700]:T.slate[400] }}>{tab.label}</span>
        </motion.button>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// AVATAR PICKER
// ═══════════════════════════════════════════════════════════════
const AvatarPicker = ({ current, onPick, onClose }) => (
  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
    style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
    <motion.div initial={{scale:0.8,y:30}} animate={{scale:1,y:0}} onClick={e=>e.stopPropagation()}
      style={{ background:"#fff", borderRadius:T.r.xl, padding:28, maxWidth:340, width:"100%" }}>
      <h3 style={{ fontFamily:T.fontD, fontSize:22, color:T.green[800], textAlign:"center", marginBottom:16 }}>
        Choose your buddy!</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {AVATARS.map(av => (
          <motion.button key={av.id} whileTap={{scale:0.9}} onClick={() => onPick(av)}
            style={{ background:current.id===av.id?T.green[100]:T.slate[50],
              border:`3px solid ${current.id===av.id?T.green[500]:"transparent"}`,
              borderRadius:T.r.lg, padding:10, cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:2 }}>{av.emoji}</div>
            <div style={{ fontFamily:T.font, fontSize:11, fontWeight:600, color:T.slate[600] }}>{av.name}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// MINI TREE SVG (reusable across views)
// ═══════════════════════════════════════════════════════════════
const MiniTree = ({ health, size=80, showPot=true }) => {
  const h = Math.max(0, Math.min(100, health));
  const st = h<10?0 : h<30?1 : h<55?2 : h<80?3 : 4;
  const lc = ["#D4B896","#E8C07A","#FFD4A8","#FFB7C5","#FF91A4"];
  const lo = [0.3, 0.4, 0.6, 0.8, 0.95];
  return (
    <svg viewBox="0 0 80 92" width={size} height={size*1.15}>
      {showPot && <><path d="M28 76 L32 88 L48 88 L52 76 Z" fill="#C2855A"/><rect x="25" y="72" width="30" height="6" rx="3" fill="#A66B42"/></>}
      {st>=1 && <line x1="40" y1={showPot?72:85} x2="40" y2={st<=1?58:30} stroke="#8B7355" strokeWidth={st<=1?3:5} strokeLinecap="round"/>}
      {st>=2 && <>
        <line x1="40" y1="45" x2="25" y2="35" stroke="#7D6040" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="40" y1="40" x2="58" y2="30" stroke="#7D6040" strokeWidth="2" strokeLinecap="round"/>
        <line x1="40" y1="35" x2="22" y2="22" stroke="#7D6040" strokeWidth="2" strokeLinecap="round"/>
        <line x1="40" y1="30" x2="56" y2="18" stroke="#7D6040" strokeWidth="1.5" strokeLinecap="round"/>
      </>}
      {st>=1 && [{cx:40,cy:st<=1?52:25,r:st<=1?8:12},...(st>=2?[{cx:25,cy:30,r:11},{cx:58,cy:25,r:10},{cx:22,cy:17,r:10},{cx:56,cy:13,r:9},{cx:40,cy:18,r:11}]:[])].map((c,i) =>
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={lc[st]} opacity={lo[st]}/>
      )}
      {st===0 && <ellipse cx="40" cy="68" rx="5" ry="3.5" fill="#A67C52" opacity="0.6"/>}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════
// PATH VIEW — top to bottom, start at top, goal at bottom
// ═══════════════════════════════════════════════════════════════
const PathView = ({ avatar, onStartLesson }) => {
  const lessons = SKILL_PATH.lessons;
  // Top to bottom positions — start at top, finish at bottom
  const positions = [
    { x: 40, y: 12 },  // first lesson (top)
    { x: 65, y: 35 },
    { x: 35, y: 58 },
    { x: 55, y: 82 },  // final lesson (bottom = goal)
  ];

  return (
    <div style={{ padding:"20px 16px 90px", maxWidth:500, margin:"0 auto" }}>
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:6 }}>{SKILL_PATH.icon}</div>
        <h2 style={{ fontFamily:T.fontD, fontSize:26, color:T.green[800], marginBottom:4 }}>{SKILL_PATH.name}</h2>
        <p style={{ fontFamily:T.font, fontWeight:500, fontSize:14, color:T.slate[400] }}>
          {lessons.filter(l=>l.status==="completed").length} of {lessons.length} lessons complete
        </p>
      </motion.div>

      <div style={{ position:"relative", width:"100%", height:520 }}>
        {/* SVG path connecting nodes */}
        <svg viewBox="0 0 100 100" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} preserveAspectRatio="none">
          {positions.slice(0,-1).map((p,i) => {
            const next = positions[i+1];
            const cpx = (p.x+next.x)/2 + (i%2===0?12:-12);
            const cpy = (p.y+next.y)/2;
            const done = lessons[i].status==="completed";
            return <path key={i} d={`M${p.x} ${p.y} Q${cpx} ${cpy} ${next.x} ${next.y}`}
              fill="none" stroke={done?T.green[300]:T.slate[200]} strokeWidth="2.5"
              strokeDasharray={done?"none":"4 4"} strokeLinecap="round" />;
          })}
        </svg>

        {/* Lesson nodes */}
        {lessons.map((lesson,i) => {
          const pos = positions[i];
          const isCurr = lesson.status==="current";
          const isDone = lesson.status==="completed";
          const isLock = lesson.status==="locked";
          const health = isDone ? healthFromDays(lesson.daysAgo) : 0;
          const needsRefresh = isDone && health < 50;
          const isGoal = i === lessons.length - 1;

          return (
            <motion.div key={lesson.id}
              initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}}
              transition={{delay:i*0.12, type:"spring"}}
              style={{ position:"absolute", left:`${pos.x}%`, top:`${pos.y}%`,
                transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column",
                alignItems:"center", gap:6 }}>

              {/* Avatar on current node */}
              {isCurr && (
                <motion.div animate={{y:[0,-6,0]}} transition={{repeat:Infinity,duration:1.5,ease:"easeInOut"}}
                  style={{ marginBottom:-4 }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background:`linear-gradient(135deg, ${T.green[400]}, ${T.green[500]})`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                    boxShadow:`0 0 0 3px #fff, 0 0 0 6px ${T.green[500]}, 0 3px 12px ${T.green[200]}` }}>
                    {avatar.emoji}
                  </div>
                </motion.div>
              )}

              {/* Node circle */}
              <motion.button
                whileHover={!isLock?{scale:1.08}:{}} whileTap={!isLock?{scale:0.95}:{}}
                onClick={() => !isLock && onStartLesson(lesson)}
                style={{ width:72, height:72, borderRadius:"50%", border:"none",
                  cursor:isLock?"default":"pointer",
                  background: isDone ? `linear-gradient(135deg,${T.green[400]},${T.green[500]})`
                    : isCurr ? `linear-gradient(135deg,${T.amber[300]},${T.amber[500]})`
                    : T.slate[200],
                  boxShadow: isCurr ? `0 0 0 4px ${T.amber[200]}, 0 6px 20px ${T.amber[200]}`
                    : isDone ? `0 4px 12px ${T.green[200]}` : `0 3px 8px ${T.slate[100]}`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  fontSize:26,position:"relative" }}>
                {isLock ? "🔒" : lesson.icon}
                {isDone && <div style={{ position:"absolute",bottom:-4,display:"flex",gap:1 }}>
                  {[1,2,3].map(s => <span key={s} style={{ fontSize:12,opacity:s<=lesson.stars?1:0.3 }}>⭐</span>)}
                </div>}
                {needsRefresh && (
                  <motion.div animate={{scale:[1,1.15,1]}} transition={{repeat:Infinity,duration:2}}
                    style={{ position:"absolute",top:-6,right:-6, background:T.amber[500],width:22,height:22,
                      borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,boxShadow:`0 2px 6px ${T.amber[300]}`,border:"2px solid #fff" }}>💧</motion.div>
                )}
                {isCurr && <motion.div animate={{scale:[1,1.6],opacity:[0.5,0]}}
                  transition={{repeat:Infinity,duration:1.5}}
                  style={{ position:"absolute",inset:-4,borderRadius:"50%",border:`3px solid ${T.amber[400]}`}} />}
              </motion.button>

              {/* Label */}
              <div style={{ textAlign:"center",maxWidth:100 }}>
                <p style={{ fontFamily:T.font,fontWeight:700,fontSize:13,
                  color:isLock?T.slate[400]:T.slate[700],marginBottom:1 }}>{lesson.title}</p>
                {isDone && (
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:3 }}>
                    <MiniTree health={health} size={20} showPot={false}/>
                    <span style={{ fontFamily:T.font,fontWeight:600,fontSize:11,
                      color:health>50?T.green[600]:T.amber[600] }}>{health}%</span>
                  </div>
                )}
                {isGoal && <div style={{ fontFamily:T.font,fontWeight:700,fontSize:11,
                  color:T.amber[600],marginTop:4 }}>🎯 Goal!</div>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// GARDEN VIEW — Explorable 2D world with arrow key movement
// ═══════════════════════════════════════════════════════════════
const GARDEN_W = 650;
const GARDEN_H = 520;
const AVATAR_SPEED = 5;
const INTERACT_DIST = 70;

const GardenView = ({ avatar, onOpenPath }) => {
  const [pos, setPos] = useState({ x: 320, y: 440 });
  const [facing, setFacing] = useState("down");
  const [nearTree, setNearTree] = useState(null);
  const keysRef = useRef(new Set());
  const gardenRef = useRef(null);

  // Keyboard movement
  useEffect(() => {
    const down = (e) => { if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) { e.preventDefault(); keysRef.current.add(e.key); }};
    const up = (e) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Game loop
  useEffect(() => {
    let raf;
    const loop = () => {
      const k = keysRef.current;
      setPos(p => {
        let nx = p.x, ny = p.y;
        if (k.has("ArrowUp")||k.has("w")) { ny -= AVATAR_SPEED; setFacing("up"); }
        if (k.has("ArrowDown")||k.has("s")) { ny += AVATAR_SPEED; setFacing("down"); }
        if (k.has("ArrowLeft")||k.has("a")) { nx -= AVATAR_SPEED; setFacing("left"); }
        if (k.has("ArrowRight")||k.has("d")) { nx += AVATAR_SPEED; setFacing("right"); }
        nx = Math.max(20, Math.min(GARDEN_W - 20, nx));
        ny = Math.max(20, Math.min(GARDEN_H - 20, ny));
        return { x: nx, y: ny };
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Proximity detection
  useEffect(() => {
    const closest = GARDEN_TREES.reduce((best, tree) => {
      const dx = pos.x - tree.x;
      const dy = pos.y - tree.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < INTERACT_DIST && (best === null || dist < best.dist)) return { ...tree, dist };
      return best;
    }, null);
    setNearTree(closest);
  }, [pos]);

  // Touch controls for mobile
  const move = (dir) => {
    setPos(p => {
      let nx=p.x, ny=p.y;
      if(dir==="up") ny-=20; if(dir==="down") ny+=20;
      if(dir==="left") nx-=20; if(dir==="right") nx+=20;
      return { x:Math.max(20,Math.min(GARDEN_W-20,nx)), y:Math.max(20,Math.min(GARDEN_H-20,ny)) };
    });
    setFacing(dir);
  };

  return (
    <div style={{ padding:"10px 0 90px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign:"center", marginBottom:12, padding:"0 16px" }}>
        <h2 style={{ fontFamily:T.fontD, fontSize:24, color:T.green[800], marginBottom:2 }}>🌳 Your Garden</h2>
        <p style={{ fontFamily:T.font, fontWeight:500, fontSize:13, color:T.slate[400] }}>
          Walk around with arrow keys or WASD · Approach a tree to interact
        </p>
      </motion.div>

      {/* Garden viewport */}
      <div ref={gardenRef} tabIndex={0}
        style={{ width: Math.min(GARDEN_W, typeof window !== 'undefined' ? window.innerWidth - 20 : GARDEN_W),
          height: GARDEN_H, position:"relative", borderRadius:T.r.xl, overflow:"hidden",
          border:`3px solid ${T.green[300]}`, boxShadow:`0 4px 24px ${T.green[100]}`,
          outline:"none", cursor:"none" }}
        onFocus={() => {}} >

        {/* Ground layers */}
        <div style={{ position:"absolute", inset:0,
          background:`
            radial-gradient(ellipse at 30% 70%, #C8E6C0 0%, transparent 50%),
            radial-gradient(ellipse at 70% 30%, #D4EDBC 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, #B8D4A8 0%, transparent 60%),
            linear-gradient(180deg, #A8D5A0 0%, #8FBF87 30%, #7BAF72 60%, #6D9F65 100%)
          `}} />

        {/* Dirt path */}
        <svg style={{ position:"absolute", inset:0 }} viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`}>
          <path d={`M320 ${GARDEN_H} Q320 400 260 320 Q200 240 260 180 Q320 120 380 140 Q440 160 500 250 Q560 340 450 400`}
            fill="none" stroke="#C4A97D" strokeWidth="28" strokeLinecap="round" opacity="0.5" />
          <path d={`M320 ${GARDEN_H} Q320 400 260 320 Q200 240 260 180 Q320 120 380 140 Q440 160 500 250 Q560 340 450 400`}
            fill="none" stroke="#D4B98D" strokeWidth="20" strokeLinecap="round" opacity="0.4"
            strokeDasharray="2 8" />
        </svg>

        {/* Decorative elements */}
        {[{x:30,y:60,e:"🌻",s:18},{x:580,y:80,e:"🌼",s:16},{x:50,y:320,e:"🌷",s:15},
          {x:600,y:380,e:"🌻",s:17},{x:200,y:460,e:"🌼",s:14},{x:520,y:460,e:"🌷",s:16},
          {x:90,y:140,e:"🦋",s:14},{x:540,y:170,e:"🐝",s:12},{x:350,y:60,e:"🦋",s:13},
          {x:170,y:80,e:"🪨",s:16},{x:480,y:120,e:"🪨",s:14},{x:580,y:300,e:"🍄",s:14},
          {x:40,y:430,e:"🍄",s:13},
        ].map((d,i) => (
          <div key={i} style={{ position:"absolute", left:d.x, top:d.y, fontSize:d.s,
            pointerEvents:"none", opacity:0.7 }}>{d.e}</div>
        ))}

        {/* Pond */}
        <div style={{ position:"absolute", left:500, top:330, width:100, height:60, borderRadius:"50%",
          background:"radial-gradient(ellipse, #87CEEB 0%, #5DADE2 40%, #3498DB 100%)",
          opacity:0.6, boxShadow:"inset 0 2px 8px rgba(0,0,0,0.15)" }} />
        <div style={{ position:"absolute", left:520, top:345, fontSize:14, opacity:0.5, pointerEvents:"none" }}>🐟</div>

        {/* Fence segments */}
        {Array.from({length:Math.floor(GARDEN_W/40)}).map((_,i) => (
          <div key={`ft${i}`} style={{ position:"absolute", left:i*40, top:0, fontSize:10,
            pointerEvents:"none", opacity:0.4 }}>▮</div>
        ))}

        {/* TREES */}
        {GARDEN_TREES.map(tree => {
          const isNear = nearTree?.id === tree.id;
          const isEmpty = tree.health === 0 && tree.daysAgo === null;
          const needsWater = tree.health > 0 && tree.health < 50;

          return (
            <div key={tree.id} style={{ position:"absolute", left:tree.x, top:tree.y,
              transform:"translate(-50%,-50%)" }}>
              {/* Status indicator floating above tree */}
              {!isEmpty && tree.health > 0 && (
                <motion.div
                  animate={needsWater ? {y:[0,-4,0]} : {}}
                  transition={{repeat:Infinity,duration:2}}
                  style={{ position:"absolute", top:-55, left:"50%", transform:"translateX(-50%)",
                    background:needsWater ? T.amber[100] : T.green[100],
                    border:`2px solid ${needsWater ? T.amber[300] : T.green[300]}`,
                    borderRadius:12, padding:"3px 8px", whiteSpace:"nowrap",
                    display:"flex", alignItems:"center", gap:4 }}>
                  {needsWater && <span style={{ fontSize:12 }}>💧</span>}
                  <span style={{ fontFamily:T.font, fontWeight:700, fontSize:11,
                    color:needsWater?T.amber[700]:T.green[700] }}>
                    {tree.health}%
                  </span>
                </motion.div>
              )}

              {isEmpty ? (
                <div style={{ width:60, height:40, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", opacity:0.4 }}>
                  <div style={{ fontSize:20 }}>🌱</div>
                  <div style={{ fontFamily:T.font, fontWeight:600, fontSize:9, color:T.slate[500],
                    textAlign:"center", marginTop:2 }}>{tree.name}</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <MiniTree health={tree.health} size={65} />
                  <div style={{ fontFamily:T.font, fontWeight:700, fontSize:10, color:T.slate[600],
                    textAlign:"center", marginTop:-4 }}>{tree.icon}</div>
                  {/* Decorations on tree */}
                  {tree.decorations.map((d,i) => (
                    <span key={i} style={{ position:"absolute", top:5+i*14, right:-10, fontSize:14 }}>{d}</span>
                  ))}
                  {/* Gift indicators */}
                  {tree.gifts.length > 0 && (
                    <div style={{ display:"flex", gap:2, marginTop:2 }}>
                      {tree.gifts.map((g,i) => <span key={i} style={{ fontSize:10 }}>{g}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* Interaction panel when near */}
              <AnimatePresence>
                {isNear && !isEmpty && (
                  <motion.div
                    initial={{opacity:0,y:10,scale:0.9}}
                    animate={{opacity:1,y:0,scale:1}}
                    exit={{opacity:0,y:10,scale:0.9}}
                    style={{ position:"absolute", top: tree.health > 0 ? 75 : 50,
                      left:"50%", transform:"translateX(-50%)", zIndex:20,
                      background:"rgba(255,255,255,0.95)", backdropFilter:"blur(8px)",
                      borderRadius:T.r.lg, padding:14, minWidth:180,
                      border:`2px solid ${tree.health < 50 ? T.amber[300] : T.green[300]}`,
                      boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                    {/* Speech bubble arrow */}
                    <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)",
                      width:0, height:0, borderLeft:"8px solid transparent", borderRight:"8px solid transparent",
                      borderBottom:`8px solid ${tree.health<50?T.amber[300]:T.green[300]}` }} />

                    <p style={{ fontFamily:T.font, fontWeight:700, fontSize:14, color:T.slate[800],
                      marginBottom:6, textAlign:"center" }}>{tree.icon} {tree.name}</p>

                    {/* Health bar */}
                    <div style={{ width:"100%", height:8, borderRadius:4, background:T.slate[100],
                      overflow:"hidden", marginBottom:8 }}>
                      <div style={{ height:"100%", borderRadius:4, transition:"width 0.5s",
                        width:`${tree.health}%`,
                        background:tree.health>70?T.green[400]:tree.health>40?T.amber[400]:T.red[400] }} />
                    </div>

                    <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
                      {/* Primary action: Open path */}
                      <motion.button whileTap={{scale:0.92}} onClick={() => onOpenPath?.(tree)}
                        style={{ background:`linear-gradient(135deg, ${tree.health<50?T.amber[500]:T.green[500]}, ${tree.health<50?T.amber[600]:T.green[400]})`,
                          color:"#fff", border:"none", borderRadius:T.r.sm, padding:"6px 12px",
                          fontFamily:T.font, fontWeight:700, fontSize:12, cursor:"pointer",
                          boxShadow:`0 2px 0 ${tree.health<50?T.amber[700]:T.green[700]}`, width:"100%" }}>
                        {tree.health < 50 ? "💧 Refresh Lesson" : "📖 Open Path"}
                      </motion.button>
                      <motion.button whileTap={{scale:0.92}}
                        style={{ background:T.pink[100], border:`1.5px solid ${T.pink[300]}`,
                          borderRadius:T.r.sm, padding:"6px 10px", fontFamily:T.font, fontWeight:600,
                          fontSize:11, color:T.pink[500], cursor:"pointer" }}>
                        🎀 Decorate
                      </motion.button>
                      <motion.button whileTap={{scale:0.92}}
                        style={{ background:T.sky[50], border:`1.5px solid ${T.sky[200]}`,
                          borderRadius:T.r.sm, padding:"6px 10px", fontFamily:T.font, fontWeight:600,
                          fontSize:11, color:T.sky[500], cursor:"pointer" }}>
                        💌 Gift
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty plot interaction */}
              <AnimatePresence>
                {isNear && isEmpty && (
                  <motion.div
                    initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
                    style={{ position:"absolute", top:45, left:"50%", transform:"translateX(-50%)",
                      zIndex:20, background:"rgba(255,255,255,0.95)", borderRadius:T.r.lg,
                      padding:12, minWidth:150, border:`2px dashed ${T.slate[300]}`,
                      boxShadow:"0 8px 24px rgba(0,0,0,0.1)", textAlign:"center" }}>
                    <p style={{ fontFamily:T.font, fontWeight:700, fontSize:13, color:T.slate[600], marginBottom:6 }}>
                      {tree.icon} {tree.name}</p>
                    <p style={{ fontFamily:T.font, fontWeight:500, fontSize:11, color:T.slate[400], marginBottom:8 }}>
                      Empty plot — start this path!</p>
                    <motion.button whileTap={{scale:0.92}} onClick={() => onOpenPath?.(tree)}
                      style={{ background:`linear-gradient(135deg,${T.green[500]},${T.green[400]})`,
                        color:"#fff", border:"none", borderRadius:T.r.sm, padding:"6px 14px",
                        fontFamily:T.font, fontWeight:700, fontSize:12, cursor:"pointer",
                        boxShadow:`0 2px 0 ${T.green[700]}` }}>
                      Plant 🌱
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* AVATAR */}
        <motion.div
          animate={{ x: pos.x - 20, y: pos.y - 20 }}
          transition={{ type:"tween", duration:0.08 }}
          style={{ position:"absolute", width:40, height:40, zIndex:30 }}>
          <div style={{ width:40, height:40, borderRadius:"50%",
            background:`linear-gradient(135deg, ${T.green[400]}, ${T.green[500]})`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
            boxShadow:`0 0 0 3px #fff, 0 4px 12px rgba(0,0,0,0.2)`,
            transform: facing==="left" ? "scaleX(-1)" : "none" }}>
            {avatar.emoji}
          </div>
          {/* Shadow */}
          <div style={{ position:"absolute", bottom:-4, left:6, width:28, height:8,
            borderRadius:"50%", background:"rgba(0,0,0,0.15)" }} />
        </motion.div>

        {/* Vignette overlay */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%)" }} />
      </div>

      {/* Mobile D-pad */}
      <div style={{ marginTop:12, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
        <motion.button whileTap={{scale:0.85}} onPointerDown={()=>move("up")}
          style={dpadStyle}>▲</motion.button>
        <div style={{ display:"flex", gap:4 }}>
          <motion.button whileTap={{scale:0.85}} onPointerDown={()=>move("left")}
            style={dpadStyle}>◀</motion.button>
          <div style={{ width:44, height:44 }} />
          <motion.button whileTap={{scale:0.85}} onPointerDown={()=>move("right")}
            style={dpadStyle}>▶</motion.button>
        </div>
        <motion.button whileTap={{scale:0.85}} onPointerDown={()=>move("down")}
          style={dpadStyle}>▼</motion.button>
      </div>

      {/* Friend gifts banner */}
      <div style={{ maxWidth:500, width:"100%", margin:"16px auto 0", padding:"0 16px" }}>
        <div style={{ background:"rgba(255,255,255,0.9)", borderRadius:T.r.xl, padding:14,
          border:`2px solid ${T.pink[200]}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span style={{ fontSize:18 }}>🎁</span>
            <span style={{ fontFamily:T.font, fontWeight:700, fontSize:14, color:T.pink[500] }}>Friend Gifts</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[{from:"Emma",gift:"💧",emoji:"🐱"},{from:"Luca",gift:"✨",emoji:"🐼"}].map((g,i) => (
              <motion.div key={i} whileHover={{scale:1.04}}
                style={{ background:T.pink[50], borderRadius:T.r.md, padding:"8px 12px",
                  border:`1.5px solid ${T.pink[200]}`, flex:1, textAlign:"center", cursor:"pointer" }}>
                <span style={{ fontSize:20 }}>{g.emoji}</span>
                <p style={{ fontFamily:T.font, fontWeight:600, fontSize:11, color:T.slate[600] }}>{g.from}</p>
                <p style={{ fontSize:18 }}>{g.gift}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const dpadStyle = { width:44, height:44, borderRadius:12, border:`2px solid ${T.slate[200]}`,
  background:"#fff", fontFamily:"sans-serif", fontSize:16, color:T.slate[500],
  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
  boxShadow:`0 2px 0 ${T.slate[200]}` };

// ═══════════════════════════════════════════════════════════════
// LESSON VIEW (compact, same mechanics as v3)
// ═══════════════════════════════════════════════════════════════
const Btn = ({onClick,label,variant="primary",disabled=false}) => {
  const bg = variant==="primary" ? `linear-gradient(135deg,${T.green[500]},${T.green[400]})` : "linear-gradient(135deg,#FB923C,#FDBA74)";
  const sh = variant==="primary" ? T.green[700] : "#C2410C";
  return <motion.button whileTap={!disabled?{scale:0.95}:{}} onClick={onClick} disabled={disabled}
    style={{ background:disabled?T.slate[200]:bg, color:disabled?T.slate[400]:"#fff", border:"none",
      borderRadius:T.r.md, padding:"12px 28px", fontFamily:T.font, fontWeight:800, fontSize:15,
      cursor:disabled?"default":"pointer", boxShadow:`0 4px 0 ${disabled?T.slate[300]:sh}` }}>{label}</motion.button>;
};

const HelpPanel = ({text,onClose}) => (
  <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}
    style={{ background:T.sky[50], border:`2px solid ${T.sky[200]}`, borderRadius:T.r.lg,
      padding:12, marginBottom:10, position:"relative" }}>
    <div style={{ display:"flex", gap:8 }}>
      <span style={{ fontSize:18 }}>🐦</span>
      <p style={{ fontFamily:T.font, fontWeight:600, fontSize:14, color:T.slate[700], lineHeight:1.5, margin:0 }}>{text}</p>
    </div>
    <button onClick={onClose} style={{ position:"absolute",top:6,right:8,background:"none",border:"none",
      cursor:"pointer",fontSize:16,color:T.slate[400] }}>✕</button>
  </motion.div>
);

const ActHdr = ({sunlight,reduced,onHelp}) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
    <motion.button whileTap={{scale:0.95}} onClick={onHelp}
      style={{ background:T.sky[50], border:`2px solid ${T.sky[200]}`, borderRadius:T.r.md,
        padding:"5px 10px", fontFamily:T.font, fontWeight:700, fontSize:12, color:T.sky[500], cursor:"pointer" }}>
      💬 Help</motion.button>
    <span style={{ background:T.amber[100], border:`1.5px solid ${T.amber[300]}`, borderRadius:T.r.sm,
      padding:"3px 8px", fontFamily:T.font, fontWeight:800, fontSize:12, color:T.amber[700], display:"flex", alignItems:"center", gap:3 }}>
      <SunDropIcon size={14}/> {reduced ? Math.ceil(sunlight/2) : sunlight} {reduced ? "(retry)" : ""}
    </span>
  </div>
);

// Activity components (compact versions)
const MC = ({data,helpText,onComplete,onWrong}) => {
  const [sel,setSel]=useState(null);const[done,setDone]=useState(false);
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[att,setAtt]=useState(0);
  const pick=(i)=>{if(done)return;setSel(i);
    if(i===data.correctIndex){setDone(true);const e=hp||att>0?Math.ceil(data.sunlight/2):data.sunlight;
      setTimeout(()=>onComplete(true,Math.max(0,e-att)),900);}
    else{setAtt(a=>a+1);onWrong();setTimeout(()=>setSel(null),700);}};
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||att>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <p style={{fontFamily:T.font,fontWeight:700,fontSize:16,color:T.slate[800],marginBottom:12}}>{data.question}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {data.options.map((o,i)=>{const c=i===data.correctIndex;const s=sel===i;
        let bg="#fff",bd=T.slate[200],cl=T.slate[800];
        if(s&&done&&c){bg=T.green[100];bd=T.green[500];cl=T.green[800];}
        if(s&&!done){bg=T.red[50];bd=T.red[400];cl=T.red[600];}
        return<motion.button key={i} onClick={()=>pick(i)} whileTap={!done?{scale:0.95}:{}}
          animate={s&&!done?{x:[0,-5,5,-3,3,0]}:{}}
          style={{background:bg,border:`2.5px solid ${bd}`,borderRadius:T.r.md,padding:"12px 10px",
            fontFamily:T.font,fontWeight:700,fontSize:15,color:cl,cursor:done?"default":"pointer",
            boxShadow:`0 3px 0 ${bd}`}}>{done&&c&&"✅ "}{s&&!done&&"❌ "}{o}</motion.button>;})}
    </div></div>);
};

const FB = ({data,helpText,onComplete,onWrong}) => {
  const[inp,setInp]=useState("");const[st,setSt]=useState("a");const ref=useRef(null);
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[att,setAtt]=useState(0);
  useEffect(()=>{ref.current?.focus();},[]);
  const check=()=>{if(!inp.trim())return;
    if(inp.trim().toLowerCase()===data.correctAnswer.toLowerCase()){setSt("c");
      const e=hp||att>0?Math.ceil(data.sunlight/2):data.sunlight;
      setTimeout(()=>onComplete(true,Math.max(0,e-att)),900);}
    else{setSt("w");setAtt(a=>a+1);onWrong();}};
  const parts=data.sentence.split("___");
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||att>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <p style={{fontFamily:T.font,fontWeight:700,fontSize:16,color:T.slate[800],marginBottom:4}}>Complete:</p>
    {data.hint&&<p style={{fontFamily:T.font,fontSize:12,color:T.slate[400],marginBottom:10,fontWeight:600}}>💡 {data.hint}</p>}
    <div style={{fontFamily:T.font,fontSize:18,fontWeight:600,color:T.slate[800],lineHeight:2.2,display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>
      <span>{parts[0]}</span>
      <input ref={ref} value={inp} onChange={e=>{setInp(e.target.value);if(st==="w")setSt("a");}}
        onKeyDown={e=>e.key==="Enter"&&check()} disabled={st==="c"}
        style={{borderBottom:`3px solid ${st==="c"?T.green[500]:st==="w"?T.red[400]:T.green[400]}`,
          background:st==="c"?T.green[100]:st==="w"?T.red[50]:T.green[50],outline:"none",
          fontFamily:T.font,fontWeight:800,fontSize:18,textAlign:"center",
          width:Math.max(100,inp.length*13+40),padding:"4px 8px",borderRadius:"8px 8px 0 0",
          color:st==="c"?T.green[800]:st==="w"?T.red[600]:T.slate[800]}} placeholder="?"/>
      <span>{parts[1]}</span></div>
    {st==="w"&&<p style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:T.red[500],marginTop:6}}>Not quite! 💪</p>}
    <div style={{display:"flex",gap:8,marginTop:12}}>
      {st==="a"&&<Btn onClick={check} disabled={!inp.trim()} label="Check ✓"/>}
      {st==="w"&&<Btn onClick={()=>{setInp("");setSt("a");setTimeout(()=>ref.current?.focus(),100);}} label="Retry 🔄" variant="retry"/>}
    </div></div>);
};

const WA = ({data,helpText,onComplete,onWrong}) => {
  const[pl,setPl]=useState([]);const[av,setAv]=useState([...data.scrambledWords]);const[st,setSt]=useState("a");
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[att,setAtt]=useState(0);
  const tap=(w,i)=>{if(st!=="a")return;setPl(p=>[...p,w]);setAv(a=>a.filter((_,j)=>j!==i));};
  const untap=(w,i)=>{if(st!=="a")return;setAv(a=>[...a,w]);setPl(p=>p.filter((_,j)=>j!==i));};
  const check=()=>{if(pl.join(" ")===data.targetSentence){setSt("c");
    const e=hp||att>0?Math.ceil(data.sunlight/2):data.sunlight;
    setTimeout(()=>onComplete(true,Math.max(0,e-att)),900);}
    else{setSt("w");setAtt(a=>a+1);onWrong();}};
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||att>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <p style={{fontFamily:T.font,fontWeight:700,fontSize:16,color:T.slate[800],marginBottom:10}}>Build the sentence:</p>
    <motion.div animate={st==="w"?{x:[0,-4,4,-2,2,0]}:{}}
      style={{minHeight:48,background:st==="c"?T.green[100]:st==="w"?T.red[50]:T.slate[50],
        border:`2.5px dashed ${st==="c"?T.green[500]:st==="w"?T.red[400]:T.slate[300]}`,
        borderRadius:T.r.lg,padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
      {pl.length===0&&<span style={{color:T.slate[400],fontFamily:T.font,fontStyle:"italic",fontSize:14}}>Tap words...</span>}
      {pl.map((w,i)=><motion.button key={`p${i}`} layout initial={{scale:0}} animate={{scale:1}} onClick={()=>untap(w,i)}
        style={{background:"#fff",border:`2px solid ${T.green[400]}`,borderRadius:10,padding:"7px 12px",
          fontFamily:T.font,fontWeight:700,fontSize:15,color:T.slate[800],cursor:st==="a"?"pointer":"default",
          boxShadow:`0 2px 0 ${T.green[200]}`}}>{w}</motion.button>)}
    </motion.div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
      {av.map((w,i)=><motion.button key={`a${w}${i}`} whileTap={{scale:0.9}} onClick={()=>tap(w,i)}
        style={{background:"#fff",border:`2.5px solid ${T.slate[200]}`,borderRadius:10,padding:"7px 12px",
          fontFamily:T.font,fontWeight:700,fontSize:15,color:T.slate[600],cursor:"pointer",
          boxShadow:`0 3px 0 ${T.slate[200]}`}}>{w}</motion.button>)}
    </div>
    {st==="w"&&<p style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:T.red[500],marginBottom:6}}>Answer: "{data.targetSentence}"</p>}
    <div style={{display:"flex",gap:8}}>
      {st==="a"&&pl.length>0&&<Btn onClick={check} label="Check ✓"/>}
      {st==="w"&&<Btn onClick={()=>{setPl([]);setAv([...data.scrambledWords]);setSt("a");}} label="Retry 🔄" variant="retry"/>}
    </div></div>);
};

const TF = ({data,helpText,onComplete,onWrong}) => {
  const[ans,setAns]=useState(null);const[ok,setOk]=useState(null);
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[att,setAtt]=useState(0);
  const pick=(v)=>{if(ok)return;setAns(v);if(v===data.isTrue){setOk(true);
    const e=hp||att>0?Math.ceil(data.sunlight/2):data.sunlight;
    setTimeout(()=>onComplete(true,Math.max(0,e-att)),900);}
    else{setOk(false);setAtt(a=>a+1);onWrong();setTimeout(()=>{setAns(null);setOk(null);},900);}};
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||att>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <div style={{background:T.slate[50],borderRadius:T.r.lg,padding:14,marginBottom:12,border:`2px solid ${T.slate[200]}`}}>
      <p style={{fontFamily:T.font,fontWeight:700,fontSize:17,color:T.slate[800],textAlign:"center",margin:0}}>
        "{data.statement}"</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{l:"True ✅",v:true},{l:"False ❌",v:false}].map(({l,v})=>{
        let bg="#fff",bd=T.slate[200],c=T.slate[800];
        if(ans===v&&ok){bg=T.green[100];bd=T.green[500];c=T.green[800];}
        if(ans===v&&ok===false){bg=T.red[50];bd=T.red[400];c=T.red[600];}
        return<motion.button key={l} onClick={()=>pick(v)} whileTap={!ok?{scale:0.95}:{}}
          animate={ans===v&&ok===false?{x:[0,-4,4,-2,2,0]}:{}}
          style={{background:bg,border:`2.5px solid ${bd}`,borderRadius:T.r.md,padding:14,
            fontFamily:T.font,fontWeight:800,fontSize:17,color:c,cursor:ok?"default":"pointer",
            boxShadow:`0 3px 0 ${bd}`}}>{l}</motion.button>;})}
    </div></div>);
};

const MA = ({data,helpText,onComplete,onWrong}) => {
  const sr=useMemo(()=>[...data.pairs.map(p=>p.right)].sort(()=>Math.random()-0.5),[data.pairs]);
  const[sl,setSl]=useState(null);const[mt,setMt]=useState({});const[wp,setWp]=useState(null);
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[wa,setWa]=useState(0);
  const cL=(l)=>{if(mt[l])return;setSl(l);setWp(null);};
  const cR=(r)=>{if(!sl||Object.values(mt).includes(r))return;const p=data.pairs.find(p=>p.left===sl);
    if(p&&p.right===r){const nm={...mt,[sl]:r};setMt(nm);setSl(null);
      if(Object.keys(nm).length===data.pairs.length){const e=hp||wa>0?Math.ceil(data.sunlight/2):data.sunlight;
        setTimeout(()=>onComplete(true,Math.max(0,e-wa)),700);}}
    else{setWp({l:sl,r});setWa(a=>a+1);onWrong();setTimeout(()=>{setWp(null);setSl(null);},500);}};
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||wa>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <p style={{fontFamily:T.font,fontWeight:700,fontSize:16,color:T.slate[800],marginBottom:10}}>Match:</p>
    <div style={{display:"flex",gap:10}}>
      {[data.pairs.map(p=>p.left),sr].map((col,ci)=>(
        <div key={ci} style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {col.map(item=>{const isL=ci===0;const dn=isL?!!mt[item]:Object.values(mt).includes(item);
            const se=isL&&sl===item;const wr=isL?wp?.l===item:wp?.r===item;
            return<motion.button key={item} onClick={()=>isL?cL(item):cR(item)}
              animate={wr?{x:[0,isL?-4:4,isL?4:-4,0]}:{}}
              style={{background:dn?T.green[100]:se?T.sky[50]:"#fff",
                border:`2px solid ${dn?T.green[500]:se?T.sky[400]:wr?T.red[400]:T.slate[200]}`,
                borderRadius:T.r.sm,padding:"10px 8px",fontFamily:T.font,fontWeight:700,fontSize:13,
                color:dn?T.green[800]:T.slate[700],cursor:dn?"default":"pointer",
                opacity:dn?0.6:1,textAlign:"center"}}>{item}</motion.button>;})}
        </div>))}
    </div></div>);
};

const TR = ({data,helpText,onComplete,onWrong}) => {
  const[inp,setInp]=useState("");const[st,setSt]=useState("a");const ref=useRef(null);
  const[sh,setSh]=useState(false);const[hp,setHp]=useState(false);const[att,setAtt]=useState(0);
  useEffect(()=>{ref.current?.focus();},[]);
  const check=()=>{if(!inp.trim())return;const n=inp.trim().toLowerCase().replace(/[.,!?]/g,"");
    if(data.acceptedAnswers.some(a=>a.toLowerCase().replace(/[.,!?]/g,"")===n)){setSt("c");
      const e=hp||att>0?Math.ceil(data.sunlight/2):data.sunlight;
      setTimeout(()=>onComplete(true,Math.max(0,e-att)),900);}
    else{setSt("w");setAtt(a=>a+1);onWrong();}};
  return(<div><ActHdr sunlight={data.sunlight} reduced={hp||att>0} onHelp={()=>{setSh(true);setHp(true);}}/>
    <AnimatePresence>{sh&&<HelpPanel text={helpText} onClose={()=>setSh(false)}/>}</AnimatePresence>
    <p style={{fontFamily:T.font,fontWeight:700,fontSize:16,color:T.slate[800],marginBottom:6}}>Translate:</p>
    <div style={{background:"#EDE7F6",borderRadius:T.r.md,padding:"14px 18px",marginBottom:12,border:"2px solid #D1C4E9"}}>
      <p style={{fontFamily:T.font,fontWeight:800,fontSize:19,color:"#4A148C",textAlign:"center",margin:0}}>
        🇫🇷 {data.sourcePhrase}</p></div>
    {data.hint&&<p style={{fontFamily:T.font,fontSize:12,color:T.slate[400],marginBottom:10,fontWeight:600}}>💡 {data.hint}</p>}
    <input ref={ref} value={inp} onChange={e=>{setInp(e.target.value);if(st==="w")setSt("a");}}
      onKeyDown={e=>e.key==="Enter"&&check()} disabled={st==="c"} placeholder="Translation..."
      style={{width:"100%",border:`2.5px solid ${st==="c"?T.green[500]:st==="w"?T.red[400]:T.slate[200]}`,
        borderRadius:T.r.md,padding:"12px 16px",fontFamily:T.font,fontWeight:600,fontSize:16,
        color:T.slate[800],outline:"none",boxSizing:"border-box",
        background:st==="c"?T.green[100]:st==="w"?T.red[50]:"#fff"}}/>
    {st==="w"&&<p style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:T.red[500],marginTop:6}}>
      Try: "{data.acceptedAnswers[0]}"</p>}
    <div style={{display:"flex",gap:8,marginTop:12}}>
      {st==="a"&&<Btn onClick={check} disabled={!inp.trim()} label="Check ✓"/>}
      {st==="w"&&<Btn onClick={()=>{setInp("");setSt("a");setTimeout(()=>ref.current?.focus(),100);}} label="Retry 🔄" variant="retry"/>}
    </div></div>);
};

const ActSwitch = ({step,onComplete,onWrong}) => {
  const p={data:step.activity,helpText:step.helpText,onComplete,onWrong};
  switch(step.activity.type){
    case"multiple_choice":return<MC{...p}/>;case"fill_blank":return<FB{...p}/>;
    case"word_arrange":return<WA{...p}/>;case"true_false":return<TF{...p}/>;
    case"matching":return<MA{...p}/>;case"translate":return<TR{...p}/>;default:return null;}
};

const LessonView = ({onBack}) => {
  const[step,setStep]=useState(0);const[sun,setSun]=useState(0);
  const[showAct,setShowAct]=useState(false);const[comp,setComp]=useState([]);
  const[done,setDone]=useState(false);const[burst,setBurst]=useState(null);
  const[penalty,setPenalty]=useState(false);
  const scrollRef=useRef(null);const cur=LESSON_STEPS[step];

  useEffect(()=>{if(!done&&cur&&!comp.includes(step)){const t=setTimeout(()=>setShowAct(true),600);return()=>clearTimeout(t);}},[step,done,cur,comp]);
  useEffect(()=>{setTimeout(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"}),100);},[step,showAct,comp]);

  const handleOk=useCallback((ok,earned)=>{
    if(earned>0){setSun(s=>s+earned);setBurst(earned);}
    setComp(c=>[...c,step]);setShowAct(false);
    setTimeout(()=>{if(step<LESSON_STEPS.length-1)setStep(s=>s+1);else setDone(true);},1200);
  },[step]);

  const handleWrong=useCallback(()=>{setSun(s=>Math.max(0,s-1));setPenalty(true);},[]);

  return(
    <div style={{padding:"0 0 90px",maxWidth:600,margin:"0 auto"}}>
      <AnimatePresence>{burst&&<SunDropBurst amount={burst} onDone={()=>setBurst(null)}/>}</AnimatePresence>
      <AnimatePresence>{penalty&&<PenaltyBurst onDone={()=>setPenalty(false)}/>}</AnimatePresence>

      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <motion.button whileTap={{scale:0.9}} onClick={onBack}
          style={{background:T.slate[100],border:"none",borderRadius:T.r.sm,padding:"8px 12px",
            fontFamily:T.font,fontWeight:700,fontSize:14,color:T.slate[600],cursor:"pointer"}}>← Back</motion.button>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,height:12,borderRadius:6,background:T.slate[100],overflow:"hidden"}}>
              <motion.div style={{height:"100%",borderRadius:6,
                background:`linear-gradient(90deg,${T.green[400]},${T.green[500]})`}}
                animate={{width:`${(comp.length/LESSON_STEPS.length)*100}%`}} transition={{duration:0.4}}/>
            </div>
            <span style={{fontFamily:T.font,fontWeight:800,fontSize:12,color:T.green[600]}}>{comp.length}/{LESSON_STEPS.length}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <SunDropIcon size={18}/> <span style={{fontFamily:T.font,fontWeight:800,fontSize:15,color:T.amber[700]}}>{sun}</span>
        </div>
      </div>

      <div ref={scrollRef} style={{padding:"0 16px",maxHeight:"70vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <span style={{fontFamily:T.fontD,fontSize:20,color:T.green[800]}}>⚽ Match Day Talk</span></div>

        {done ? (
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
            style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{fontSize:60,marginBottom:8}}>🏆</div>
            <h2 style={{fontFamily:T.fontD,fontSize:26,color:T.green[800],marginBottom:4}}>Lesson Done!</h2>
            <p style={{fontFamily:T.font,fontWeight:800,fontSize:20,color:T.amber[700],marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <SunDropIcon size={24} glow/> {sun}/{LESSON_MAX} Sun Drops</p>
            <p style={{fontSize:18,marginBottom:16}}>
              {sun>=LESSON_MAX*0.9?"⭐⭐⭐":sun>=LESSON_MAX*0.6?"⭐⭐":"⭐"}</p>
            <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
              style={{background:`linear-gradient(135deg,${T.pink[50]},${T.sky[50]})`,
                border:`2px solid ${T.pink[200]}`,borderRadius:T.r.xl,padding:18,
                maxWidth:260,margin:"0 auto 18px",textAlign:"center"}}>
              <p style={{fontFamily:T.font,fontWeight:800,fontSize:13,color:T.pink[500],marginBottom:4}}>🎁 Gift unlocked!</p>
              <div style={{fontSize:32,marginBottom:4}}>💧</div>
              <p style={{fontFamily:T.font,fontWeight:700,fontSize:14,color:T.slate[700]}}>Water Drop</p>
              <p style={{fontFamily:T.font,fontWeight:500,fontSize:12,color:T.slate[400]}}>Keep a friend's tree alive!</p>
            </motion.div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn onClick={onBack} label="Back to Path" variant="retry"/>
              <Btn onClick={()=>{setStep(0);setSun(0);setComp([]);setDone(false);setShowAct(false);}} label="Replay 🔄"/>
            </div>
          </motion.div>
        ) : (
          <>
            {comp.map(idx=>(
              <div key={idx} style={{marginBottom:14,opacity:0.45}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:4}}>
                  <span style={{fontSize:18}}>🐦</span>
                  <div style={{background:"#fff",borderRadius:"4px 16px 16px 16px",padding:"10px 14px",
                    border:`1.5px solid ${T.green[100]}`,maxWidth:320}}>
                    <p style={{fontFamily:T.font,fontWeight:600,fontSize:15,color:T.slate[600],margin:0}}>
                      {LESSON_STEPS[idx].tutorText}</p></div></div>
                <div style={{marginLeft:30,background:T.green[50],borderRadius:T.r.sm,
                  padding:"8px 12px",display:"inline-block",border:`1.5px solid ${T.green[200]}`}}>
                  <span style={{fontFamily:T.font,fontWeight:700,fontSize:13,color:T.green[600]}}>✅ Done</span></div>
              </div>))}
            {cur&&!comp.includes(step)&&(
              <div style={{marginBottom:14}}>
                <motion.div initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}}
                  style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                  <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,fontSize:18,
                    background:`linear-gradient(135deg,${T.green[400]},${T.green[600]})`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:`0 3px 8px ${T.green[200]}`}}>🐦</div>
                  <div style={{background:"#fff",borderRadius:"4px 16px 16px 16px",padding:"12px 16px",
                    maxWidth:340,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",border:`1.5px solid ${T.green[100]}`}}>
                    <p style={{fontFamily:T.font,fontWeight:600,fontSize:16,color:T.slate[700],lineHeight:1.5,margin:0}}>
                      {cur.tutorText}</p></div>
                </motion.div>
                <AnimatePresence>
                  {showAct&&(
                    <motion.div style={{marginLeft:46}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                      <div style={{background:"#FCFFFE",borderRadius:T.r.xl,padding:18,
                        border:`2px solid ${T.green[200]}`,boxShadow:`0 4px 16px ${T.green[50]}`}}>
                        <ActSwitch step={cur} onComplete={handleOk} onWrong={handleWrong}/>
                      </div></motion.div>)}
                </AnimatePresence>
              </div>)}
          </>)}
      </div>
    </div>);
};

// ═══════════════════════════════════════════════════════════════
// FRIENDS TAB (placeholder)
// ═══════════════════════════════════════════════════════════════
const FriendsView = () => (
  <div style={{padding:"20px 16px 90px",maxWidth:500,margin:"0 auto"}}>
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{textAlign:"center",marginBottom:20}}>
      <h2 style={{fontFamily:T.fontD,fontSize:24,color:T.green[800],marginBottom:4}}>👥 Friends</h2>
      <p style={{fontFamily:T.font,fontWeight:500,fontSize:13,color:T.slate[400]}}>
        Add friends by sharing your friend code</p>
    </motion.div>
    {/* Friend code */}
    <div style={{background:"#fff",borderRadius:T.r.xl,padding:18,border:`2px solid ${T.green[200]}`,
      textAlign:"center",marginBottom:14}}>
      <p style={{fontFamily:T.font,fontWeight:600,fontSize:13,color:T.slate[400],marginBottom:6}}>Your Friend Code</p>
      <div style={{fontFamily:T.fontD,fontSize:32,letterSpacing:6,color:T.green[700],
        background:T.green[50],borderRadius:T.r.md,padding:"10px 20px",display:"inline-block"}}>
        FX7K2P</div>
      <motion.button whileTap={{scale:0.95}} style={{display:"block",margin:"10px auto 0",
        background:T.green[100],border:`2px solid ${T.green[300]}`,borderRadius:T.r.md,
        padding:"8px 20px",fontFamily:T.font,fontWeight:700,fontSize:13,color:T.green[700],cursor:"pointer"}}>
        📋 Copy Code</motion.button>
    </div>
    {/* Friends list */}
    {[{name:"Emma",emoji:"🐱",streak:5,trees:3,status:"online"},
      {name:"Luca",emoji:"🐼",streak:12,trees:5,status:"today"},
      {name:"Sofia",emoji:"🦊",streak:2,trees:1,status:"yesterday"}].map((f,i) => (
      <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
        style={{background:"#fff",borderRadius:T.r.lg,padding:14,marginBottom:8,
          border:`1.5px solid ${T.slate[100]}`,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:42,height:42,borderRadius:"50%",fontSize:22,
          background:`linear-gradient(135deg,${T.green[400]},${T.green[500]})`,
          display:"flex",alignItems:"center",justifyContent:"center"}}>{f.emoji}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:T.font,fontWeight:700,fontSize:15,color:T.slate[700]}}>{f.name}</span>
            <span style={{width:8,height:8,borderRadius:"50%",
              background:f.status==="online"?T.green[400]:f.status==="today"?T.amber[400]:T.slate[300]}}/>
          </div>
          <span style={{fontFamily:T.font,fontWeight:500,fontSize:12,color:T.slate[400]}}>
            🔥 {f.streak} · 🌳 {f.trees} trees</span>
        </div>
        <motion.button whileTap={{scale:0.9}}
          style={{background:T.pink[100],border:`1.5px solid ${T.pink[300]}`,borderRadius:T.r.sm,
            padding:"6px 12px",fontFamily:T.font,fontWeight:700,fontSize:11,color:T.pink[500],cursor:"pointer"}}>
          💌 Gift</motion.button>
      </motion.div>
    ))}
    {/* Add friend */}
    <div style={{background:T.slate[50],borderRadius:T.r.lg,padding:14,marginTop:10,
      border:`2px dashed ${T.slate[200]}`,textAlign:"center"}}>
      <p style={{fontFamily:T.font,fontWeight:600,fontSize:13,color:T.slate[500],marginBottom:8}}>Add a friend</p>
      <div style={{display:"flex",gap:6,maxWidth:260,margin:"0 auto"}}>
        <input placeholder="Enter friend code..." style={{flex:1,border:`2px solid ${T.slate[200]}`,
          borderRadius:T.r.sm,padding:"8px 12px",fontFamily:T.font,fontWeight:600,fontSize:14,
          outline:"none",letterSpacing:2,textTransform:"uppercase"}}/>
        <motion.button whileTap={{scale:0.95}} style={{background:`linear-gradient(135deg,${T.green[500]},${T.green[400]})`,
          color:"#fff",border:"none",borderRadius:T.r.sm,padding:"8px 16px",fontFamily:T.font,
          fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 3px 0 ${T.green[700]}`}}>Add</motion.button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN APP — Garden is HOME. Path opens from garden. Lesson opens from path.
// Navigation: Garden (home) → Path (sub-menu) → Lesson (gameplay)
// ═══════════════════════════════════════════════════════════════
export default function LingoFriendsApp() {
  const[tab,setTab]=useState("garden");          // Garden is default home
  const[avatar,setAvatar]=useState(AVATARS[0]);
  const[showPicker,setShowPicker]=useState(false);
  const[totalSun,setTotalSun]=useState(42);
  const[activeView,setActiveView]=useState("home"); // "home" | "path" | "lesson"
  const[selectedTree,setSelectedTree]=useState(null);

  // Garden → tap a tree → open its path
  const handleOpenPath = (tree) => {
    setSelectedTree(tree);
    setActiveView("path");
  };

  // Path → tap current lesson → open lesson
  const handleStartLesson = (lesson) => {
    if(lesson.status==="current") setActiveView("lesson");
  };

  // Lesson complete or back → return to path
  const handleLessonBack = () => setActiveView("path");

  // Path back → return to garden
  const handlePathBack = () => { setActiveView("home"); setSelectedTree(null); };

  return(<>
    <FontLoader/>
    <style>{`*{box-sizing:border-box;margin:0}body{margin:0;overflow-x:hidden}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.slate[300]};border-radius:3px}`}</style>
    <div style={{minHeight:"100vh",fontFamily:T.font,
      background:`linear-gradient(165deg,${T.green[50]} 0%,#FDFFFE 35%,${T.sky[50]} 100%)`}}>
      <Header avatar={avatar} sunDrops={totalSun} streak={3} onAvatarClick={()=>setShowPicker(true)}/>
      <AnimatePresence>{showPicker&&<AvatarPicker current={avatar} onPick={av=>{setAvatar(av);setShowPicker(false);}}
        onClose={()=>setShowPicker(false)}/>}</AnimatePresence>

      <AnimatePresence mode="wait">
        {/* LESSON VIEW — fullscreen, no tab bar */}
        {activeView==="lesson"?(
          <motion.div key="lesson" initial={{opacity:0,x:50}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-50}}>
            <LessonView onBack={handleLessonBack}/></motion.div>

        /* PATH VIEW — opened from garden for a specific tree */
        ):activeView==="path"?(
          <motion.div key="path" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}>
            <div style={{padding:"10px 16px 0"}}>
              <motion.button whileTap={{scale:0.9}} onClick={handlePathBack}
                style={{background:T.slate[100],border:"none",borderRadius:T.r.sm,padding:"8px 14px",
                  fontFamily:T.font,fontWeight:700,fontSize:14,color:T.slate[600],cursor:"pointer",
                  marginBottom:4}}>← Garden</motion.button>
            </div>
            <PathView avatar={avatar} onStartLesson={handleStartLesson}/></motion.div>

        /* HOME TABS — Garden (default) or Friends */
        ):tab==="garden"?(
          <motion.div key="garden" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <GardenView avatar={avatar} onOpenPath={handleOpenPath}/></motion.div>
        ):(
          <motion.div key="friends" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <FriendsView/></motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar — only visible on home views, not during path or lesson */}
      {activeView==="home"&&<TabBar active={tab} onChange={setTab}/>}
    </div></>);
}
