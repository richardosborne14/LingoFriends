import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════
// LINGOFRIENDS V2 — INTERACTIVE UI MOCKUP
// Design System: "Sunrise in a magical garden"
// ═══════════════════════════════════════════════

const COLORS = {
  coral: { 50:'#FFF5F2',100:'#FFE8E0',200:'#FFD0C2',300:'#FFB098',400:'#FF8A6A',500:'#F2663D',600:'#D94E28',700:'#B33A1A' },
  forest: { 50:'#F0F9F4',100:'#D8F0E3',200:'#B0E0C7',300:'#7CCCA5',400:'#48B87E',500:'#2D9D62',600:'#1F7F4C',700:'#16613A' },
  sundrop: { 50:'#FFFDF0',100:'#FFF8D6',200:'#FFEFAD',300:'#FFE47A',400:'#FFD84A',500:'#F5C623',600:'#D4A810',700:'#A88308' },
  sky: { 50:'#F0F7FE',300:'#7CC4F5',400:'#4AADEE',500:'#2B96E0' },
  bloom: { 300:'#F5A3C7',400:'#EE7AAF',500:'#E05595' },
  storm: { 400:'#9B7AEE',500:'#7C55E0' },
  bark: { 50:'#FDFCFA',100:'#F7F4F0',150:'#F0ECE6',200:'#E4DED5',300:'#C9C1B5',400:'#A89E90',500:'#7A7168',600:'#5C544C',700:'#3E3833',800:'#252220' },
};

// ═══════════════════════════════════════════════
// CONFETTI ENGINE
// ═══════════════════════════════════════════════
function Confetti({ active, count = 40 }) {
  if (!active) return null;
  const particles = Array.from({ length: count }, (_, i) => {
    const colors = [COLORS.coral[400], COLORS.sundrop[400], COLORS.forest[400], COLORS.bloom[400], COLORS.storm[400]];
    const color = colors[i % colors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const size = 6 + Math.random() * 8;
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 80;
    return (
      <div key={i} style={{
        position: 'absolute', bottom: 0, left: `${left}%`,
        width: size, height: size * (0.4 + Math.random() * 0.6),
        background: color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        transform: `rotate(${rotation}deg)`,
        animation: `confettiFall 1.8s ${delay}s ease-out forwards`,
        opacity: 0, pointerEvents: 'none',
      }} />
    );
  });
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}>{particles}</div>;
}

// ═══════════════════════════════════════════════
// BUTTON COMPONENT
// ═══════════════════════════════════════════════
function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style: extraStyle, ...props }) {
  const [pressed, setPressed] = useState(false);

  const variants = {
    primary: { bg: COLORS.coral[400], bgHover: COLORS.coral[500], shadow: COLORS.coral[600], color: '#fff' },
    secondary: { bg: COLORS.forest[400], bgHover: COLORS.forest[500], shadow: COLORS.forest[600], color: '#fff' },
    ghost: { bg: 'transparent', bgHover: COLORS.bark[100], shadow: COLORS.bark[200], color: COLORS.bark[600], border: `2.5px solid ${COLORS.bark[200]}` },
    danger: { bg: '#E84545', bgHover: '#D03A3A', shadow: '#C03030', color: '#fff' },
    gold: { bg: COLORS.sundrop[400], bgHover: COLORS.sundrop[500], shadow: COLORS.sundrop[600], color: COLORS.bark[800] },
  };
  const v = variants[variant];
  const sizes = { sm: { px: 16, py: 10, fs: 13 }, md: { px: 28, py: 14, fs: 15 }, lg: { px: 36, py: 18, fs: 17 } };
  const s = sizes[size];

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? COLORS.bark[200] : v.bg,
        color: disabled ? COLORS.bark[400] : v.color,
        border: v.border || 'none',
        borderRadius: 16,
        padding: `${s.py}px ${s.px}px`,
        fontSize: s.fs,
        fontWeight: 800,
        fontFamily: "'Nunito', sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: pressed ? `0 1px 0 ${v.shadow}` : `0 4px 0 ${disabled ? COLORS.bark[300] : v.shadow}`,
        transform: pressed ? 'translateY(3px)' : 'translateY(0)',
        transition: 'transform 80ms, box-shadow 80ms, background 150ms',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        lineHeight: 1.2, letterSpacing: '0.01em',
        ...extraStyle,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════
function ProgressBar({ value, max }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ background: COLORS.bark[150], borderRadius: 100, height: 10, overflow: 'hidden', flex: 1 }}>
      <div style={{
        background: `linear-gradient(90deg, ${COLORS.coral[400]}, ${COLORS.sundrop[400]})`,
        borderRadius: 100, height: '100%',
        width: `${pct}%`,
        transition: 'width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// SUNDROP COUNTER
// ═══════════════════════════════════════════════
function SunDropCounter({ count, animate }) {
  const [flash, setFlash] = useState(null);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) setFlash('up');
    else if (count < prevCount.current) setFlash('down');
    prevCount.current = count;
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: flash === 'up' ? COLORS.sundrop[100] : flash === 'down' ? '#FFF0F0' : COLORS.bark[100],
      borderRadius: 100, padding: '6px 14px',
      transition: 'background 200ms',
      animation: flash ? 'popBounce 400ms ease-out' : undefined,
    }}>
      <span style={{ fontSize: 18 }}>☀️</span>
      <span style={{
        fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15,
        color: flash === 'down' ? '#E84545' : COLORS.bark[700],
        transition: 'color 200ms',
      }}>{count}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// NPC AVATAR (simplified SVG — replaces the old nightmare avatars)
