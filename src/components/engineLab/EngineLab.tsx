"use client"

export default function EngineLab() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""
  return (
    <main className="h-full min-h-0 w-full flex-1 overflow-hidden bg-[#f4f5ef]">
      <iframe
        title="Knightly Engine Lab — Stockfish 19"
        src={`${basePath}/stockfish-gui/index.html`}
        className="h-full min-h-0 w-full border-0"
        allow="fullscreen"
      />
    </main>
  )
}
