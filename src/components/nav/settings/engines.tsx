import { useContext, useEffect } from "react"
import { ConfigContext } from "@/context/config"

export default function Engines() {
    const context = useContext(ConfigContext)
    const [engine, setEngine] = context.engine
    const [mode, setMode] = context.gameMode
    useEffect(() => { const saved = localStorage.getItem("andromeda-engine"); if (saved === "stockfish") setEngine("stockfish"); else if (saved === "andromeda") { setEngine("stockfish"); localStorage.setItem("andromeda-engine", "stockfish") } }, [])
    function choose(value: "stockfish" | "andromeda") { setEngine(value); localStorage.setItem("andromeda-engine", value) }
    return <section>
        <h1 className="block bg-backgroundBoxBox font-bold p-3">Game Mode & Engine</h1>
        <div className="grid grid-cols-2 gap-2 p-2">
            {([['player', 'Player vs Player'], ['engine', 'Engine vs Engine']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={`p-2 font-bold rounded-borderRoundness bg-backgroundBoxBox hover:text-foregroundHighlighted ${mode === value ? 'border-2 border-foregroundHighlighted' : ''}`}>{label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2 p-2 pt-0">
            <button type="button" onClick={() => choose("stockfish")} className={`p-2 font-bold rounded-borderRoundness bg-backgroundBoxBox hover:text-foregroundHighlighted ${engine === "stockfish" ? 'border-2 border-foregroundHighlighted' : ''}`}>Stockfish</button>
            <button type="button" disabled title="Andromeda worker and WASM files are not present in this repository yet" className="p-2 font-bold rounded-borderRoundness bg-backgroundBoxBox opacity-45 cursor-not-allowed">Andromeda · unavailable</button>
        </div>
    </section>
}
