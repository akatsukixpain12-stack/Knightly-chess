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
  { icon: "♟", number: "01", title: "Analyze a game", text: "Find the turning points, understand your mistakes, and discover stronger moves.", href: "#analysis", action: "Open analysis", tone: "mint" },
  { icon: "⚔", number: "02", title: "Play chess", text: "Take your ideas to the board and put your skills into practice.", href: "/play", action: "Play a game", tone: "peach" },
  { icon: "♟", number: "03", title: "Engine Lab", text: "Play Stockfish 19, adjust engine strength, and explore positions in a dedicated chess workspace.", href: "/engine-lab", action: "Open Engine Lab", tone: "blue" },
]

const pieces: Record<number, string> = {
  0: "♜", 1: "♞", 2: "♝", 3: "♛", 4: "♚", 5: "♝", 6: "♞", 7: "♜",
  8: "♟", 9: "♟", 10: "♟", 11: "♟", 12: "♟", 13: "♟", 14: "♟", 15: "♟",
  48: "♙", 49: "♙", 50: "♙", 51: "♙", 52: "♙", 53: "♙", 54: "♙", 55: "♙",
  56: "♖", 57: "♘", 58: "♗", 59: "♕", 60: "♔", 61: "♗", 62: "♘", 63: "♖",
}

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""

  return (
    <ConfigContextProvider>
      <ErrorsContextProvider>
        <PageErrors />
        <header className="w-full">
          <Nav />
        </header>

        <div className="knightly-home w-full min-h-full overflow-x-hidden">
          <section className="knightly-hero mx-auto w-full max-w-6xl px-4 pt-10 pb-10 sm:px-6 sm:pt-16 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
              <div className="knightly-copy max-w-2xl">
                <div className="knightly-pill mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-extrabold tracking-wide">
                  <span className="knightly-live-dot" />
                  FREE CHESS ANALYSIS · ENGINE POWERED
                </div>
                <h1 className="knightly-title text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
                  Find the moment<br />
                  <span>your game changed.</span>
                </h1>
                <p className="knightly-subtitle mt-5 max-w-xl text-base leading-7 sm:text-lg">
                  Review your games, spot the turning points, and see stronger moves with engine-powered analysis. No noise — just useful feedback to help you improve.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#analysis" className="knightly-button knightly-button-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold">
                    Analyze a game <span className="ml-2" aria-hidden="true">↗</span>
                  </a>
                  <a href={`${basePath}/play`} className="knightly-button knightly-button-secondary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold">
                    <span className="mr-2 text-lg" aria-hidden="true">♞</span> Play a game
                  </a>
                </div>
                <div className="knightly-proof mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
                  <span><b>✓</b> Free to explore</span>
                  <span><b>✓</b> Engine-powered insights</span>
                  <span><b>✓</b> Made for every level</span>
                </div>
              </div>

              <div className="knightly-board-wrap relative mx-auto w-full max-w-[470px]">
                <div className="knightly-orbit knightly-orbit-one" />
                <div className="knightly-orbit knightly-orbit-two" />
                <div className="knightly-board-card relative">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="knightly-eyebrow text-xs font-extrabold uppercase tracking-[.16em]">Position preview</p>
                      <p className="knightly-board-heading mt-1 text-lg font-black">Every move tells a story.</p>
                    </div>
                    <span className="knightly-status rounded-full px-3 py-1.5 text-xs font-extrabold">READY TO PLAY <span aria-hidden="true">●</span></span>
                  </div>
                  <div className="knightly-chessboard grid aspect-square grid-cols-8 overflow-hidden rounded-2xl">
                    {Array.from({ length: 64 }, (_, i) => {
                      const row = Math.floor(i / 8)
                      const col = i % 8
                      const light = (row + col) % 2 === 0
                      return (
                        <div key={i} className={`knightly-square flex aspect-square items-center justify-center ${light ? "knightly-light" : "knightly-dark"} `}>
                          {pieces[i] && <span className={`knightly-piece select-none leading-none ${row < 2 ? "knightly-black-piece" : "knightly-white-piece"}`}>{pieces[i]}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="knightly-board-footer mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="knightly-avatar">♘</span>
                      <div><p className="text-sm font-extrabold">Knightly Chess</p><p className="knightly-muted text-xs">Think. Try. Improve.</p></div>
                    </div>
                    <span className="knightly-footer-arrow" aria-hidden="true">↗</span>
                  </div>
                </div>
                <div className="knightly-float-chip knightly-float-top"><span>✦</span> Find your turning point</div>
                <div className="knightly-float-chip knightly-float-bottom"><span>♟</span> Learn from every game</div>
              </div>
            </div>

            <div className="knightly-tools mt-16 grid gap-4 sm:grid-cols-3">
              {tools.map((tool, index) => (
                <a key={tool.title} href={tool.href.startsWith("/") ? `${basePath}${tool.href}` : tool.href} className={`knightly-tool-card knightly-tool-${tool.tone}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between">
                    <span className="knightly-tool-icon">{tool.icon}</span>
                    <span className="knightly-tool-number">{tool.number}</span>
                  </div>
                  <h2 className="mt-5 text-lg font-black">{tool.title}</h2>
                  <p className="knightly-tool-text mt-2 text-sm leading-6">{tool.text}</p>
                  <span className="knightly-tool-action mt-5 inline-flex items-center gap-2 text-sm font-extrabold">{tool.action} <span aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
          </section>

          <section id="analysis" className="knightly-analysis-section px-2 py-8 sm:px-4 sm:py-12">
            <div className="mx-auto mb-7 flex max-w-6xl flex-wrap items-end justify-between gap-4 px-2">
              <div>
                <p className="knightly-analysis-kicker text-xs font-extrabold uppercase tracking-[.2em]">THE ANALYSIS STUDIO</p>
                <h2 className="knightly-analysis-title mt-2 text-2xl font-black sm:text-4xl">Curious about a position?</h2>
                <p className="knightly-analysis-subtitle mt-2 max-w-2xl text-sm leading-6 sm:text-base">Move pieces on the board, explore different ideas, and use engine suggestions to understand why a move works.</p>
              </div>
              <span className="knightly-analysis-badge rounded-full px-4 py-2 text-xs font-extrabold">YOUR SPACE TO LEARN ♟</span>
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
          <footer className="knightly-footer border-t px-4 py-7 text-center text-xs">
            Knightly Chess <span aria-hidden="true">♞</span> · Play, review, analyze, improve.
          </footer>
        </div>
      </ErrorsContextProvider>
    </ConfigContextProvider>
  )
}
