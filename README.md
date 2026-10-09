# Knightly Chess

![screenshot](images/screenshot.png)

[**Knightly Chess**](/) is a free, open-source chess platform for game analysis, online play, and engine-powered improvement.



## Engine Lab

Knightly includes an **Engine Lab** at `/engine-lab` powered by the Stockfish Chess Web GUI project. It provides a full chessboard, engine play, adjustable strength, position import, and analysis tools. The original GUI is retained under `stockfish-gui/` and licensed under AGPL-3.0; Stockfish remains under its own GPL license. The GitHub Pages workflow fetches the upstream Stockfish 19 WebAssembly and opening-book assets during deployment, then bundles the GUI into the static site.

## Self Hosting

1. Clone the repository:

```
git clone https://github.com/wdeloo/Brilliant-Chess.git
cd Brilliant-Chess
```

2. Create a `.env` file:

```
echo "NEXT_PUBLIC_BASE_PATH=" > .env
```

3. Install dependencies and build the project:

```
npm install
npm run build
```

4. Start the server:

```
npm run start
```


# Knightly Online Chess — Firebase setup

The existing analyzer remains client-side and keeps using the bundled Stockfish WebAssembly engine. The new /play area adds onboarding, provisional ELO, matchmaking, human games, chat and local Stockfish play.

## 1. Create Firebase services

Create a Firebase project and enable:
- Authentication -> Anonymous
- Realtime Database
- Cloud Functions

Anonymous auth lets a new player enter the lobby without a separate account. You can later link that account to a permanent provider.

## 2. Configure the web app

Set these deployment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-url
```

The Firebase Web API key is a browser identifier, not a service-account secret. Never put a Firebase service-account private key in frontend code.

## 3. Deploy rules and referee

After selecting your Firebase project:

```
firebase use YOUR_PROJECT_ID
firebase deploy --only database,functions
```

The database rules prevent normal clients from editing their own ELO/stat totals after profile creation. Online moves are submitted as proposals; the Cloud Function validates them with chess.js, updates the authoritative FEN/turn/result, and applies ELO after a finished game.

## 4. Build the website

```
npm ci
npm run build
```

Deploy the generated static site as you already do.

## Online features

- Beginner / intermediate / advanced onboarding
- Five chess knowledge questions
- Provisional starting ELO
- ELO-near matchmaking
- Server-refereed legal moves
- Automatic win/loss/draw detection
- Server-side ELO updates after rated games
- In-game opponent chat
- Local Stockfish opponent with strength limited around the player's rating
- Existing PGN/FEN/Chess.com/Lichess analysis remains available on the main page

The referee is separate from the static Next.js frontend because a browser-only client must not be trusted to award its own rating.
