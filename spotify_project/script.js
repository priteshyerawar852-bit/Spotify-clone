(() => {
  "use strict";

  const audio = new Audio();
  audio.preload = "metadata";

  let songs = [];
  let currentIndex = -1;
  let isSeeking = false;

  const songList = document.querySelector(".songList ul");
  const songInfo = document.querySelector(".songinfo");
  const songTime = document.querySelector(".songtime");
  const playPauseButton = document.querySelector("#playPause");
  const seekbar = document.querySelector(".seekbar");
  const seekProgress = document.querySelector(".seek-progress");
  const seekCircle = document.querySelector(".circle");
  const previousButton = document.querySelector("#previousSong");
  const nextButton = document.querySelector("#nextSong");

  const assetUrl = (path) => new URL(path, document.baseURI).href;

  function decodeSongName(value) {
    const raw = String(value || "").split("/").pop() || "Unknown song";
    let name;
    try { name = decodeURIComponent(raw); } catch { name = raw; }
    return name
      .replace(/\.(mp3|wav|ogg|m4a)$/i, "")
      .replace(/\s*\(MP3_\d+K\)/gi, "")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Unknown song";
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  async function getSongs() {
    // Read the manifest with a path relative to this index.html.
    const manifestUrl = assetUrl("songs.json");
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`songs.json request failed (${response.status})`);

    const names = await response.json();
    if (!Array.isArray(names)) throw new Error("songs.json must contain an array of filenames.");

    return names
      .filter(name => typeof name === "string" && /\.(mp3|wav|ogg|m4a)$/i.test(name))
      .map(name => ({
        name,
        url: assetUrl("songs/" + name.split("/").map(part => encodeURIComponent(part)).join("/"))
      }));
  }

  function renderSongs() {
    songList.replaceChildren();

    if (!songs.length) {
      const li = document.createElement("li");
      li.className = "empty-message";
      li.textContent = "No audio files found. Check songs.json and the songs folder.";
      songList.appendChild(li);
      return;
    }

    songs.forEach((song, index) => {
      const li = document.createElement("li");
      li.className = "song-item";
      li.dataset.index = String(index);

      const icon = document.createElement("img");
      icon.className = "invert song-icon";
      icon.src = assetUrl("music.svg");
      icon.alt = "Music";

      const info = document.createElement("div");
      info.className = "info";

      const title = document.createElement("div");
      title.className = "song-title";
      title.textContent = `${index + 1}. ${decodeSongName(song.name)}`;

      const artist = document.createElement("div");
      artist.textContent = "Local audio";

      info.append(title, artist);

      const playNow = document.createElement("button");
      playNow.className = "playnow";
      playNow.type = "button";
      playNow.setAttribute("aria-label", "Play song");
      playNow.innerHTML = '<span>Play</span><img class="invert" alt="" src="play.svg">';

      // Stop the row click from firing twice.
      playNow.addEventListener("click", event => {
        event.stopPropagation();
        playSong(index);
      });
      li.addEventListener("click", () => playSong(index));

      li.append(icon, info, playNow);
      songList.appendChild(li);
    });
  }

  function updatePlayButton() {
    const playing = !audio.paused && !audio.ended;
    const icon = playPauseButton.querySelector("img");
    if (icon) {
      icon.src = assetUrl(playing ? "pause.svg" : "play.svg");
      icon.alt = playing ? "Pause" : "Play";
    }
    playPauseButton.setAttribute("aria-label", playing ? "Pause" : "Play");

    document.querySelectorAll(".song-item").forEach((item, index) => {
      item.classList.toggle("active-song", index === currentIndex);
      const rowIcon = item.querySelector(".playnow img");
      const rowText = item.querySelector(".playnow span");
      const isCurrentPlaying = index === currentIndex && playing;
      if (rowIcon) rowIcon.src = assetUrl(isCurrentPlaying ? "pause.svg" : "play.svg");
      if (rowText) rowText.textContent = isCurrentPlaying ? "Pause" : "Play";
    });
  }

  async function playSong(index, autoplay = true) {
    if (!songs.length) return;
    currentIndex = ((index % songs.length) + songs.length) % songs.length;

    audio.src = songs[currentIndex].url;
    songInfo.textContent = decodeSongName(songs[currentIndex].name);
    songTime.textContent = "00:00 / 00:00";
    seekProgress.style.width = "0%";
    seekCircle.style.left = "0%";
    updatePlayButton();

    if (autoplay) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Playback failed. Check that the file exists in songs/:", error);
        songInfo.textContent = `${decodeSongName(songs[currentIndex].name)} — press Play`;
      }
    }
    updatePlayButton();
  }

  async function togglePlayPause() {
    if (!songs.length) {
      songInfo.textContent = "No songs found. Check songs.json.";
      return;
    }
    if (currentIndex === -1) {
      await playSong(0);
    } else if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Playback failed:", error);
        songInfo.textContent = "Unable to play this file. Check the songs folder.";
      }
    } else {
      audio.pause();
    }
    updatePlayButton();
  }

  playPauseButton.addEventListener("click", togglePlayPause);

  previousButton.addEventListener("click", () => {
    if (!songs.length) return;
    if (currentIndex !== -1 && audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      playSong(currentIndex <= 0 ? songs.length - 1 : currentIndex - 1);
    }
  });

  nextButton.addEventListener("click", () => {
    if (songs.length) playSong(currentIndex < 0 ? 0 : (currentIndex + 1) % songs.length);
  });

  audio.addEventListener("play", updatePlayButton);
  audio.addEventListener("pause", updatePlayButton);
  audio.addEventListener("ended", () => {
    if (songs.length) playSong((currentIndex + 1) % songs.length);
  });

  audio.addEventListener("loadedmetadata", () => {
    songTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  });

  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    if (!isSeeking) {
      seekProgress.style.width = `${percent}%`;
      seekCircle.style.left = `${percent}%`;
    }
    songTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  });

  audio.addEventListener("error", () => {
    if (currentIndex !== -1) {
      songInfo.textContent = `Could not load: ${decodeSongName(songs[currentIndex].name)}`;
      console.error("Audio load error:", audio.currentSrc, audio.error);
    }
  });

  function seekToPointer(event, commit = false) {
    const rect = seekbar.getBoundingClientRect();
    if (!rect.width || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    seekProgress.style.width = `${percent * 100}%`;
    seekCircle.style.left = `${percent * 100}%`;
    if (commit) audio.currentTime = percent * audio.duration;
  }

  seekbar.addEventListener("pointerdown", event => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    isSeeking = true;
    seekToPointer(event);
    if (seekbar.setPointerCapture) seekbar.setPointerCapture(event.pointerId);
  });
  seekbar.addEventListener("pointermove", event => {
    if (isSeeking) seekToPointer(event);
  });
  seekbar.addEventListener("pointerup", event => {
    if (isSeeking) seekToPointer(event, true);
    isSeeking = false;
  });
  seekbar.addEventListener("pointercancel", () => { isSeeking = false; });

  seekbar.addEventListener("keydown", event => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 5 : -5;
      audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + step));
    }
  });

  document.querySelectorAll(".card").forEach((card, index) => {
    card.addEventListener("click", () => {
      if (songs.length) playSong(index % songs.length);
    });
  });

  async function main() {
    try {
      songs = await getSongs();
      renderSongs();

      if (songs.length) {
        songInfo.textContent = "Select a song to start listening";
        document.querySelectorAll(".card").forEach((card, index) => {
          const title = card.querySelector("h2");
          const artist = card.querySelector("p");
          if (title) title.textContent = decodeSongName(songs[index % songs.length].name);
          if (artist) artist.textContent = "From your songs folder";
        });
      } else {
        songInfo.textContent = "No songs found";
      }
    } catch (error) {
      console.error(error);
      songList.replaceChildren();
      const li = document.createElement("li");
      li.className = "empty-message";
      li.textContent = "Songs load nahi hue. Run the server from the folder containing index.html.";
      songList.appendChild(li);
      songInfo.textContent = "Could not load songs.json";
    }
  }

  main();
})();
