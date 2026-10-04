import { Chess, Move, PieceSymbol, Color, Square } from "chess.js"

export type result = "1-0" | "0-1" | "1/2-1/2" | ""
export type square = { row: number, col: number }
export type move = {
    fen: string
    color: Color
    movement?: square[]
    bestMove?: square[]
    bestMoveSan?: string
    previousStaticEvals?: string[][]
    staticEval?: string[]
    moveRating?: string
    capture?: PieceSymbol
    castle?: "k" | "q"
}
export type openings = { [key: string]: string }

export function formatSquare(square: string): square {
    return { col: square.charCodeAt(0) - 97, row: 7 - Number(square[1]) + 1 }
}
export function deformatSquare(value: square): string {
    return `${String.fromCharCode(97 + value.col)}${8 - value.row}`
}
export function invertColor(color: Color): Color { return color === "w" ? "b" : "w" }
export function getCastle(move: Move): "k" | "q" | undefined {
    if (move.flags.includes("k")) return "k"
    if (move.flags.includes("q")) return "q"
    return undefined
}

type UciResult = { best: string, score: string[] }
function uci(worker: Worker, fen: string, depth: number, signal?: AbortSignal, onAbort?: () => void): Promise<UciResult> {
    return new Promise((resolve, reject) => {
        let best = ""
        const handler = (event: MessageEvent) => {
            const line = String(event.data)
            const match = line.match(/info .*?score (cp|mate) (-?\d+)/)
            if (match) score = [match[1], match[2]]
            const bestMatch = line.match(/^bestmove\s+(\S+)/)
            if (bestMatch) { cleanup(); resolve({ best: bestMatch[1], score }) }
        }
        let score = ["cp", "0"]
        const cleanup = () => { worker.removeEventListener("message", handler); signal?.removeEventListener("abort", abort) }
        const abort = () => { cleanup(); worker.postMessage("stop"); onAbort?.(); reject(new Error("canceled")) }
        signal?.addEventListener("abort", abort, { once: true })
        worker.addEventListener("message", handler)
        worker.postMessage(`position fen ${fen}`)
        worker.postMessage(`go depth ${depth}`)
    })
}

export async function prepareStockfish(worker: Worker | null, threads: number, hash: number) {
    if (!worker) throw new Error("engine unavailable")
    worker.postMessage("uci")
    worker.postMessage(`setoption name Threads value ${Math.max(1, threads)}`)
    worker.postMessage(`setoption name Hash value ${Math.max(1, hash)}`)
    worker.postMessage("isready")
}

async function analyzePosition(worker: Worker, chess: Chess, depth: number, signal?: AbortSignal, onAbort?: () => void): Promise<move> {
    const fen = chess.fen()
    const result = await uci(worker, fen, depth, signal, onAbort)
    const best = result.best === "(none)" ? undefined : chess.move({ from: result.best.slice(0, 2) as Square, to: result.best.slice(2, 4) as Square, promotion: result.best[4] as PieceSymbol })
    if (best) chess.undo()
    return { fen, color: chess.turn(), bestMove: best ? [formatSquare(best.from), formatSquare(best.to)] : undefined, bestMoveSan: best?.san, previousStaticEvals: [result.score] }
}

export function parsePosition(worker: Worker, chess: Chess, depth: number, signal?: AbortSignal, onAbort?: () => void) {
    return analyzePosition(worker, chess, depth, signal, onAbort)
}

export async function parsePGN(worker: Worker, pgn: string, depth: number, _openings: openings, progress: (value: number) => void, signal?: AbortSignal) {
    const chess = new Chess()
    try { chess.loadPgn(pgn) } catch { throw new Error("pgn") }
    const history = chess.history({ verbose: true })
    if (!history.length) throw new Error("pgn")
    const replay = new Chess()
    const moves: move[] = []
    for (let i = 0; i < history.length; i++) {
        if (signal?.aborted) throw new Error("canceled")
        const currentFen = replay.fen()
        const played = replay.move(history[i])
        const analysis = await analyzePosition(worker, new Chess(currentFen), depth, signal)
        moves.push({ ...analysis, fen: currentFen, movement: [formatSquare(played.from), formatSquare(played.to)], capture: played.captured, castle: getCastle(played) })
        progress((i + 1) / history.length)
    }
    const headers = chess.getHeaders()
    return { metadata: { time: 0, result: (headers.Result as result) || "", players: [{ name: headers.White || "White", elo: headers.WhiteElo || "?" }, { name: headers.Black || "Black", elo: headers.BlackElo || "?" }] }, moves }
}

export async function parseMove(worker: Worker, depth: number, played: Move, chess: Chess, _previous: string[][], _san?: string, _sacrifice?: boolean, _openings?: openings, _onAbort?: () => void, signal?: AbortSignal): Promise<move> {
    const analysis = await analyzePosition(worker, chess, depth, signal, _onAbort)
    return { ...analysis, movement: [formatSquare(played.from), formatSquare(played.to)], capture: played.captured, castle: getCastle(played) }
}
export function getAproxMemory() { return 128 }
