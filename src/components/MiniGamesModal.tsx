"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameTab = "rps" | "mem" | "word" | "num";
type RPSChoice = "rock" | "paper" | "scissors";

const TREAT_COST = 3;

const RPS_EMOJI: Record<RPSChoice, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
const RPS_BEATS: Record<RPSChoice, RPSChoice> = { rock: "scissors", paper: "rock", scissors: "paper" };
const RPS_CHOICES: RPSChoice[] = ["rock", "paper", "scissors"];

const MEM_ICONS = ["⭐", "🎯", "💎", "🔮", "🎸", "🌈"];

const WS_WORDS = [
  { word: "STUDY",    hint: "What you do to prepare for exams" },
  { word: "TUTOR",    hint: "Someone who teaches one-on-one" },
  { word: "FOCUS",    hint: "Concentrate your attention" },
  { word: "GRADE",    hint: "Score on an assignment" },
  { word: "LEARN",    hint: "Gain knowledge or skill" },
  { word: "NOTES",    hint: "Written reminders from a lecture" },
  { word: "STREAK",   hint: "Consecutive days of activity" },
  { word: "REWARD",   hint: "Something given for achievement" },
  { word: "BADGE",    hint: "An earned digital achievement" },
  { word: "TOPIC",    hint: "Subject being studied" },
  { word: "CHAPTER",  hint: "A section of a textbook" },
  { word: "PRACTISE", hint: "Repeat to improve a skill" },
  { word: "SCHEDULE", hint: "A plan for when to study" },
  { word: "QUIZ",     hint: "A short informal test" },
  { word: "EXAM",     hint: "A test of your knowledge" },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* ─── shared sub-components ─────────────────── */
function TabBar({ active, onSwitch, accentHex }: { active: GameTab; onSwitch: (t: GameTab) => void; accentHex: string }) {
  const tabs: { id: GameTab; label: string }[] = [
    { id: "rps",  label: "RPS"      },
    { id: "mem",  label: "Memory"   },
    { id: "word", label: "Scramble" },
    { id: "num",  label: "Guess"    },
  ];
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--c-surface2)", borderRadius: 13, padding: 4, marginBottom: 16 }}>
      {tabs.map(({ id, label }) => (
        <button key={id} onClick={() => onSwitch(id)}
          style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 9, fontSize: 11, fontWeight: active === id ? 700 : 500, cursor: "pointer", transition: "all .18s", background: active === id ? accentHex : "transparent", color: active === id ? "#fff" : "var(--c-text3)", boxShadow: active === id ? `0 2px 10px ${accentHex}44` : "none", fontFamily: "var(--font-body)" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CostBadge({ accentHex, text }: { accentHex: string; text: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30`, marginBottom: 14 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /></svg>
      {text}
    </div>
  );
}

function RewardBanner({ xp, sub, won }: { xp: number; sub: string; won: boolean }) {
  return (
    <div style={{ background: won ? "rgba(0,168,107,.10)" : "rgba(226,75,74,.06)", border: `1px solid ${won ? "rgba(0,168,107,.25)" : "rgba(226,75,74,.2)"}`, borderRadius: 14, padding: "13px 16px", textAlign: "center", marginBottom: 12, animation: "sp-pop .4s ease both" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: won ? "var(--c-green)" : "var(--c-red)", marginBottom: 4 }}>+{xp} XP earned!</div>
      <div style={{ fontSize: 12, color: "var(--c-text2)" }}>{sub}</div>
    </div>
  );
}

function PlayBtn({ canPlay, label, accentHex, onClick }: { canPlay: boolean; label: string; accentHex: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={!canPlay}
      style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, cursor: canPlay ? "pointer" : "not-allowed", background: canPlay ? `linear-gradient(135deg,${accentHex},${accentHex}CC)` : "var(--c-surface2)", color: canPlay ? "#fff" : "var(--c-text3)", fontFamily: "var(--font-body)", opacity: canPlay ? 1 : 0.5, boxShadow: canPlay ? `0 4px 16px ${accentHex}40` : "none", transition: "all .18s" }}>
      {canPlay ? label : "Need 3+ treats to play"}
    </button>
  );
}

/* ══════════════════════════════════════════════
   GAME 1 — Rock Paper Scissors
══════════════════════════════════════════════ */
function RPSGame({ accentHex, canPlay, onReward }: { accentHex: string; canPlay: boolean; onReward: (delta: number) => void }) {
  const [youScore, setYouScore]     = useState(0);
  const [cpuScore, setCpuScore]     = useState(0);
  const [round, setRound]           = useState(1);
  const [playerPick, setPlayerPick] = useState<RPSChoice | null>(null);
  const [cpuPick, setCpuPick]       = useState<RPSChoice | null>(null);
  const [roundMsg, setRoundMsg]     = useState<{ text: string; type: "win"|"lose"|"draw" } | null>(null);
  const [done, setDone]     = useState(false);
  const [reward, setReward] = useState<{ xp: number; won: boolean } | null>(null);
  const [started, setStarted] = useState(false);

  function startGame() { if (!canPlay) return; onReward(-TREAT_COST); setStarted(true); }

  function play(choice: RPSChoice) {
    if (done || !started) return;
    const cpu = RPS_CHOICES[Math.floor(Math.random() * 3)];
    setPlayerPick(choice); setCpuPick(cpu);
    let type: "win"|"lose"|"draw";
    let newYou = youScore, newCpu = cpuScore;
    if (choice === cpu)              { type = "draw"; }
    else if (RPS_BEATS[choice]===cpu){ type = "win"; newYou++; setYouScore(newYou); }
    else                             { type = "lose"; newCpu++; setCpuScore(newCpu); }
    setRoundMsg({ text: { win: "You win this round!", lose: "CPU wins!", draw: "Draw!" }[type], type });
    const nextRound = round + 1; setRound(nextRound);
    if (nextRound > 3) {
      setDone(true);
      const xp = newYou > newCpu ? 8 : newYou === newCpu ? 3 : 1;
      setReward({ xp, won: newYou >= newCpu });
      onReward(xp);
    }
  }

  function reset() {
    setYouScore(0); setCpuScore(0); setRound(1);
    setPlayerPick(null); setCpuPick(null);
    setRoundMsg(null); setDone(false); setReward(null); setStarted(false);
  }

  const btnStyle = (c: RPSChoice): React.CSSProperties => ({
    width: 78, height: 78, borderRadius: 18,
    borderWidth: "1.5px", borderStyle: "solid",
    borderColor: playerPick === c ? accentHex : "var(--c-border)",
    background: playerPick === c ? `${accentHex}10` : "var(--c-surface)",
    cursor: "pointer", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 4,
    fontSize: 11, fontWeight: 600,
    color: playerPick === c ? accentHex : "var(--c-text2)",
    transition: "all .18s", fontFamily: "var(--font-body)",
  });

  if (!started) return (
    <div>
      <CostBadge accentHex={accentHex} text={`Costs ${TREAT_COST} treats · Win +8 XP · Draw +3 · Loss +1`} />
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>✊✋✌️</div>
        <div style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 20, lineHeight: 1.5 }}>3 rounds, best of 3.<br />Beat the CPU to earn +8 XP.</div>
        <PlayBtn canPlay={canPlay} label={`Play (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />
      </div>
    </div>
  );

  return (
    <div>
      <CostBadge accentHex={accentHex} text="Win +8 XP · Draw +3 · Loss +1" />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
        {[{ label: `You  ${youScore}`, hi: true }, { label: `CPU  ${cpuScore}`, hi: false }, { label: done ? "Done!" : `Round ${round}/3`, hi: false }].map(({ label, hi }) => (
          <div key={label} style={{ padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: hi ? `${accentHex}15` : "var(--c-surface2)", color: hi ? accentHex : "var(--c-text2)", border: `1px solid ${hi ? accentHex+"30" : "var(--c-border)"}` }}>{label}</div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
        {([{ pick: playerPick, label: "You", color: accentHex }, null, { pick: cpuPick, label: "CPU", color: "var(--c-red)" }] as const).map((slot, i) =>
          slot === null
            ? <span key="vs" style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text3)" }}>VS</span>
            : <div key={slot.label} style={{ width: 76, height: 76, borderRadius: 18, borderWidth: "1.5px", borderStyle: "solid", borderColor: slot.pick ? slot.color+"50" : "var(--c-border)", background: slot.pick ? `${slot.color}08` : "var(--c-surface2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                {slot.pick ? <><span style={{ fontSize: 28 }}>{RPS_EMOJI[slot.pick]}</span><span style={{ fontSize: 10, fontWeight: 600, color: slot.color }}>{slot.pick}</span></> : <span style={{ fontSize: 12, color: "var(--c-text3)" }}>{slot.label}</span>}
              </div>
        )}
      </div>
      {roundMsg && (
        <div style={{ textAlign: "center", padding: "9px 14px", borderRadius: 11, fontSize: 13, fontWeight: 600, marginBottom: 12, background: roundMsg.type==="win" ? "rgba(0,168,107,.10)" : roundMsg.type==="lose" ? "rgba(226,75,74,.08)" : "var(--c-surface2)", color: roundMsg.type==="win" ? "var(--c-green)" : roundMsg.type==="lose" ? "var(--c-red)" : "var(--c-text2)", border: `1px solid ${roundMsg.type==="win" ? "rgba(0,168,107,.2)" : roundMsg.type==="lose" ? "rgba(226,75,74,.2)" : "var(--c-border)"}` }}>
          {roundMsg.text}
        </div>
      )}
      {reward && <RewardBanner xp={reward.xp} won={reward.won} sub={reward.xp>=8 ? "Your pet does zoomies!" : reward.xp>=3 ? "A draw — not bad!" : "CPU wins this time!"} />}
      {!done ? (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {RPS_CHOICES.map(c => (
            <button key={c} onClick={() => play(c)} style={btnStyle(c)}
              onMouseEnter={e => { const el=e.currentTarget; el.style.borderColor=accentHex; el.style.background=`${accentHex}08`; el.style.color=accentHex; el.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { const el=e.currentTarget; if (playerPick!==c) { el.style.borderColor="var(--c-border)"; el.style.background="var(--c-surface)"; el.style.color="var(--c-text2)"; } el.style.transform=""; }}>
              <span style={{ fontSize: 28 }}>{RPS_EMOJI[c]}</span>
              {c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          ))}
        </div>
      ) : (
        <PlayBtn canPlay={canPlay} label={`Play again (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={reset} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GAME 2 — Memory Match
══════════════════════════════════════════════ */
interface MemCard { id: number; icon: string; revealed: boolean; matched: boolean; }

function MemoryGame({ accentHex, canPlay, onReward }: { accentHex: string; canPlay: boolean; onReward: (delta: number) => void }) {
  const [cards, setCards]     = useState<MemCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState(0);
  const [moves, setMoves]     = useState(0);
  const [secs, setSecs]       = useState(60);
  const [active, setActive]   = useState(false);
  const [locked, setLocked]   = useState(false);
  const [done, setDone]       = useState(false);
  const [reward, setReward]   = useState<{ xp: number; won: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secsRef  = useRef(60);

  const endGame = useCallback((won: boolean) => {
    clearInterval(timerRef.current!);
    setActive(false); setDone(true);
    const xp = won ? 15 : 8;
    setReward({ xp, won });
    onReward(xp);
  }, [onReward]);

  function startGame() {
    if (!canPlay) return;
    onReward(-TREAT_COST);
    clearInterval(timerRef.current!);
    secsRef.current = 60;
    const pairs = shuffle([...MEM_ICONS, ...MEM_ICONS]);
    setCards(pairs.map((icon, i) => ({ id: i, icon, revealed: false, matched: false })));
    setFlipped([]); setMatched(0); setMoves(0); setSecs(60);
    setActive(true); setLocked(false); setDone(false); setReward(null);
    timerRef.current = setInterval(() => {
      secsRef.current--;
      setSecs(secsRef.current);
      if (secsRef.current <= 0) { clearInterval(timerRef.current!); endGame(false); }
    }, 1000);
  }

  function flip(idx: number) {
    if (!active || locked || cards[idx].revealed || cards[idx].matched) return;
    const newCards = [...cards];
    newCards[idx] = { ...newCards[idx], revealed: true };
    const newFlipped = [...flipped, idx];
    setCards(newCards); setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setLocked(true);
      const [a, b] = newFlipped;
      const nm = moves + 1; setMoves(nm);
      if (newCards[a].icon === newCards[b].icon) {
        setTimeout(() => {
          setCards(prev => { const u=[...prev]; u[a]={...u[a],matched:true,revealed:false}; u[b]={...u[b],matched:true,revealed:false}; return u; });
          const newMatched = matched + 1; setMatched(newMatched); setFlipped([]); setLocked(false);
          if (newMatched === MEM_ICONS.length) endGame(true);
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => { const u=[...prev]; u[a]={...u[a],revealed:false}; u[b]={...u[b],revealed:false}; return u; });
          setFlipped([]); setLocked(false);
        }, 700);
      }
    }
  }

  useEffect(() => () => clearInterval(timerRef.current!), []);

  if (!active && cards.length === 0) return (
    <div>
      <CostBadge accentHex={accentHex} text={`Costs ${TREAT_COST} treats · Under 60s = +15 XP`} />
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, maxWidth: 200, margin: "0 auto 16px", opacity: 0.5 }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ aspectRatio: "1", borderRadius: 10, background: `${accentHex}12`, border: `1.5px solid ${accentHex}22` }} />)}
        </div>
        <div style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 20, lineHeight: 1.5 }}>Match 6 pairs. Finish under 60s for bonus XP.</div>
        <PlayBtn canPlay={canPlay} label={`Start (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        {[{ label: `Moves: ${moves}`, warn: false }, { label: `${secs}s`, warn: secs<=10 }, { label: `Pairs: ${matched}/${MEM_ICONS.length}`, warn: false }].map(({ label, warn }) => (
          <div key={label} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: warn ? "rgba(226,75,74,.10)" : "var(--c-surface2)", color: warn ? "var(--c-red)" : "var(--c-text2)", border: `1px solid ${warn ? "rgba(226,75,74,.25)" : "var(--c-border)"}` }}>{label}</div>
        ))}
      </div>
      {reward && <RewardBanner xp={reward.xp} won={reward.won} sub={reward.won ? (reward.xp===15 ? "Speed bonus! 🎉" : "All matched!") : "Time's up — good try!"} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {cards.map((c, i) => (
          <div key={c.id} onClick={() => flip(i)}
            style={{ aspectRatio: "1", borderRadius: 12, border: `1.5px solid ${c.matched ? "rgba(0,168,107,.35)" : c.revealed ? `${accentHex}40` : "var(--c-border)"}`, background: c.matched ? "rgba(0,168,107,.10)" : c.revealed ? "var(--c-surface)" : `${accentHex}08`, cursor: !c.matched&&!c.revealed&&active&&!locked ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, transition: "all .2s", transform: c.revealed ? "scale(1.05)" : "scale(1)" }}>
            {(c.revealed||c.matched) ? c.icon : ""}
          </div>
        ))}
      </div>
      {done && <PlayBtn canPlay={canPlay} label={`Play again (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GAME 3 — Word Scramble
══════════════════════════════════════════════ */
function WordScramble({ accentHex, canPlay, onReward }: { accentHex: string; canPlay: boolean; onReward: (delta: number) => void }) {
  const [started, setStarted]     = useState(false);
  const [done, setDone]           = useState(false);
  const [word, setWord]           = useState("");
  const [hint, setHint]           = useState("");
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [answer, setAnswer]       = useState<(string|null)[]>([]);
  const [used, setUsed]           = useState<boolean[]>([]);
  const [tries, setTries]         = useState(0);
  const [shake, setShake]         = useState(false);
  const [correct, setCorrect]     = useState(false);
  const [reward, setReward]       = useState<{ xp: number; won: boolean } | null>(null);
  const MAX_TRIES = 5;

  function startGame() {
    if (!canPlay) return;
    onReward(-TREAT_COST);
    const w = WS_WORDS[Math.floor(Math.random() * WS_WORDS.length)];
    let sc = w.word.split("").sort(() => Math.random() - 0.5);
    let attempts = 0;
    while (sc.join("") === w.word && w.word.length > 1 && attempts++ < 20)
      sc = w.word.split("").sort(() => Math.random() - 0.5);
    setWord(w.word); setHint(w.hint);
    setScrambled(sc);
    setAnswer(Array(w.word.length).fill(null));
    setUsed(Array(w.word.length).fill(false));
    setTries(0); setStarted(true); setDone(false);
    setCorrect(false); setReward(null);
  }

  function pick(i: number) {
    if (done) return;
    const slot = answer.indexOf(null);
    if (slot === -1) return;
    const newAns = [...answer]; newAns[slot] = scrambled[i];
    const newUsed = [...used]; newUsed[i] = true;
    setAnswer(newAns); setUsed(newUsed);
    if (!newAns.includes(null)) checkAnswer(newAns, newUsed);
  }

  function remove(i: number) {
    if (done) return;
    const ch = answer[i]; if (!ch) return;
    const newAns = [...answer]; newAns[i] = null;
    const newUsed = [...used];
    const j = scrambled.findIndex((s, idx) => newUsed[idx] && s === ch);
    if (j !== -1) newUsed[j] = false;
    setAnswer(newAns); setUsed(newUsed);
  }

  function checkAnswer(ans: (string|null)[], _u: boolean[]) {
    if (ans.join("") === word) {
      setCorrect(true); setDone(true);
      const xp = tries < 2 ? 12 : 6;
      setReward({ xp, won: true });
      onReward(xp);
    } else {
      const newTries = tries + 1; setTries(newTries);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setAnswer(Array(word.length).fill(null));
        setUsed(Array(scrambled.length).fill(false));
      }, 400);
      if (newTries >= MAX_TRIES) {
        setDone(true);
        setReward({ xp: 4, won: false });
        onReward(4);
      }
    }
  }

  if (!started) return (
    <div>
      <CostBadge accentHex={accentHex} text={`Costs ${TREAT_COST} treats · ≤2 tries = +12 XP · finish = +6 XP`} />
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: "1.8rem", letterSpacing: 6, marginBottom: 12, color: accentHex }}>A B C ?</div>
        <div style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 20, lineHeight: 1.5 }}>Unscramble a study-themed word.<br />Fewer tries = more XP.</div>
        <PlayBtn canPlay={canPlay} label={`Start (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Hint */}
      <div style={{ fontSize: 12, color: "var(--c-text2)", textAlign: "center", marginBottom: 10, padding: "8px 12px", borderRadius: 9, background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
        💡 {hint}
      </div>

      {/* Hearts */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 10 }}>
        {Array.from({ length: MAX_TRIES }).map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: i < tries ? 0.3 : 1, transition: "opacity .3s" }}>{i < tries ? "🖤" : "❤️"}</span>
        ))}
      </div>

      {/* Answer slots */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 10, animation: shake ? "sp-wiggle .3s ease" : "none" }}>
        {answer.map((ch, i) => (
          <div key={i} onClick={() => remove(i)}
            style={{ width: 36, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, cursor: ch ? "pointer" : "default", transition: "all .2s", borderWidth: "1.5px", borderStyle: ch ? "solid" : "dashed", borderColor: correct ? "rgba(0,168,107,.5)" : ch ? accentHex : "var(--c-border)", background: correct ? "rgba(0,168,107,.10)" : ch ? `${accentHex}10` : "var(--c-surface2)", color: correct ? "var(--c-green)" : "var(--c-text)" }}>
            {ch || ""}
          </div>
        ))}
      </div>

      {/* Scrambled tiles */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
        {scrambled.map((ch, i) => (
          <div key={i} onClick={() => !used[i] && !done && pick(i)}
            style={{ width: 36, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, cursor: used[i] || done ? "default" : "pointer", transition: "all .18s", borderWidth: "1.5px", borderStyle: "solid", borderColor: used[i] ? "transparent" : "var(--c-border)", background: used[i] ? "transparent" : "var(--c-surface)", color: "var(--c-text)", opacity: used[i] ? 0.2 : 1 }}
            onMouseEnter={e => { if (!used[i] && !done) { const el=e.currentTarget; el.style.borderColor=accentHex; el.style.background=`${accentHex}10`; el.style.color=accentHex; el.style.transform="translateY(-2px)"; } }}
            onMouseLeave={e => { if (!used[i] && !done) { const el=e.currentTarget; el.style.borderColor="var(--c-border)"; el.style.background="var(--c-surface)"; el.style.color="var(--c-text)"; el.style.transform=""; } }}>
            {ch}
          </div>
        ))}
      </div>

      {reward && <RewardBanner xp={reward.xp} won={reward.won} sub={reward.won ? (tries===0 ? "First try! 🎉" : tries<2 ? "Lightning fast!" : "Well done!") : `The word was: ${word}`} />}
      {done && <PlayBtn canPlay={canPlay} label={`Play again (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GAME 4 — Number Guess
══════════════════════════════════════════════ */
interface NgEntry { val: number; type: "low"|"high"|"correct"; guessNum: number; }

function NumberGuess({ accentHex, canPlay, onReward }: { accentHex: string; canPlay: boolean; onReward: (delta: number) => void }) {
  const [started, setStarted] = useState(false);
  const [done, setDone]       = useState(false);
  const [secret, setSecret]   = useState(0);
  const [lo, setLo]           = useState(1);
  const [hi, setHi]           = useState(100);
  const [count, setCount]     = useState(0);
  const [input, setInput]     = useState("");
  const [history, setHistory] = useState<NgEntry[]>([]);
  const [reward, setReward]   = useState<{ xp: number } | null>(null);
  const [shake, setShake]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startGame() {
    if (!canPlay) return;
    onReward(-TREAT_COST);
    setSecret(Math.floor(Math.random() * 100) + 1);
    setLo(1); setHi(100); setCount(0); setInput("");
    setHistory([]); setDone(false); setReward(null); setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function guess() {
    const val = parseInt(input);
    if (!val || val < 1 || val > 100) {
      setShake(true); setTimeout(() => setShake(false), 400); return;
    }
    const newCount = count + 1; setCount(newCount); setInput("");
    let type: "low"|"high"|"correct";
    if      (val === secret) { type = "correct"; }
    else if (val < secret)   { type = "low";  setLo(Math.max(lo, val+1)); }
    else                     { type = "high"; setHi(Math.min(hi, val-1)); }
    setHistory(prev => [{ val, type, guessNum: newCount }, ...prev]);
    if (type === "correct") {
      setDone(true);
      const xp = newCount<=5 ? 12 : newCount<=10 ? 8 : 4;
      setReward({ xp });
      onReward(xp);
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const rangePct = ((hi - lo) / 99) * 100;

  if (!started) return (
    <div>
      <CostBadge accentHex={accentHex} text={`Costs ${TREAT_COST} treats · ≤5 guesses = +12 XP · ≤10 = +8 XP`} />
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: "2rem", letterSpacing: 8, marginBottom: 12, color: accentHex }}>? ? ?</div>
        <div style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 20, lineHeight: 1.5 }}>I'm thinking of a number between<br /><strong style={{ color: "var(--c-text)" }}>1 and 100</strong>. Can you guess it?</div>
        <PlayBtn canPlay={canPlay} label={`Play (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Range bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text2)", minWidth: 24, textAlign: "center" }}>{lo}</span>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${accentHex},${accentHex}99)`, width: `${rangePct}%`, transition: "width .4s ease" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text2)", minWidth: 24, textAlign: "center" }}>{hi}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--c-text3)", marginBottom: 12 }}>
        Guesses: <strong style={{ color: "var(--c-text)" }}>{count}</strong> &nbsp;·&nbsp; Range: <strong style={{ color: accentHex }}>{lo}–{hi}</strong>
      </div>

      {/* Input */}
      {!done && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, animation: shake ? "sp-wiggle .3s ease" : "none" }}>
          <input ref={inputRef} type="number" min={1} max={100} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guess()}
            placeholder="1–100"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 11, borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--c-border2)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 18, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "var(--font-body)", transition: "border-color .18s" }}
            onFocus={e => { e.currentTarget.style.borderColor = accentHex; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--c-border2)"; }}
          />
          <button onClick={guess}
            style={{ padding: "10px 20px", borderRadius: 11, border: "none", background: accentHex, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap", boxShadow: `0 3px 12px ${accentHex}44`, transition: "opacity .18s" }}
            onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
            Guess
          </button>
        </div>
      )}

      {reward && <RewardBanner xp={reward.xp} won sub={`Got it in ${count} guess${count!==1?"es":""}! ${count<=5?"Brilliant 🎯":count<=10?"Nice work!":"You got there!"}`} />}

      {/* History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 160, overflowY: "auto" }}>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", borderRadius: 9, background: "var(--c-surface2)", border: "1px solid var(--c-border)", fontSize: 12, animation: "sp-fade-up .2s ease" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)" }}>{h.val}</span>
            <span style={{ fontWeight: 600, padding: "2px 10px", borderRadius: 20, fontSize: 11, background: h.type==="low" ? "rgba(186,117,23,.12)" : h.type==="high" ? "rgba(226,75,74,.10)" : "rgba(0,168,107,.12)", color: h.type==="low" ? "var(--c-amber)" : h.type==="high" ? "var(--c-red)" : "var(--c-green)" }}>
              {h.type==="low" ? "Too low ↑" : h.type==="high" ? "Too high ↓" : "Correct! 🎯"}
            </span>
            <span style={{ fontSize: 11, color: "var(--c-text3)" }}>#{h.guessNum}</span>
          </div>
        ))}
      </div>

      {done && <div style={{ marginTop: 12 }}><PlayBtn canPlay={canPlay} label={`Play again (−${TREAT_COST} treats)`} accentHex={accentHex} onClick={startGame} /></div>}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MODAL SHELL
══════════════════════════════════════════════ */
interface Props {
  open: boolean;
  treats: number;
  accentHex: string;
  petName: string;
  onClose: () => void;
  onReward: (delta: number, type: "xp" | "treats") => void;
}

export default function MiniGamesModal({ open, treats, accentHex, petName, onClose, onReward }: Props) {
  const [tab, setTab]                   = useState<GameTab>("rps");
  const [localTreats, setLocalTreats]   = useState(treats);

  useEffect(() => { setLocalTreats(treats); }, [treats]);

  if (!open) return null;

  const canPlay = localTreats >= TREAT_COST;

  function handleReward(delta: number) {
    if (delta < 0) {
      setLocalTreats(t => t + delta);
      onReward(Math.abs(delta), "treats");
    } else {
      onReward(delta, "xp");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--c-surface)", border: `1px solid ${accentHex}28`, borderRadius: 26, padding: "22px 20px 20px", maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: `var(--shadow-lg), 0 0 48px ${accentHex}18`, animation: "sp-pop .35s cubic-bezier(.34,1.56,.64,1) both", fontFamily: "var(--font-body)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: `${accentHex}18`, border: `1px solid ${accentHex}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentHex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{petName}'s Arcade</div>
              <div style={{ fontSize: 11, color: localTreats < TREAT_COST ? "var(--c-red)" : "var(--c-text3)", marginTop: 1 }}>
                {localTreats} treats · {TREAT_COST} per game
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--c-text3)", transition: "background .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--c-surface2)"; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <TabBar active={tab} onSwitch={setTab} accentHex={accentHex} />

        {tab === "rps"  && <RPSGame      accentHex={accentHex} canPlay={canPlay} onReward={handleReward} />}
        {tab === "mem"  && <MemoryGame   accentHex={accentHex} canPlay={canPlay} onReward={handleReward} />}
        {tab === "word" && <WordScramble accentHex={accentHex} canPlay={canPlay} onReward={handleReward} />}
        {tab === "num"  && <NumberGuess  accentHex={accentHex} canPlay={canPlay} onReward={handleReward} />}
      </div>
    </div>
  );
}