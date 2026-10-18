SPOTIFY CLONE — FINAL LOCAL PROJECT

Run locally:
1. Extract this ZIP.
2. Open the extracted spotify_project folder in VS Code (the folder that directly contains index.html).
3. Open Terminal > New Terminal.
4. Run:
   npx http-server . -p 3000
5. Open:
   http://127.0.0.1:3000

IMPORTANT:
- Run the server from the folder containing index.html, NOT from the songs folder.
- Do not double-click index.html; use the local server.
- songs.json contains the list of audio filenames. Each filename must exactly match a file in the songs folder.
- The player uses relative URLs, so it also works if the folder is served under a path such as /spotify_project/.
- Play/pause, previous/next, song list, playlist cards, and seek bar are wired up.
- Sign Up/Login are visual demo buttons; they do not create accounts.
- This is a learning project, not an official Spotify product.
