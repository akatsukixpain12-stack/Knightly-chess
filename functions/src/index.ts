import { initializeApp } from "firebase-admin/app"
import { DatabaseReference as FirebaseDatabaseReference, getDatabase } from "firebase-admin/database"
import { onValueCreated } from "firebase-functions/v2/database"
import { logger } from "firebase-functions"
import { Chess, Square } from "chess.js"

initializeApp()

type Proposal = { from: string; to: string; promotion?: string; ply: number; uid: string }
type State = {
  fen: string
  ply: number
  turn: "w" | "b"
  result: "" | "1-0" | "0-1" | "1/2-1/2"
  lastMove?: { from: string; to: string; san: string; uid: string; ply: number }
}

function resultFor(chess: Chess): State["result"] {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0"
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return "1/2-1/2"
  return ""
}

function eloDelta(a: number, b: number, score: number) {
  const expected = 1 / (1 + Math.pow(10, (b - a) / 400))
  return Math.round(32 * (score - expected))
}

async function applyRatingForRoom(roomRef: FirebaseDatabaseReference, roomId: string, result: State["result"]) {
  const room = (await roomRef.once("value")).val()
  if (!room || room.ratingApplied || !room.black || !room.blackRating) return

  const whiteScore = result === "1-0" ? 1 : result === "1/2-1/2" ? 0.5 : 0
  const blackScore = 1 - whiteScore
  const whiteDelta = eloDelta(room.whiteRating, room.blackRating, whiteScore)
  const blackDelta = -eloDelta(room.blackRating, room.whiteRating, blackScore)
  const updates: Record<string, unknown> = {
    [`users/${room.white}/rating`]: Math.max(100, room.whiteRating + whiteDelta),
    [`users/${room.black}/rating`]: Math.max(100, room.blackRating + blackDelta),
    [`users/${room.white}/games`]: { ".sv": { "increment": 1 } },
    [`users/${room.black}/games`]: { ".sv": { "increment": 1 } },
    [`rooms/${roomId}/ratingApplied`]: true,
  }

  if (whiteScore === 1) {
    updates[`users/${room.white}/wins`] = { ".sv": { "increment": 1 } }
    updates[`users/${room.black}/losses`] = { ".sv": { "increment": 1 } }
  } else if (blackScore === 1) {
    updates[`users/${room.white}/losses`] = { ".sv": { "increment": 1 } }
    updates[`users/${room.black}/wins`] = { ".sv": { "increment": 1 } }
  } else {
    updates[`users/${room.white}/draws`] = { ".sv": { "increment": 1 } }
    updates[`users/${room.black}/draws`] = { ".sv": { "increment": 1 } }
  }

  await getDatabase().ref().update(updates)
}

export const referee = onValueCreated(
  { ref: "/rooms/{roomId}/proposals/{proposalId}", region: "asia-south1" },
  async (event) => {
    const proposal = event.data.val() as Proposal | null
    if (!proposal) return

    const db = getDatabase()
    const roomRef = db.ref(`rooms/${event.params.roomId}`)
    let accepted: State | null = null
    let acceptedSan = ""

    await roomRef.transaction((room) => {
      if (!room || room.status !== "playing" || room.state?.result) return room

      const state = room.state as State
      const expectedUid = state.turn === "w" ? room.white : room.black
      if (proposal.uid !== expectedUid || proposal.ply !== state.ply) return room

      const chess = new Chess(state.fen)
      try {
        const move = chess.move({
          from: proposal.from as Square,
          to: proposal.to as Square,
          promotion: proposal.promotion as any,
        })
        const result = resultFor(chess)
        accepted = {
          fen: chess.fen(),
          ply: state.ply + 1,
          turn: chess.turn(),
          result,
          lastMove: {
            from: proposal.from,
            to: proposal.to,
            san: move.san,
            uid: proposal.uid,
            ply: state.ply,
          },
        }
        acceptedSan = move.san
        return { ...room, state: accepted, status: result ? "finished" : "playing" }
      } catch {
        return room
      }
    })

    if (!accepted) {
      await event.data.ref.child("rejected").set(true)
      return
    }

    await event.data.ref.child("accepted").set(true)
    logger.info("Accepted move", {
      roomId: event.params.roomId,
      proposalId: event.params.proposalId,
      san: acceptedSan,
    })

    if (accepted.result) {
      await applyRatingForRoom(roomRef, event.params.roomId, accepted.result)
    }
  },
)

export const resignation = onValueCreated(
  { ref: "/rooms/{roomId}/resignations/{uid}", region: "asia-south1" },
  async (event) => {
    const roomRef = getDatabase().ref(`rooms/${event.params.roomId}`)
    const room = (await roomRef.once("value")).val()
    if (!room || room.status !== "playing" || room.state?.result) return

    const uid = event.params.uid
    if (uid !== room.white && uid !== room.black) return

    const result: State["result"] = uid === room.white ? "0-1" : "1-0"
    await roomRef.update({
      status: "finished",
      state: { ...room.state, result },
    })
    await applyRatingForRoom(roomRef, event.params.roomId, result)
  },
)