// ═══════════════════════════════════════════════
function NPCAvatar({ seed = 0, size = 80, speaking = false, isBoss = false }) {
  const skins = ['#F5D0A9', '#E8B88A', '#C68C53', '#8D5E3C', '#D4A574', '#F0C8A0'];
  const hairs = [COLORS.bark[700], '#8B4513', '#DAA520', '#2F1B14', '#B8860B', COLORS.coral[600]];
  const shirts = [COLORS.coral[400], COLORS.forest[400], COLORS.sky[400], COLORS.storm[400], COLORS.sundrop[500], COLORS.bloom[400]];
  const skin = skins[seed % skins.length];
  const hair = hairs[(seed + 2) % hairs.length];
  const shirt = shirts[(seed + 1) % shirts.length];
  const bossGlow = isBoss ? COLORS.storm[400] : 'none';
  const s = size;

  return (
    <svg width={s} height={s} viewBox="0 0 80 80" style={{
      filter: isBoss ? `drop-shadow(0 0 8px ${COLORS.storm[400]})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
    }}>
      {/* Body */}
      <ellipse cx="40" cy="68" rx="18" ry="12" fill={shirt} />
      {/* Neck */}
      <rect x="35" y="50" width="10" height="8" rx="3" fill={skin} />
      {/* Head */}
      <ellipse cx="40" cy="36" rx="18" ry="20" fill={skin} />
      {/* Hair */}
      <ellipse cx="40" cy="24" rx="19" ry="14" fill={hair} />
      <ellipse cx="24" cy="32" rx="5" ry="8" fill={hair} />
      <ellipse cx="56" cy="32" rx="5" ry="8" fill={hair} />
      {/* Eyes */}
      <ellipse cx="33" cy="38" rx="3.5" ry="4" fill="white" />
      <ellipse cx="47" cy="38" rx="3.5" ry="4" fill="white" />
      <circle cx="34" cy="38.5" r="2.2" fill={COLORS.bark[800]} />
      <circle cx="48" cy="38.5" r="2.2" fill={COLORS.bark[800]} />
      <circle cx="34.8" cy="37.5" r="0.8" fill="white" />
      <circle cx="48.8" cy="37.5" r="0.8" fill="white" />
      {/* Mouth */}
      {speaking ? (
        <ellipse cx="40" cy="48" rx="4" ry={3 + Math.sin(Date.now() / 150) * 1.5} fill="#E88" style={{
          animation: 'mouthMove 300ms ease-in-out infinite alternate',
        }} />
      ) : (
        <path d="M 35 47 Q 40 52 45 47" stroke={COLORS.bark[600]} strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {/* Blush */}
      <ellipse cx="27" cy="44" rx="4" ry="2.5" fill={COLORS.bloom[300]} opacity="0.4" />
      <ellipse cx="53" cy="44" rx="4" ry="2.5" fill={COLORS.bloom[300]} opacity="0.4" />
      {/* Boss crown */}
      {isBoss && (
        <g transform="translate(28, 6)">
          <polygon points="12,0 15,8 24,8 17,13 19,22 12,17 5,22 7,13 0,8 9,8" fill={COLORS.sundrop[400]} stroke={COLORS.sundrop[600]} strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════
// LESSON PATH VIEW
// ═══════════════════════════════════════════════
function LessonPathView({ onStartLesson }) {
  const lessons = [
    { title: 'Saying Your Name', icon: '🏷️', status: 'complete', stars: 3 },
    { title: 'How Old Are You?', icon: '🎂', status: 'complete', stars: 2 },
    { title: 'Where Are You From?', icon: '🌍', status: 'current', stars: 0 },
    { title: 'Putting It Together', icon: '🎯', status: 'locked', stars: 0 },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.bark[50]} 0%, ${COLORS.coral[50]} 100%)`,
      fontFamily: "'Nunito', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(253,252,250,0.9)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${COLORS.bark[150]}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button style={{
          background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
          color: COLORS.bark[500], padding: 4,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: COLORS.bark[700] }}>👋 Introduce Yourself</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: COLORS.bark[400] }}>German · Beginner</div>
        </div>
        <SunDropCounter count={42} />
      </div>

      {/* Tree Status Card */}
      <div style={{
        margin: '20px 20px 0', padding: 20, background: 'white',
        borderRadius: 20, border: `2.5px solid ${COLORS.bark[150]}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.forest[100]}, ${COLORS.forest[50]})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>🌸</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: COLORS.bark[700], marginBottom: 4 }}>Cherry Blossom Tree</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.forest[500] }}>❤️ 85%</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.bark[400] }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.sundrop[600] }}>Stage 4</span>
            </div>
            <ProgressBar value={2} max={4} />
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.bark[400], marginTop: 4 }}>2 of 4 lessons complete</div>
          </div>
        </div>
      </div>

      {/* Lesson Trail */}
      <div style={{ padding: '32px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {lessons.map((lesson, i) => {
          const isComplete = lesson.status === 'complete';
          const isCurrent = lesson.status === 'current';
          const isLocked = lesson.status === 'locked';

          const nodeColor = isComplete ? COLORS.forest[400]
            : isCurrent ? COLORS.coral[400]
            : COLORS.bark[200];
          const nodeBorder = isComplete ? COLORS.forest[500]
            : isCurrent ? COLORS.coral[500]
            : COLORS.bark[300];

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{
                  width: 3, height: 32,
                  background: i <= 2 ? `linear-gradient(${COLORS.forest[300]}, ${i === 2 ? COLORS.coral[300] : COLORS.forest[300]})` : COLORS.bark[200],
                  borderRadius: 100,
                  marginBottom: 0,
                }} />
              )}

              {/* Lesson Node */}
              <button
                onClick={() => isCurrent && onStartLesson()}
                disabled={isLocked}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  background: isCurrent ? 'white' : isComplete ? COLORS.forest[50] : COLORS.bark[100],
                  border: `2.5px solid ${isCurrent ? COLORS.coral[300] : isComplete ? COLORS.forest[200] : COLORS.bark[150]}`,
                  borderRadius: 20,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  boxShadow: isCurrent ? `0 4px 16px rgba(242,102,61,0.15)` : '0 2px 4px rgba(0,0,0,0.02)',
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'transform 150ms, box-shadow 150ms',
                  animation: isCurrent ? 'softPulse 2s ease-in-out infinite' : undefined,
                  fontFamily: "'Nunito', sans-serif",
                  textAlign: 'left',
                }}
              >
                {/* Node circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: nodeColor, border: `3px solid ${nodeBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isComplete ? 20 : 22, color: 'white', fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: isCurrent ? `0 0 0 4px rgba(255,138,106,0.2)` : 'none',
                }}>
                  {isComplete ? '✓' : isLocked ? '🔒' : lesson.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 15,
                    color: isLocked ? COLORS.bark[400] : COLORS.bark[700],
                    marginBottom: 2,
                  }}>{lesson.title}</div>
                  {isComplete && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3].map(s => (
                        <span key={s} style={{ fontSize: 14, opacity: s <= lesson.stars ? 1 : 0.2 }}>⭐</span>
                      ))}
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.coral[500] }}>Tap to start →</div>
                  )}
                  {isLocked && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.bark[400] }}>Complete previous lesson</div>
                  )}
                </div>

                {isCurrent && (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: COLORS.coral[400], display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 16, flexShrink: 0,
                  }}>▶</div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// "WHAT YOU'LL LEARN" SCREEN
