import BoardMenu from "@/components/boardMenu/boardMenu"
import Game from "@/components/game/game"
import Menu from "@/components/menu/menu"
import Nav from "@/components/nav/nav"
import AnalyzeContextProvider from "@/context/analyze"
import ConfigContextProvider from "@/context/config"
import ErrorsContextProvider from "@/context/errors"
import PageErrors from "@/components/errors/pageErrors"
import GameButtons from "@/components/menu/analysis/gameButtons"

const tools = [
  { icon: "♟", title: "Analyze a game", text: "Review positions, explore variations, and learn from every move.", href: "#analysis", action: "Open analysis" },
  { icon: "⚔", title: "Play chess", text: "Jump into a game and put your ideas to the test.", href: "/play", action: "Play now" },
  { icon: "✦", title: "Improve every day", text: "Use engine feedback to spot mistakes and find stronger plans.", href: "#analysis", action: "Start improving" },
]

export default function Home() {
  return (
    <ConfigContextProvider>
      <ErrorsContextProvider>
        <PageErrors />
        <header className="w-full">
          <Nav />
        </header>

        <div className="w-full min-h-full overflow-x-hidden">
          <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-16 lg:px-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold tracking-wide text-[#b7d98b]">
                  <span className="h-2 w-2 rounded-full bg-[#9bc765]" />
                  YOUR NEXT MOVE STARTS HERE
                </div>
                <h1 className="text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-6xl">
                  Play smarter.<br />
                  <span className="text-[#a6ce72]">Become Knightly.</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                  Play, analyze, and understand your chess. Explore positions with engine-powered analysis and turn every game into progress.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a href="#analysis" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#9bc765] px-5 py-3 text-sm font-extrabold text-[#17200f] shadow-lg shadow-black/20 transition hover:bg-[#b1dc7b]">
                    Analyze a position <span className="ml-2" aria-hidden="true">↗</span>
                  </a>
                  <a href="/play" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                    Play chess <span className="ml-2" aria-hidden="true">♞</span>
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/45">
                  <span>✓ Browser-based analysis</span>
                  <span>✓ Explore best moves</span>
                  <span>✓ Built for desktop and mobile</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-md">
                <div className="absolute -inset-4 rounded-[2rem] bg-[#9bc765]/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#242522] p-3 shadow-2xl shadow-black/30 sm:p-4">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.18em] text-white/40">Knightly board</p>
                      <p className="mt-1 text-sm font-semibold text-white">Think beyond the obvious.</p>
                    </div>
                    <span className="rounded-lg bg-[#9bc765]/15 px-2.5 py-1.5 text-xs font-bold text-[#b7d98b]">ANALYZE</span>
                  </div>
                  <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-lg border border-white/10">
                    {Array.from({ length: 64 }, (_, i) => {
                      const row = Math.floor(i / 8)
                      const col = i % 8
                      const pieces: Record<number, string> = {
                        0: "♜", 1: "♞", 2: "♝", 3: "♛", 4: "♚", 5: "♝", 6: "♞", 7: "♜",
                        8: "♟", 9: "♟", 10: "♟", 11: "♟", 12: "♟", 13: "♟", 14: "♟", 15: "♟",
                        48: "♙", 49: "♙", 50: "♙", 51: "♙", 52: "♙", 53: "♙", 54: "♙", 55: "♙",
                        56: "♖", 57: "♘", 58: "♗", 59: "♕", 60: "♔", 61: "♗", 62: "♘", 63: "♖",
                      }
                      const light = (row + col) % 2 === 0
                      return (
                        <div key={i} className={`flex aspect-square items-center justify-center ${light ? "bg-[#e8e8d5]" : "bg-[#779556]"} `}>
                          {pieces[i] && <span className={`select-none text-[clamp(1rem,4.4vw,2.7rem)] leading-none ${row < 2 ? "text-[#292b27] drop-shadow-sm" : "text-[#fffdf1] drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]"}`}>{pieces[i]}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5">
                    <span className="text-xs text-white/55">Your next move matters</span>
                    <span className="text-xs font-bold text-[#b7d98b]">KNIGHTLY ♞</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {tools.map((tool) => (
                <a key={tool.title} href={tool.href} className="group rounded-2xl border border-white/[.09] bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:border-[#9bc765]/40 hover:bg-white/[.06]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9bc765]/15 text-xl text-[#b7d98b]">{tool.icon}</span>
                  <h2 className="mt-4 text-base font-extrabold text-white">{tool.title}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-white/55">{tool.text}</p>
                  <span className="mt-4 inline-block text-xs font-bold text-[#b7d98b]">{tool.action} →</span>
                </a>
              ))}
            </div>
          </section>

          <section id="analysis" className="border-t border-white/[.08] bg-black/10 px-2 py-6 sm:px-4 sm:py-8">
            <div className="mx-auto mb-5 flex max-w-6xl flex-wrap items-end justify-between gap-3 px-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b7d98b]">The analysis studio</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Make your next move your best.</h2>
                <p className="mt-2 text-sm text-white/55">Play moves on the board, inspect the position, and explore engine suggestions.</p>
              </div>
            </div>
            <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 overflow-x-hidden vertical:flex-row vertical:items-start vertical:justify-center vertical:gap-2">
              <AnalyzeContextProvider>
                <div className="flex h-full w-min flex-col gap-[6px] navTop:flex-row vertical:gap-[10px]">
                  <Game />
                  <BoardMenu />
                  <div className="flex h-12 w-full flex-row justify-center rounded-borderRoundness bg-backgroundBox navTop:hidden">
                    <div className="flex w-full max-w-[500px] scale-75 flex-row justify-center">
                      <GameButtons />
                    </div>
                  </div>
                </div>
                <Menu />
              </AnalyzeContextProvider>
            </main>
          </section>
          <footer className="border-t border-white/[.08] px-4 py-6 text-center text-xs text-white/35">
            Knightly · Play, review, analyze, improve.
          </footer>
        </div>
      </ErrorsContextProvider>
    </ConfigContextProvider>
  )
}
