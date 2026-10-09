"use client"

import { useEffect, useRef, useState } from "react"
import { Chess, Square } from "chess.js"
import Link from "next/link"
import { createRoom, ensureAuth, findWaitingRooms, getProfile, joinRoom, loadRoom, postChat, postMove, postResign, saveProfile, streamRoom, UserProfile, Room } from "@/lib/online"

type Level = UserProfile["level"]
type Question = { q: string; a: string[]; correct: number }

const QUESTIONS: Question[] = [
  { q: "How many points is a queen usually worth?", a: ["3", "5", "9", "12"], correct: 2 },
  { q: "What is the main purpose of castling?", a: ["Win a pawn", "Develop the king and rook while improving king safety", "Trade queens", "Give check"], correct: 1 },
  { q: "Which move is checkmate?", a: ["A check the king can escape", "A check with no legal reply", "Any capture", "A discovered attack"], correct: 1 },
  { q: "What should you normally do early in the opening?", a: ["Move the same piece repeatedly", "Develop pieces and fight for the center", "Bring the queen out immediately", "Ignore king safety"], correct: 1 },
  { q: "A pinned piece is a piece that...", a: ["Cannot legally move because it exposes a more valuable piece/king", "Is always attacking", "Has been captured", "Is on the edge of the board"], correct: 0 },
]

function estimatedRating(level: Level, correct: number) {
  const base = level === "beginner" ? 400 : level === "intermediate" ? 800 : 1300
  return Math.min(1800, base + correct * 90)
}