// ═══════════════════════════════════════════════
function WhatYoullLearnScreen({ onStart }) {
  const chunks = [
    { target: 'Ich komme aus Frankreich', native: "I come from France", variable: 'Frankreich' },
    { target: 'Ich komme aus Deutschland', native: "I come from Germany", variable: 'Deutschland' },
    { target: 'Ich komme aus England', native: "I come from England", variable: 'England' },
  ];

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Nunito', sans-serif",
      background: `linear-gradient(180deg, ${COLORS.sky[50]} 0%, ${COLORS.bark[50]} 100%)`,
      display: 'flex', flexDirection: 'column', padding: 20,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        {/* NPC */}
        <NPCAvatar seed={3} size={100} />
        <div style={{ height: 16 }} />

        <div style={{ fontWeight: 900, fontSize: 24, color: COLORS.bark[700], textAlign: 'center', marginBottom: 8 }}>
          What You'll Learn
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.bark[400], textAlign: 'center', marginBottom: 24 }}>
          Where Are You From? 🌍
        </div>

        {/* Core Frame Card */}
        <div style={{
          width: '100%', padding: 24, background: 'white',
          borderRadius: 20, border: `2.5px solid ${COLORS.sky[300]}`,
          boxShadow: `0 4px 16px rgba(43,150,224,0.08)`,
          textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.sky[500], textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Core Pattern
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.bark[800], marginBottom: 6 }}>
            Ich komme aus <span style={{ color: COLORS.coral[400], background: COLORS.coral[50], padding: '2px 8px', borderRadius: 8 }}>___</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.bark[400] }}>
            I come from ___
          </div>
        </div>

        {/* Variations */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chunks.map((chunk, i) => (
            <div key={i} style={{
              padding: '14px 18px', background: 'white',
              borderRadius: 16, border: `2px solid ${COLORS.bark[150]}`,
              display: 'flex', alignItems: 'center', gap: 12,
              animation: `slideInUp 400ms ${200 + i * 100}ms ease-out both`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: COLORS.coral[50], color: COLORS.coral[500],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.bark[800] }}>
                  {chunk.target.split(chunk.variable).map((part, j) => (
                    <span key={j}>
                      {part}
                      {j === 0 && <span style={{ color: COLORS.coral[500], background: COLORS.coral[50], padding: '1px 6px', borderRadius: 6 }}>{chunk.variable}</span>}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.bark[400], marginTop: 2 }}>{chunk.native}</div>
              </div>
              <span style={{ fontSize: 20 }}>🔊</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 0', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <Button variant="primary" onClick={onStart} style={{ width: '100%', fontSize: 17, padding: '16px 28px' }}>
          Start Lesson 🚀
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ACTIVITY: INFO (Introduce)
// ═══════════════════════════════════════════════
function InfoActivity({ chunk, onComplete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
      <NPCAvatar seed={3} size={90} speaking={false} />
      <div style={{
        padding: '14px 20px', background: COLORS.bark[100], borderRadius: 16,
        maxWidth: 300, fontSize: 14, fontWeight: 600, color: COLORS.bark[600],
        position: 'relative', textAlign: 'center', lineHeight: 1.5,
      }}>
        {chunk.explanation}
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
          borderBottom: `8px solid ${COLORS.bark[100]}`,
        }} />
      </div>

      <div style={{
        padding: 28, background: 'white', borderRadius: 20,
        border: `2.5px solid ${COLORS.sky[300]}`, width: '100%',
        textAlign: 'center', boxShadow: `0 4px 16px rgba(43,150,224,0.08)`,
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.bark[800], marginBottom: 8, letterSpacing: '0.01em' }}>
          {chunk.target}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.bark[400] }}>
          {chunk.native}
        </div>
        <button style={{
          marginTop: 16, background: COLORS.sky[50], border: `2px solid ${COLORS.sky[300]}`,
          borderRadius: 100, padding: '8px 20px', cursor: 'pointer',
          fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.sky[500],
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          🔊 Listen
        </button>
      </div>

      <Button variant="primary" onClick={onComplete} style={{ width: '100%' }}>
        Got it! 👍
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ACTIVITY: MULTIPLE CHOICE
// ═══════════════════════════════════════════════
function MultipleChoiceActivity({ question, options, correctIndex, sunDrops, onComplete, onWrong }) {
  const [selected, setSelected] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handlePick = (i) => {
    if (resolved) return;
    setSelected(i);
    if (i === correctIndex) {
      setResolved(true);
      const earned = attempts > 0 ? Math.ceil(sunDrops / 2) : sunDrops;
      setTimeout(() => onComplete(true, Math.max(0, earned - attempts)), 900);
    } else {
      setAttempts(a => a + 1);
      onWrong();
      setTimeout(() => setSelected(null), 600);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        fontSize: 18, fontWeight: 800, color: COLORS.bark[700],
        marginBottom: 20, lineHeight: 1.4, textAlign: 'center',
      }}>{question}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === correctIndex;
          let bg = 'white', border = COLORS.bark[200], color = COLORS.bark[700], shadow = COLORS.bark[200];

          if (isSelected && resolved && isCorrect) {
            bg = COLORS.forest[100]; border = COLORS.forest[400]; color = COLORS.forest[700]; shadow = COLORS.forest[500];
          } else if (isSelected && !resolved) {
            bg = '#FFF0F0'; border = '#E84545'; color = '#E84545'; shadow = '#D03A3A';
          }

          return (
            <button key={i} onClick={() => handlePick(i)} style={{
              background: bg, border: `2.5px solid ${border}`, borderRadius: 16,
              padding: '14px 12px', fontFamily: "'Nunito', sans-serif", fontWeight: 700,
              fontSize: 14, color, cursor: resolved ? 'default' : 'pointer',
              boxShadow: `0 3px 0 ${shadow}`,
              transition: 'all 150ms',
              animation: isSelected && !resolved ? 'shake 400ms ease-out' : undefined,
              lineHeight: 1.3,
            }}>
              {resolved && isCorrect && '✅ '}{isSelected && !resolved && '❌ '}{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ACTIVITY: FILL IN THE BLANK
// ═══════════════════════════════════════════════
function FillBlankActivity({ sentence, correctAnswer, hint, sunDrops, onComplete, onWrong }) {
  const [input, setInput] = useState('');
  const [state, setState] = useState('active');
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const check = () => {
    if (!input.trim()) return;
    if (input.trim().toLowerCase() === correctAnswer.toLowerCase()) {
      setState('correct');
      const earned = attempts > 0 ? Math.ceil(sunDrops / 2) : sunDrops;
      setTimeout(() => onComplete(true, Math.max(0, earned - attempts)), 900);
    } else {
      setState('wrong');
      setAttempts(a => a + 1);
      onWrong();
      setTimeout(() => { setState('active'); setInput(''); inputRef.current?.focus(); }, 800);
    }
  };

  const parts = sentence.split('___');

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: COLORS.sky[500], textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center',
      }}>Complete the sentence</div>

      <div style={{
        padding: 24, background: 'white', borderRadius: 20,
        border: `2.5px solid ${COLORS.bark[150]}`, textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.bark[800], lineHeight: 1.6 }}>
          {parts[0]}
          <span style={{
            display: 'inline-block', minWidth: 120,
            borderBottom: `3px dashed ${state === 'correct' ? COLORS.forest[400] : state === 'wrong' ? '#E84545' : COLORS.coral[400]}`,
            padding: '2px 8px', margin: '0 4px',
            background: state === 'correct' ? COLORS.forest[50] : state === 'wrong' ? '#FFF0F0' : COLORS.coral[50],
            borderRadius: 8, color: state === 'correct' ? COLORS.forest[600] : state === 'wrong' ? '#E84545' : COLORS.coral[600],
            transition: 'all 200ms',
          }}>
            {state === 'correct' ? correctAnswer : state === 'wrong' ? input : (input || '???')}
          </span>
          {parts[1]}
        </div>
      </div>

      {state === 'active' && (
        <>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="Type your answer..."
            style={{
              width: '100%', padding: '14px 18px', fontSize: 16, fontWeight: 600,
              fontFamily: "'Nunito', sans-serif", color: COLORS.bark[700],
              background: 'white', border: `2.5px solid ${COLORS.bark[200]}`,
              borderRadius: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = COLORS.coral[400]}
            onBlur={e => e.target.style.borderColor = COLORS.bark[200]}
          />
          {hint && <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.bark[400], marginBottom: 12, textAlign: 'center' }}>💡 Hint: {hint}</div>}
          <Button variant="primary" onClick={check} disabled={!input.trim()} style={{ width: '100%' }}>
            Check ✓
          </Button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// LESSON COMPLETION SCREEN
// ═══════════════════════════════════════════════
function LessonCompleteScreen({ sunDropsEarned, sunDropsMax, onContinue }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [countUp, setCountUp] = useState(0);
  const ratio = sunDropsEarned / sunDropsMax;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;

  useEffect(() => {
    setShowConfetti(true);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setCountUp(Math.min(i, sunDropsEarned));
      if (i >= sunDropsEarned) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [sunDropsEarned]);

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Nunito', sans-serif",
      background: `linear-gradient(180deg, ${COLORS.sundrop[50]} 0%, ${COLORS.coral[50]} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <Confetti active={showConfetti} />

      <div style={{ fontSize: 48, marginBottom: 8, animation: 'popBounce 600ms ease-out' }}>🌸</div>
      <div style={{
        fontWeight: 900, fontSize: 28, color: COLORS.bark[800],
        marginBottom: 8, textAlign: 'center',
        animation: 'slideInUp 500ms 200ms ease-out both',
      }}>Lesson Complete!</div>
      <div style={{
        fontWeight: 600, fontSize: 15, color: COLORS.bark[400], marginBottom: 24,
        animation: 'slideInUp 500ms 300ms ease-out both',
      }}>Your tree is growing stronger! 🌱</div>

      {/* Stars */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 32,
        animation: 'slideInUp 500ms 400ms ease-out both',
      }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            fontSize: 40,
            opacity: s <= stars ? 1 : 0.15,
            animation: s <= stars ? `starBounce 500ms ${400 + s * 150}ms ease-out both` : undefined,
            filter: s <= stars ? 'none' : 'grayscale(1)',
          }}>⭐</div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 320,
        border: `2.5px solid ${COLORS.bark[150]}`, boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        animation: 'slideInUp 500ms 500ms ease-out both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.bark[500] }}>SunDrops earned</span>
          <span style={{ fontWeight: 900, fontSize: 24, color: COLORS.sundrop[600] }}>☀️ {countUp}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.bark[500] }}>Accuracy</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: COLORS.forest[500] }}>{Math.round(ratio * 100)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.bark[500] }}>Streak</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: COLORS.coral[500] }}>🔥 7 days</span>
        </div>
      </div>

      {/* Gift earned */}
      <div style={{
        marginTop: 20, padding: '14px 24px', background: COLORS.sundrop[100],
        borderRadius: 16, border: `2px solid ${COLORS.sundrop[300]}`,
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'slideInUp 600ms 700ms ease-out both',
      }}>
        <span style={{ fontSize: 24 }}>🎁</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.sundrop[700] }}>You earned a gift!</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: COLORS.sundrop[600] }}>💧 Water Drop — send to a friend</div>
        </div>
      </div>

      <div style={{ marginTop: 32, width: '100%', maxWidth: 320, animation: 'slideInUp 500ms 800ms ease-out both' }}>
        <Button variant="primary" onClick={onContinue} style={{ width: '100%', fontSize: 17, padding: '16px 28px' }}>
          Continue 🌸
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LESSON VIEW (orchestrates all activities)
// ═══════════════════════════════════════════════
function LessonView({ onComplete, onBack }) {
  const chunk = {
    target: 'Ich komme aus Frankreich',
    native: 'I come from France',
    variable: 'Frankreich',
    explanation: "In German, to say where you're from, you say 'Ich komme aus' and then your country. 'Komme' means 'come' and 'aus' means 'from'. Easy!",
    distractors: ['I like football', 'Good morning', 'My name is Max'],
    correctContext: 'When someone asks where you live',
    wrongContexts: ['When ordering food', 'When saying goodbye', 'When asking the time'],
  };

  const steps = [
    { type: 'info', sunDrops: 0 },
    { type: 'mc-recognize', sunDrops: 1 },
    { type: 'fill-blank', sunDrops: 2 },
    { type: 'mc-apply', sunDrops: 2 },
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [sunDrops, setSunDrops] = useState(0);
  const [flash, setFlash] = useState(null);
  const totalSunDrops = steps.reduce((s, st) => s + st.sunDrops, 0);

  const handleComplete = (correct, earned) => {
    if (earned > 0) setSunDrops(s => s + earned);
    setTimeout(() => {
      if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
      else onComplete(sunDrops + (earned || 0), totalSunDrops);
    }, 300);
  };

  const handleWrong = () => {
    setSunDrops(s => Math.max(0, s - 1));
    setFlash('wrong');
    setTimeout(() => setFlash(null), 500);
  };

  const step = steps[stepIndex];

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Nunito', sans-serif",
      background: COLORS.bark[50],
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Wrong answer flash */}
      {flash === 'wrong' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(232,69,69,0.1)',
          pointerEvents: 'none', zIndex: 40,
          animation: 'flashFade 500ms ease-out forwards',
        }} />
      )}

      {/* Header */}
      <div style={{
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(253,252,250,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${COLORS.bark[150]}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
          color: COLORS.bark[500], padding: 4,
        }}>✕</button>
        <ProgressBar value={stepIndex + 1} max={steps.length} />
        <SunDropCounter count={sunDrops} animate />
      </div>

      {/* Help Button */}
      <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{
          background: COLORS.sky[50], border: `2px solid ${COLORS.sky[300]}`,
          borderRadius: 100, padding: '6px 14px', cursor: 'pointer',
          fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.sky[500],
          display: 'flex', alignItems: 'center', gap: 4,
        }}>💡 Help</button>
      </div>

      {/* Activity Area */}
      <div style={{ flex: 1, padding: '8px 20px 20px', maxWidth: 440, margin: '0 auto', width: '100%' }}>
        {step.type === 'info' && (
          <InfoActivity chunk={chunk} onComplete={() => handleComplete(true, 0)} />
        )}
        {step.type === 'mc-recognize' && (
          <MultipleChoiceActivity
            question={`What does "${chunk.target}" mean?`}
            options={[chunk.native, ...chunk.distractors.slice(0, 3)]}
            correctIndex={0}
            sunDrops={step.sunDrops}
            onComplete={handleComplete}
            onWrong={handleWrong}
          />
        )}
        {step.type === 'fill-blank' && (
          <FillBlankActivity
            sentence="Ich komme aus ___"
            correctAnswer="Frankreich"
            hint="The German word for France"
            sunDrops={step.sunDrops}
            onComplete={handleComplete}
            onWrong={handleWrong}
          />
        )}
        {step.type === 'mc-apply' && (
          <MultipleChoiceActivity
            question={`When would you say "${chunk.target}"?`}
            options={[chunk.correctContext, ...chunk.wrongContexts.slice(0, 3)]}
            correctIndex={0}
            sunDrops={step.sunDrops}
            onComplete={handleComplete}
            onWrong={handleWrong}
          />
        )}
      </div>

      {/* Step counter */}
      <div style={{
        textAlign: 'center', padding: '8px 0 20px',
        fontSize: 12, fontWeight: 700, color: COLORS.bark[300],
      }}>
        Step {stepIndex + 1} of {steps.length}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP — SCREEN ROUTER
// ═══════════════════════════════════════════════
export default function LingoFriendsV2Mockup() {
  const [screen, setScreen] = useState('path');
  const [lessonResult, setLessonResult] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }

        @keyframes popBounce {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes softPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(242,102,61,0.15); }
          50% { box-shadow: 0 4px 24px rgba(242,102,61,0.25); }
        }

        @keyframes starBounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-600px) translateX(var(--drift, 30px)) rotate(720deg); opacity: 0; }
        }

        @keyframes flashFade {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes mouthMove {
          0% { ry: 2; }
          100% { ry: 4; }
        }
      `}</style>

      <div style={{
        maxWidth: 420, margin: '0 auto',
        minHeight: '100vh',
        boxShadow: '0 0 40px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {screen === 'path' && (
          <LessonPathView onStartLesson={() => setScreen('learn')} />
        )}
        {screen === 'learn' && (
          <WhatYoullLearnScreen onStart={() => setScreen('lesson')} />
        )}
        {screen === 'lesson' && (
          <LessonView
            onComplete={(earned, max) => {
              setLessonResult({ earned, max });
              setScreen('complete');
            }}
            onBack={() => setScreen('path')}
          />
        )}
        {screen === 'complete' && lessonResult && (
          <LessonCompleteScreen
            sunDropsEarned={lessonResult.earned}
            sunDropsMax={lessonResult.max}
            onContinue={() => { setScreen('path'); setLessonResult(null); }}
          />
        )}
      </div>
    </>
  );
}
