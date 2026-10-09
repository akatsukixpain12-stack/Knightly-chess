"use client"

import { Chess, type Square } from "chess.js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type EngineMode = "human" | "duel"

const pieceGlyph: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
}

export default function EngineLab() {
  const chessRef = useRef(new Chess())
  const workerRef = useRef<Worker | null>(null)
  const [fen, setFen] = useState(chessRef.current.fen())
  const [mode, setMode] = useState<EngineMode>("human")
  const [engineReady, setEngineReady] = useState(false)
  const [engineBusy, setEngineBusy] = useState(false)
  const [selected, setSelected] = useState<Square | null>(null)
  const [legalTargets, setLegalTargets] = useState<Square[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [engineLine, setEngineLine] = useState("Connecting to Stockfish…")
  const [evaluation, setEvaluation] = useState("—")
  const [flipped, setFlipped] = useState(false)
  const [error, setError] = useState("")

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""
  const board = useMemo(() => {
    const rows = chessRef.current.board()
    return flipped ? [...rows].reverse().map(row => [...row].reverse()) : rows
  }, [fen, flipped])

  useEffect(() => {
    let alive = true
    let bootTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const worker = new Worker(`${basePath}/engine/stockfish-asm.js`)
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent) => {
        const line = String(event.data ?? "")
        if (!alive) return
        if (line === "uciok") {
          worker.postMessage("setoption name Threads value 1")
          worker.postMessage("setoption name Hash value 32")
          worker.postMessage("isready")
        } else if (line === "readyok") {
          setEngineReady(true)
          setEngineLine("Stockfish is ready")
          if (bootTimer) clearTimeout(bootTimer)
        } else {
          const score = line.match(/\bscore cp (-?\d+)/)
          const mate = line.match(/\bscore mate (-?\d+)/)
          if (score) setEvaluation((Number(score[1]) / 100).toFixed(2))
          if (mate) setEvaluation(`M${mate[1]}`)
          const depth = line.match(/\bdepth (\d+)/)
          if (depth && /\binfo\b/.test(line)) setEngineLine(`Searching · depth ${depth[1]}`)
          const best = line.match(/^bestmove\s+(\S+)/)
          if (best && best[1] !== "(none)" && best[1] !== "0000") {
            setEngineBusy(false)
            const current = chessRef.current
            try {
              const move = current.move({
                from: best[1].slice(0, 2) as Square,
                to: best[1].slice(2, 4) as Square,
                promotion: (best[1][4] || "q") as "q" | "r" | "b" | "n",
              })
              if (move) {
                setHistory(current.history())
                setFen(current.fen())
                setSelected(null)
                setLegalTargets([])
                setEngineLine(current.isGameOver() ? "Game finished" : `Stockfish played ${move.san}`)
              }
            } catch {
              setEngineLine("Engine returned an invalid move. Start a new game.")
            }
          }
        }
      }
      worker.onerror = () => {
        if (alive) {
          setError("The bundled engine could not start in this browser. Try refreshing or use the main analysis board.")
          setEngineLine("Engine unavailable")
          setEngineBusy(false)
        }
      }
      worker.postMessage("uci")
      bootTimer = setTimeout(() => {
        if (alive && !engineReady) setError("Stockfish is taking longer than expected to start. Check that engine assets loaded correctly.")
      }, 12000)
    } catch {
      setError("Your browser could not create the chess engine worker.")
    }
    return () => {
      alive = false
      if (bootTimer) clearTimeout(bootTimer)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [basePath])

  const askEngine = useCallback(() => {
    const worker = workerRef.current
    const current = chessRef.current
    if (!worker || !engineReady || current.isGameOver()) return
    setEngineBusy(true)
    setEngineLine("Stockfish is thinking…")
    worker.postMessage("stop")
    worker.postMessage(`position fen ${current.fen()}`)
    worker.postMessage("go depth 12")
  }, [engineReady])

  useEffect(() => {
    if (!engineReady || engineBusy || chessRef.current.isGameOver()) return
    if (mode === "duel" || (mode === "human" && chessRef.current.turn() === "b")) askEngine()
  }, [fen, mode, engineReady, engineBusy, askEngine])

  const clickSquare = (square: Square) => {
    if (engineBusy || !engineReady || chessRef.current.isGameOver()) return
    const current = chessRef.current
    if (mode === "human" && current.turn() === "b") return
    if (selected && legalTargets.includes(square)) {
      try {
        const move = current.move({ from: selected, to: square, promotion: "q" })
        if (move) {
          setHistory(current.history())
          setFen(current.fen())
          setSelected(null)
          setLegalTargets([])
          setEngineLine(`You played ${move.san}`)
          return
        }
      } catch { /* Illegal move; allow the square to be selected below. */ }
    }
    const piece = current.get(square)
    if (piece && (mode === "duel" || piece.color === current.turn())) {
      setSelected(square)
      setLegalTargets(current.moves({ square, verbose: true }).map(move => move.to))
    } else {
      setSelected(null)
      setLegalTargets([])
    }
  }

  const newGame = () => {
    workerRef.current?.postMessage("stop")
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setHistory([])
    setSelected(null)
    setLegalTargets([])
    setEvaluation("—")
    setError("")
    setEngineBusy(false)
    setEngineLine("New game · White to move")
  }

  const status = chessRef.current.isCheckmate()
    ? `Checkmate · ${chessRef.current.turn() === "w" ? "Black" : "White"} wins`
    : chessRef.current.isDraw()
      ? "Draw"
      : chessRef.current.isCheck()
        ? "Check"
        : `${chessRef.current.turn() === "w" ? "White" : "Black"} to move`

  const files = flipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"]

  return (
    <main className="min-h-screen w-full overflow-y-auto bg-[#f4f5ef] text-[#202820]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e1e6db] bg-[#f9faf5]/95 px-4 py-3 backdrop-blur sm:px-8">
        <a href={basePath || "/"} className="flex items-center gap-3 font-black tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#263328] text-2xl text-[#c5f28e]">♞</span>
          <span>Knightly <span className="text-[#689348]">Engine Lab</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.2em] text-[#8a9385]">Play · Explore · Improve</span></span>
        </a>
        <a href={`${basePath}/`} className="rounded-xl border border-[#dfe5d7] bg-white px-4 py-2 text-sm font-extrabold hover:border-[#a9cb8d]">← Knightly home</a>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d9e8ce] bg-[#e9f4df] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#537b39]"><span className={`h-2 w-2 rounded-full ${engineReady ? "bg-[#6aa344]" : "bg-amber-400"}`} />{engineReady ? "Engine online" : "Starting engine"}</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">A board for your next idea.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f786b] sm:text-base">A focused chess workspace with legal moves, engine play, move history and a live evaluation — powered locally in your browser.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={newGame} className="rounded-xl bg-[#c5f28e] px-4 py-3 text-sm font-black shadow-[0_4px_0_#9bc96e] transition hover:-translate-y-0.5">＋ New game</button>
            <button onClick={() => setFlipped(value => !value)} className="rounded-xl border border-[#dfe5d7] bg-white px-4 py-3 text-sm font-extrabold transition hover:border-[#9bbf7c]">⇅ Flip board</button>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,.8fr)]">
          <section className="rounded-[26px] border border-[#e0e5d9] bg-white p-3 shadow-[0_18px_50px_#2633280c] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8b9585]">White</p><p className="mt-1 font-black">Knightly Player</p></div>
              <div className="rounded-full bg-[#f0f4e9] px-3 py-1.5 text-xs font-extrabold text-[#55783e]">{status}</div>
              <div className="text-right"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8b9585]">Black</p><p className="mt-1 font-black">Stockfish</p></div>
            </div>
            <div className="mx-auto grid w-full max-w-[720px] grid-cols-8 overflow-hidden rounded-xl border-[5px] border-[#fff] shadow-[0_0_0_1px_#dce3d4,0_12px_30px_#283b2417]">
              {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                const displayRow = flipped ? 7 - rowIndex : rowIndex
                const displayCol = flipped ? 7 - colIndex : colIndex
                const square = `${files[displayCol]}${8 - displayRow}` as Square
                const isLight = (rowIndex + colIndex) % 2 === 0
                const isTarget = legalTargets.includes(square)
                const isSelected = selected === square
                return <button key={square} onClick={() => clickSquare(square)} aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`} className={`relative flex aspect-square items-center justify-center text-[clamp(1.7rem,5.4vw,4.5rem)] leading-none transition ${isLight ? "bg-[#edf1df]" : "bg-[#83a66e]"} ${isSelected ? "z-10 ring-4 ring-inset ring-[#e9bf5b]" : ""} hover:brightness-105`}>
                  {piece && <span className={`select-none drop-shadow-sm ${piece.color === "w" ? "text-[#fffdf4] [text-shadow:0_2px_2px_#26332888]" : "text-[#263328] [text-shadow:0_1px_1px_#ffffff55]"}`}>{pieceGlyph[`${piece.color}${piece.type}`]}</span>}
                  {isTarget && <span className={`absolute h-[22%] w-[22%] rounded-full ${piece ? "border-[5px] border-[#e7bd52]/90" : "bg-[#344e2b]/35"}`} />}
                  {colIndex === 0 && <span className={`absolute left-1 top-0.5 text-[10px] font-black ${isLight ? "text-[#83a66e]" : "text-[#edf1df]"}`}>{8 - rowIndex}</span>}
                  {rowIndex === 7 && <span className={`absolute bottom-0 right-1 text-[10px] font-black ${isLight ? "text-[#83a66e]" : "text-[#edf1df]"}`}>{files[colIndex]}</span>}
                </button>
              }))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5f7f0] px-4 py-3">
              <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#899382]">Engine status</p><p className="mt-1 text-sm font-bold">{engineBusy ? "Thinking…" : engineLine}</p></div>
              <div className="rounded-xl border border-[#e1e7d9] bg-white px-3 py-2 text-right"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#899382]">Evaluation</p><p className="font-black tabular-nums">{evaluation}</p></div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-[#e0e5d9] bg-white p-5 shadow-[0_18px_50px_#2633280c]">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8b9585]">Game controls</p>
              <h2 className="mt-2 text-xl font-black">Choose your match</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { setMode("human"); newGame() }} className={`rounded-xl px-3 py-3 text-sm font-extrabold ${mode === "human" ? "bg-[#29362b] text-white" : "bg-[#f1f4eb] text-[#465343]"}`}>You vs Engine</button>
                <button onClick={() => { setMode("duel"); newGame() }} className={`rounded-xl px-3 py-3 text-sm font-extrabold ${mode === "duel" ? "bg-[#29362b] text-white" : "bg-[#f1f4eb] text-[#465343]"}`}>Engine vs Engine</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7d8678]">Stockfish runs in a browser worker. Engine vs Engine automatically alternates moves; keep the tab open while it plays.</p>
              <button onClick={askEngine} disabled={!engineReady || engineBusy || chessRef.current.isGameOver()} className="mt-4 w-full rounded-xl bg-[#c5f28e] px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">Ask engine for a move</button>
              {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
            </section>
            <section className="rounded-[26px] border border-[#e0e5d9] bg-white p-5 shadow-[0_18px_50px_#2633280c]">
              <div className="flex items-center justify-between"><h2 className="text-xl font-black">Move history</h2><span className="rounded-full bg-[#f1f4eb] px-2.5 py-1 text-xs font-extrabold text-[#6b7863]">{history.length} plies</span></div>
              <div className="mt-4 max-h-[290px] min-h-20 overflow-y-auto rounded-xl bg-[#f6f7f2] p-3">
                {history.length ? <div className="grid grid-cols-[32px_1fr_1fr] gap-x-2 gap-y-2 text-sm">{Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => <div key={i} className="contents"><span className="text-[#9aa391]">{i + 1}.</span><span className="font-bold">{history[i * 2]}</span><span className="font-bold">{history[i * 2 + 1] || ""}</span></div>)}</div> : <p className="py-4 text-center text-sm text-[#8b9585]">Your first move starts the story.</p>}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7d8678]">Moves are kept in this session. Start a new game to reset the board.</p>
            </section>
          </aside>
        </div>
        <footer className="py-8 text-center text-xs text-[#8a9385]">Knightly Engine Lab · Stockfish.js · Open-source chess tools</footer>
      </div>
    </main>
  )
}
