export type UserProfile = {
  name: string
  rating: number
  level: "beginner" | "intermediate" | "advanced"
  provisional: boolean
  games: number
  wins: number
  losses: number
  draws: number
}

export type Room = {
  white: string
  black: string | null
  whiteName: string
  blackName: string | null
  whiteRating: number
  blackRating: number | null
  targetMin: number
  targetMax: number
  status: "waiting" | "playing" | "finished"
  createdAt: number
  initialFen: string
  state?: {
    fen: string
    ply: number
    turn: "w" | "b"
    result: "" | "1-0" | "0-1" | "1/2-1/2"
    lastMove?: { from: string; to: string; san: string; uid: string; ply: number }
  }
  messages?: Record<string, { uid: string; name: string; text: string; createdAt: number }>
}

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ""
const DB_URL = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/$/, "")
const TOKEN_KEY = "knightly.firebase.token"
const REFRESH_KEY = "knightly.firebase.refresh"
const UID_KEY = "knightly.firebase.uid"

function configured() {
  return Boolean(API_KEY && DB_URL)
}

async function authRequest(path: string, body: object) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || "Firebase authentication failed")
  return json
}

async function refreshToken(refreshToken: string) {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error("Firebase session expired")
  localStorage.setItem(TOKEN_KEY, json.id_token)
  localStorage.setItem(UID_KEY, json.user_id)
  return { token: json.id_token as string, uid: json.user_id as string }
}

export async function ensureAuth() {
  if (typeof window === "undefined") throw new Error("Online chess is browser-only")
  if (!configured()) throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables.")

  const token = localStorage.getItem(TOKEN_KEY)
  const refresh = localStorage.getItem(REFRESH_KEY)
  const uid = localStorage.getItem(UID_KEY)
  if (token && refresh && uid) {
    try {
      const refreshed = await refreshToken(refresh)
      return refreshed
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(UID_KEY)
    }
  }

  const json = await authRequest("signUp", { returnSecureToken: true })
  localStorage.setItem(TOKEN_KEY, json.idToken)
  localStorage.setItem(REFRESH_KEY, json.refreshToken)
  localStorage.setItem(UID_KEY, json.localId)
  return { token: json.idToken as string, uid: json.localId as string }
}

async function db(path: string, init: RequestInit = {}) {
  const { token } = await ensureAuth()
  const url = `${DB_URL}/${path.replace(/^\//, "")}.json?auth=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Database request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  return db(`users/${uid}`)
}

export async function saveProfile(uid: string, profile: UserProfile) {
  return db(`users/${uid}`, { method: "PUT", body: JSON.stringify(profile) })
}

export async function createRoom(room: Omit<Room, "black" | "blackName" | "blackRating" | "status" | "state" | "messages">) {
  const pushed = await db("rooms", { method: "POST", body: JSON.stringify({
    ...room,
    black: null,
    blackName: null,
    blackRating: null,
    status: "waiting",
    state: { fen: room.initialFen, ply: 0, turn: "w", result: "" },
  }) })
  return pushed.name as string
}

export async function findWaitingRooms(rating: number) {
  const { token } = await ensureAuth()
  const min = Math.max(100, rating - 300)
  const max = rating + 300
  const q = `orderBy="status"&equalTo="waiting"&limitToLast=50`
  const res = await fetch(`${DB_URL}/rooms.json?${q}&auth=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error("Could not search for opponents")
  const rooms = (await res.json() || {}) as Record<string, Room>
  return Object.entries(rooms)
    .filter(([, r]) => r.black === null && r.targetMin <= rating && r.targetMax >= rating && r.whiteRating >= min && r.whiteRating <= max)
    .sort((a, b) => Math.abs(a[1].whiteRating - rating) - Math.abs(b[1].whiteRating - rating))
}

export async function joinRoom(roomId: string, uid: string, name: string, rating: number) {
  return db(`rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ black: uid, blackName: name, blackRating: rating, status: "playing" }),
  })
}

export async function postMove(roomId: string, move: { from: string; to: string; promotion?: string; ply: number; uid: string }) {
  return db(`rooms/${roomId}/proposals`, { method: "POST", body: JSON.stringify({ ...move, createdAt: { ".sv": "timestamp" } }) })
}

export async function postResign(roomId: string, uid: string) {
  return db(`rooms/${roomId}/resignations/${uid}`, { method: "PUT", body: JSON.stringify({ createdAt: { ".sv": "timestamp" } }) })
}

export async function postChat(roomId: string, uid: string, name: string, text: string) {
  return db(`rooms/${roomId}/messages`, { method: "POST", body: JSON.stringify({ uid, name, text: text.slice(0, 300), createdAt: { ".sv": "timestamp" } }) })
}

export function streamRoom(roomId: string, onChange: (room: Room) => void) {
  if (typeof window === "undefined") return () => {}
  let source: EventSource | null = null
  let stopped = false

  ensureAuth().then(({ token }) => {
    if (stopped) return
    source = new EventSource(`${DB_URL}/rooms/${roomId}.json?auth=${encodeURIComponent(token)}`)
    const apply = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.data !== undefined) {
          // Firebase sends paths relative to the streamed location.
          onChange((payload.path === "/" ? payload.data : undefined) as Room)
        }
      } catch {}
    }
    source.addEventListener("put", apply)
    source.addEventListener("patch", apply)
  }).catch(() => {})

  return () => {
    stopped = true
    source?.close()
  }
}

export async function loadRoom(roomId: string) {
  return db(`rooms/${roomId}`) as Promise<Room>
}