function Onboarding({ onDone }: { onDone: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [level, setLevel] = useState<Level>("beginner")
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)

  const finish = (finalAnswers: number[] = answers) => {
    const correct = finalAnswers.reduce((n, a, i) => n + (a === QUESTIONS[i].correct ? 1 : 0), 0)
    const profile: UserProfile = {
      name: name.trim() || "Knightly Player",
      level,
      rating: estimatedRating(level, correct),
      provisional: true,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }
    onDone(profile)
  }

  if (step === 0) return (
    <section className="max-w-xl w-full rounded-2xl bg-backgroundBox p-6 shadow-2xl">
      <p className="text-sm font-bold text-foregroundGrey">WELCOME TO KNIGHTLY</p>
      <h1 className="text-3xl font-black mt-2">Find your starting level</h1>
      <p className="mt-2 text-foregroundGrey">This short setup gives you a provisional Knightly rating. Your rated games will replace it as you play.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your chess name" maxLength={24} className="mt-5 w-full rounded-xl bg-backgroundBoxBox p-3 outline-none" />
      <div className="grid grid-cols-3 gap-2 mt-3">
        {(["beginner","intermediate","advanced"] as Level[]).map(x => (
          <button key={x} onClick={() => setLevel(x)} className={`rounded-xl p-3 font-bold capitalize ${level === x ? "bg-backgroundBoxBoxHighlighted" : "bg-backgroundBoxBox"}`}>{x}</button>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="mt-5 w-full rounded-xl bg-backgroundBoxBoxHighlighted p-3 font-black">Continue</button>
    </section>
  )

  const question = QUESTIONS[step - 1]
  return (
    <section className="max-w-xl w-full rounded-2xl bg-backgroundBox p-6 shadow-2xl">
      <div className="text-sm font-bold text-foregroundGrey">QUESTION {step} / {QUESTIONS.length}</div>
      <h2 className="text-2xl font-black mt-3">{question.q}</h2>
      <div className="grid gap-2 mt-5">
        {question.a.map((answer, i) => (
          <button key={answer} onClick={() => setSelected(i)} className={`text-left rounded-xl p-3 font-bold ${selected === i ? "bg-backgroundBoxBoxHighlighted" : "bg-backgroundBoxBox"}`}>{answer}</button>
        ))}
      </div>
      <button disabled={selected === null} onClick={() => {
        setAnswers(a => [...a, selected as number])
        setSelected(null)
        const nextAnswers = [...answers, selected as number]
        if (step === QUESTIONS.length) finish(nextAnswers)
        else setStep(s => s + 1)
      }} className="mt-5 w-full rounded-xl bg-backgroundBoxBoxHighlighted p-3 font-black disabled:opacity-40">
        {step === QUESTIONS.length ? "Create my rating" : "Next"}
      </button>
    </section>
  )
}

const PIECES: Record<string, string> = { p:"♟", n:"♞", b:"♝", r:"♜", q:"♛", k:"♚", P:"♙", N:"♘", B:"♗", R:"♖", Q:"♕", K:"♔" }

function ChessBoard({ chess, orientation, onMove, disabled }: { chess: Chess, orientation: "w"|"b", onMove: (from: string, to: string) => void, disabled: boolean }) {
  const [selected, setSelected] = useState<string | null>(null)
  const files = orientation === "w" ? ["a","b","c","d","e","f","g","h"] : ["h","g","f","e","d","c","b","a"]
  const ranks = orientation === "w" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8]
  const board = chess.board()
  const map = new Map<string, {type:string; color:"w"|"b"}>()
  board.forEach((row, r) => row.forEach((p, c) => { if (p) map.set(`${String.fromCharCode(97+c)}${8-r}`, p) }))

  return <div className="aspect-square w-full max-w-[720px] overflow-hidden rounded-xl shadow-2xl border border-black/20">
    {ranks.map(rank => <div key={rank} className="grid grid-cols-8">
      {files.map(file => {
        const sq = `${file}${rank}` as Square
        const p = map.get(sq)
        const light = (files.indexOf(file) + rank) % 2 === 0
        const isSel = selected === sq
        return <button key={sq} disabled={disabled} onClick={() => {
          if (!selected) {
            if (p && p.color === chess.turn()) setSelected(sq)
            return
          }
          if (selected === sq) { setSelected(null); return }
          onMove(selected, sq)
          setSelected(null)
        }} className={`aspect-square flex items-center justify-center text-[clamp(30px,7vw,68px)] leading-none ${light ? "bg-[#ebecd0]" : "bg-[#779556]"} ${isSel ? "ring-4 ring-inset ring-yellow-400" : ""}`}>
          {p ? <span className={p.color === "w" ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,.8)]" : "text-[#171717] drop-shadow-[0_1px_1px_rgba(255,255,255,.25)]"}>{PIECES[p.color === "w" ? p.type.toUpperCase() : p.type]}</span> : null}
        </button>
      })}
    </div>)}
  </div>
}

export default function OnlineChess() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [uid, setUid] = useState("")
  const [screen, setScreen] = useState<"lobby"|"queue"|"game">("lobby")
  const [roomId, setRoomId] = useState("")
  const [room, setRoom] = useState<Room | null>(null)
  const [engineMode, setEngineMode] = useState(false)
  const [engineGame, setEngineGame] = useState(() => new Chess())
  const [onlineGame, setOnlineGame] = useState(() => new Chess())
  const [orientation, setOrientation] = useState<"w"|"b">("w")
  const [chat, setChat] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"play"|"chat">("play")
  const engineWorkerRef = useRef<Worker | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [engineThinking, setEngineThinking] = useState(false)

  useEffect(() => {
    (async () => {
      // A local profile keeps the offline engine playable even when the optional
      // Firebase multiplayer backend has not been configured.
      try {
        const auth = await ensureAuth()
        setUid(auth.uid)
        const existing = await getProfile(auth.uid)
        if (existing) {
          setProfile(existing)
          try { localStorage.setItem("knightly.profile", JSON.stringify(existing)) } catch {}
        } else {
          const saved = localStorage.getItem("knightly.profile")
          if (saved) {
            try { setProfile(JSON.parse(saved) as UserProfile) } catch {}
          }
        }
      } catch (e) {
        const saved = localStorage.getItem("knightly.profile")
        if (saved) {
          try { setProfile(JSON.parse(saved) as UserProfile) } catch {}
        }
        setError(e instanceof Error ? e.message : "Online service unavailable")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!engineMode) return
    const base = process.env.NEXT_PUBLIC_BASE_PATH || ""
    const worker = new Worker(`${base}/engine/stockfish.js`)
    engineWorkerRef.current = worker
    const handler = (event: MessageEvent) => {
      const line = String(event.data)
      if (line.includes("uciok")) {
        worker.postMessage("setoption name UCI_LimitStrength value true")
        worker.postMessage(`setoption name UCI_Elo value ${Math.max(1350, Math.min(2850, profile?.rating || 1200))}`)
        worker.postMessage("isready")
      }
      if (line.includes("readyok")) setEngineReady(true)
      const best = line.match(/^bestmove\s+(\S+)/)
      if (best && best[1] !== "(none)") {
        setEngineThinking(false)
        setEngineGame(current => {
          const next = new Chess(current.fen())
          try { next.move({ from: best[1].slice(0,2) as Square, to: best[1].slice(2,4) as Square, promotion: best[1][4] as any }) } catch {}
          return next
        })
      }
    }
    worker.addEventListener("message", handler)
    worker.postMessage("uci")
    return () => {
      worker.postMessage("quit")
      worker.terminate()
      engineWorkerRef.current = null
      setEngineReady(false)
      setEngineThinking(false)
    }
  }, [engineMode, profile?.rating])

  useEffect(() => {
    if (!engineMode || !engineReady || engineThinking || engineGame.turn() !== "b" || engineGame.isGameOver()) return
    const worker = engineWorkerRef.current
    if (!worker) return
    setEngineThinking(true)
    worker.postMessage(`position fen ${engineGame.fen()}`)
    worker.postMessage("go movetime 600")
  }, [engineMode, engineReady, engineThinking, engineGame])

  useEffect(() => {
    if (!roomId) return
    let stop = () => {}
    loadRoom(roomId).then(setRoom).catch(() => {})
    ensureAuth().then(() => {
      stop = streamRoom(roomId, r => {
        if (r) setRoom(r)
      })
    })
    return () => stop()
  }, [roomId])

  useEffect(() => {
    if (!room?.state) return
    try {
      const next = new Chess(room.state.fen)
      setOnlineGame(next)
      if (room.white === uid) setOrientation("w")
      else if (room.black === uid) setOrientation("b")
    } catch {}
  }, [room?.state?.fen, room?.white, room?.black, uid])

  const myColor: "w"|"b"|null = room ? (room.white === uid ? "w" : room.black === uid ? "b" : null) : null
  const gameOver = room?.state?.result || onlineGame.isGameOver() ? (room?.state?.result || (onlineGame.isCheckmate() ? (onlineGame.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2")) : ""
  const onHumanEngineMove = (from: string, to: string) => {
    if (engineThinking || engineGame.turn() !== "w" || engineGame.isGameOver()) return
    setEngineGame(current => {
      const next = new Chess(current.fen())
      try {
        next.move({ from: from as Square, to: to as Square, promotion: "q" })
        return next
      } catch { return current }
    })
  }

  async function saveOnboarding(p: UserProfile) {
    // Save locally first: this is enough for local engine games and survives reloads.
    try { localStorage.setItem("knightly.profile", JSON.stringify(p)) } catch {}
    setProfile(p)
    setError("")
    // Multiplayer profile sync is optional; report the missing backend only when
    // the player actually tries to use multiplayer, not when starting an offline game.
    if (uid) {
      try { await saveProfile(uid, p) } catch (e) {
        setError(e instanceof Error ? e.message : "Profile saved locally; multiplayer sync failed")
      }
    }
  }

  async function queueForPlayer() {
    if (!profile) return
    setError("")
    setScreen("queue")
    try {
      const candidates = await findWaitingRooms(profile.rating)
      if (candidates.length) {
        const [id] = candidates[0]
        await joinRoom(id, uid, profile.name, profile.rating)
        setRoomId(id)
        return
      }
      const id = await createRoom({
        white: uid,
        whiteName: profile.name,
        whiteRating: profile.rating,
        targetMin: Math.max(100, profile.rating - 150),
        targetMax: profile.rating + 150,
        createdAt: Date.now(),
        initialFen: new Chess().fen(),
      })
      setRoomId(id)
      const interval = window.setInterval(async () => {
        try {
          const latest = await loadRoom(id)
          if (latest.black) {
            window.clearInterval(interval)
            setRoom(latest)
            setScreen("game")
          }
        } catch {}
      }, 1800)
      window.setTimeout(() => window.clearInterval(interval), 60000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enter matchmaking")
      setScreen("lobby")
    }
  }

  async function sendChat() {
    if (!roomId || !profile || !chat.trim()) return
    await postChat(roomId, uid, profile.name, chat.trim())
    setChat("")
  }

  async function makeOnlineMove(from: string, to: string) {
    if (!roomId || !room || !profile || !myColor || room.state?.result || onlineGame.turn() !== myColor) return
    const next = new Chess(onlineGame.fen())
    try {
      const move = next.move({ from: from as Square, to: to as Square, promotion: "q" })
      await postMove(roomId, { from, to, promotion: move.promotion, ply: room.state?.ply ?? 0, uid })
    } catch {}
  }

  if (loading) return <main className="min-h-screen w-full flex items-center justify-center bg-background text-foreground font-bold">Loading Knightly...</main>
  if (!profile) return <main className="min-h-screen w-full flex items-center justify-center bg-background p-4"><Onboarding onDone={saveOnboarding} /></main>

  const currentMessages = Object.values(room?.messages || {}).sort((a,b) => a.createdAt - b.createdAt)

  return (
    <main className="min-h-screen w-full bg-background text-foreground p-3 md:p-6">
      <div className="max-w-[1450px] mx-auto">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div><Link href="/" className="font-black text-xl">♞ Knightly</Link><p className="text-sm text-foregroundGrey">Play • Review • Improve</p></div>
          <div className="rounded-full bg-backgroundBox px-4 py-2 font-black">{profile.rating} <span className="text-foregroundGrey text-sm">ELO</span></div>
        </header>

        {error && <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-sm">{error}</div>}

        {screen === "lobby" && <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl bg-backgroundBox p-6">
            <p className="text-sm font-bold text-foregroundGrey">YOUR KNIGHTLY PROFILE</p>
            <h1 className="text-4xl font-black mt-2">{profile.name}</h1>
            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl bg-backgroundBoxBox p-4"><div className="text-2xl font-black">{profile.rating}</div><div className="text-sm text-foregroundGrey">Provisional rating</div></div>
              <div className="rounded-xl bg-backgroundBoxBox p-4"><div className="text-2xl font-black capitalize">{profile.level}</div><div className="text-sm text-foregroundGrey">Starting level</div></div>
              <div className="rounded-xl bg-backgroundBoxBox p-4"><div className="text-2xl font-black">{profile.games}</div><div className="text-sm text-foregroundGrey">Rated games</div></div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={queueForPlayer} className="rounded-xl bg-backgroundBoxBoxHighlighted px-5 py-3 font-black">Play a person</button>
              <button onClick={() => { setEngineMode(true); setScreen("game"); setEngineGame(new Chess()) }} className="rounded-xl bg-backgroundBoxBox px-5 py-3 font-black">Play Stockfish</button>
              <Link href="/" className="rounded-xl bg-backgroundBoxBox px-5 py-3 font-black">Review a game</Link>
            </div>
          </div>
          <aside className="rounded-2xl bg-backgroundBox p-6">
            <h2 className="font-black text-xl">How Knightly works</h2>
            <ul className="mt-4 space-y-3 text-sm text-foregroundGrey">
              <li>• Your first rating is provisional.</li><li>• Matchmaking searches near your ELO.</li><li>• Every online move is sent as a server proposal.</li><li>• Stockfish runs locally in your browser.</li><li>• Chat is attached to the game room.</li>
            </ul>
          </aside>
        </section>}

        {screen === "queue" && <section className="max-w-xl mx-auto rounded-2xl bg-backgroundBox p-8 text-center">
          <div className="text-5xl">♞</div><h1 className="text-3xl font-black mt-3">Finding your opponent...</h1>
          <p className="text-foregroundGrey mt-2">Searching around {profile.rating} ELO. We widen the range if the queue is quiet.</p>
          <button onClick={() => setScreen("lobby")} className="mt-6 rounded-xl bg-backgroundBoxBox px-5 py-3 font-bold">Cancel</button>
        </section>}

        {screen === "game" && <section className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
          <div className="rounded-2xl bg-backgroundBox p-3 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-black">{engineMode ? "Stockfish" : room?.black ? `${orientation === "w" ? room.blackName : room.whiteName} • ${orientation === "w" ? room.blackRating : room.whiteRating}` : "Waiting..."}</div><div className="text-xs text-foregroundGrey">{engineMode ? (engineThinking ? "Thinking..." : engineReady ? "Local Stockfish ready" : "Loading engine...") : roomId}</div></div>
              {!engineMode && <button onClick={() => postResign(roomId, uid)} className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold">Resign</button>}
            </div>
            <ChessBoard chess={engineMode ? engineGame : onlineGame} orientation={orientation} disabled={!engineMode && (myColor === null || onlineGame.turn() !== myColor || Boolean(gameOver))} onMove={engineMode ? onHumanEngineMove : makeOnlineMove} />
            {gameOver && <div className="mt-3 rounded-xl bg-backgroundBoxBox p-4 text-center font-black">Game finished: {gameOver}</div>}
          </div>
          <aside className="rounded-2xl bg-backgroundBox p-4 min-h-[520px]">
            <div className="flex rounded-xl bg-backgroundBoxBox p-1 mb-4">
              <button onClick={() => setTab("play")} className={`flex-1 rounded-lg p-2 font-bold ${tab === "play" ? "bg-backgroundBoxBoxHighlighted" : ""}`}>Game</button>
              <button onClick={() => setTab("chat")} className={`flex-1 rounded-lg p-2 font-bold ${tab === "chat" ? "bg-backgroundBoxBoxHighlighted" : ""}`}>Chat</button>
            </div>
            {tab === "play" ? <div className="space-y-3">
              <div className="rounded-xl bg-backgroundBoxBox p-4"><div className="text-xs text-foregroundGrey">ENGINE / SERVER STATUS</div><div className="font-black mt-1">{engineMode ? "Stockfish local" : room?.state?.turn === myColor ? "Your move" : "Opponent's move"}</div></div>
              {!engineMode && room?.state?.lastMove && <div className="rounded-xl bg-backgroundBoxBox p-4"><div className="text-xs text-foregroundGrey">LAST MOVE</div><div className="font-black">{room.state.lastMove.san}</div></div>}
              <button onClick={() => setOrientation(o => o === "w" ? "b" : "w")} className="w-full rounded-xl bg-backgroundBoxBox p-3 font-bold">Flip board</button>
            </div> : <div className="flex flex-col h-[420px]">
              <div className="flex-1 overflow-y-auto space-y-2">{currentMessages.map((m, i) => <div key={i} className="rounded-lg bg-backgroundBoxBox p-2 text-sm"><b>{m.name}</b><div>{m.text}</div></div>)}</div>
              <div className="flex gap-2 mt-3"><input value={chat} onChange={e => setChat(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} maxLength={300} placeholder="Message opponent..." className="min-w-0 flex-1 rounded-xl bg-backgroundBoxBox p-3 outline-none" /><button onClick={sendChat} className="rounded-xl bg-backgroundBoxBoxHighlighted px-4 font-black">Send</button></div>
            </div>}
          </aside>
        </section>}
      </div>
    </main>
  )
}
