// Spotify Integration Module

// State management
let spotifyState = {
  isConnected: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  userName: null,
};

// Music player state
let currentAudio = null;
let currentPlayingRow = null;
let currentTrack = null;
let allTracks = [];
let currentTrackIndex = -1;
let spotifyPlayer = null;
let deviceId = null;
let isSpotifySDKReady = false;

// Define the Spotify SDK callback function globally
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log("Spotify Web Playback SDK is ready");
  if (spotifyState.accessToken) {
    initializeSpotifyPlayer();
  }
};

const clientId = "10d85455cc3e4867adaa99146642e31f";
const redirectUri = window.location.origin + window.location.pathname;
const scopes =
  "user-read-private user-read-recently-played user-top-read streaming user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-read-email";

function generateCodeVerifier(length = 128) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  return result;
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function updateSpotifyButton() {
  const btn = document.getElementById("connectSpotifyBtn");
  if (btn) {
    if (spotifyState.isConnected && spotifyState.userName) {
      btn.textContent = `Connected as ${spotifyState.userName}`;
      btn.classList.add("button-connected");
      btn.disabled = false;
    } else {
      btn.textContent = "Connect Spotify";
      btn.classList.remove("button-connected");
      btn.disabled = false;
    }
  }
}

// Now Playing Card Functions
function updateNowPlayingCard(track, isPlaying = false) {
  const nowPlayingCard = document.getElementById("nowPlayingCard");
  const nowPlayingArt = document.getElementById("nowPlayingArt");
  const nowPlayingTrack = document.getElementById("nowPlayingTrack");
  const nowPlayingArtist = document.getElementById("nowPlayingArtist");
  const globalPlayBtn = document.getElementById("globalPlayBtn");

  if (!track) {
    // Reset to default inactive state - only change colors and content
    nowPlayingCard.classList.remove("active");
    nowPlayingCard.classList.add("inactive");
    nowPlayingTrack.textContent = "Ready to Play";
    nowPlayingArtist.textContent = "Select a song from below";
    nowPlayingArt.innerHTML = "🎵";
    if (globalPlayBtn) globalPlayBtn.textContent = "▶";
    return;
  }

  // Active state with track playing - only change colors and content
  nowPlayingCard.classList.remove("inactive");
  nowPlayingCard.classList.add("active");
  nowPlayingTrack.textContent = track.name || "Unknown Track";
  nowPlayingArtist.textContent =
    track.artists?.[0]?.name || track.artist || "Unknown Artist";
  if (globalPlayBtn) globalPlayBtn.textContent = isPlaying ? "⏸" : "▶";

  // Update album art - maintain consistent size
  const albumImage = track.album?.images?.[0]?.url || track.images?.[0]?.url;
  if (albumImage) {
    nowPlayingArt.innerHTML = `<img src="${albumImage}" alt="${track.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
  } else {
    nowPlayingArt.innerHTML = "🎵";
  }
}

async function toggleGlobalPlay() {
  try {
    if (spotifyPlayer && isSpotifySDKReady) {
      const state = await spotifyPlayer.getCurrentState();

      if (state) {
        // There's a current track - toggle play/pause
        if (state.paused) {
          await spotifyPlayer.resume();
          console.log("Resumed playback");
        } else {
          await spotifyPlayer.pause();
          console.log("Paused playback");
        }
      } else {
        // No current track - start playing the first track
        if (allTracks.length > 0) {
          console.log("Starting playback. Available tracks:", allTracks.length);
          const firstTrack = allTracks[0];
          const firstSongRow = findSongRowForTrack(firstTrack);
          const trackUri = firstTrack.uri || `spotify:track:${firstTrack.id}`;

          if (firstSongRow && trackUri) {
            console.log("Playing first track:", firstTrack.name);
            playSpotifyTrack(
              trackUri,
              firstTrack.name,
              firstTrack.artists?.[0]?.name || firstTrack.artist,
              firstSongRow
            );
          }
        }
      }
    } else {
      // Fallback to preview system
      if (!currentAudio) {
        if (allTracks.length > 0) {
          console.log(
            "Starting preview playback. Available tracks:",
            allTracks.length
          );
          const firstTrack = allTracks[0];
          const firstSongRow = findSongRowForTrack(firstTrack);
          if (firstSongRow && firstTrack.preview_url) {
            console.log("Playing first track preview:", firstTrack.name);
            playPreviewFallback(
              firstTrack.preview_url,
              firstTrack.name,
              firstTrack.artists?.[0]?.name || firstTrack.artist,
              firstSongRow
            );
          }
        }
        return;
      }

      if (currentAudio.paused) {
        currentAudio.play();
        updatePlayButtonStates(true);
      } else {
        currentAudio.pause();
        updatePlayButtonStates(false);
      }
    }
  } catch (error) {
    console.error("Error toggling playback:", error);
    showStatus("Playback control error", "error");
  }
}

async function playNext() {
  if (allTracks.length === 0) return;

  let nextIndex = currentTrackIndex + 1;
  if (nextIndex >= allTracks.length) {
    nextIndex = 0; // Loop back to start
  }

  const nextTrack = allTracks[nextIndex];
  if (nextTrack) {
    // Try to find the song row, but don't require it for playback
    const matchingSongRow = findSongRowForTrack(nextTrack);
    const trackUri = nextTrack.uri || `spotify:track:${nextTrack.id}`;

    if (trackUri && nextTrack.id && isSpotifySDKReady) {
      // Play without requiring a DOM element
      playSpotifyTrack(
        trackUri,
        nextTrack.name,
        nextTrack.artists?.[0]?.name || nextTrack.artist,
        matchingSongRow // Can be null if playlist is minimized
      );
    } else if (nextTrack.preview_url) {
      playPreviewFallback(
        nextTrack.preview_url,
        nextTrack.name,
        nextTrack.artists?.[0]?.name || nextTrack.artist,
        matchingSongRow // Can be null if playlist is minimized
      );
    }
  }
}

async function playPrevious() {
  if (allTracks.length === 0) return;

  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    prevIndex = allTracks.length - 1; // Loop to end
  }

  const prevTrack = allTracks[prevIndex];
  if (prevTrack) {
    // Try to find the song row, but don't require it for playback
    const matchingSongRow = findSongRowForTrack(prevTrack);
    const trackUri = prevTrack.uri || `spotify:track:${prevTrack.id}`;

    if (trackUri && prevTrack.id && isSpotifySDKReady) {
      // Play without requiring a DOM element
      playSpotifyTrack(
        trackUri,
        prevTrack.name,
        prevTrack.artists?.[0]?.name || prevTrack.artist,
        matchingSongRow // Can be null if playlist is minimized
      );
    } else if (prevTrack.preview_url) {
      playPreviewFallback(
        prevTrack.preview_url,
        prevTrack.name,
        prevTrack.artists?.[0]?.name || prevTrack.artist,
        matchingSongRow // Can be null if playlist is minimized
      );
    }
  }
}

// Helper function to find a song row that matches a track
function findSongRowForTrack(track) {
  const allSongRows = document.querySelectorAll(".song-row");
  const trackName = track.name;
  const artistName = track.artists?.[0]?.name || track.artist;

  for (let row of allSongRows) {
    const rowTrackName = row.querySelector(".track-name")?.textContent;
    const rowArtistName = row.querySelector(".artist-name")?.textContent;

    if (rowTrackName === trackName && rowArtistName === artistName) {
      return row;
    }
  }
  return null;
}

async function initializeSpotifyPlayer() {
  if (spotifyPlayer) {
    console.log("Spotify player already initialized");
    return;
  }

  try {
    console.log("Initializing Spotify Web Player...");

    const player = new Spotify.Player({
      name: "Bean's Cozy Hub Player",
      getOAuthToken: (cb) => {
        console.log("Getting OAuth token for player");
        cb(spotifyState.accessToken);
      },
      volume: 0.8,
    });

    // Error handling
    player.addListener("initialization_error", ({ message }) => {
      console.error("Spotify Player initialization error:", message);
      showStatus("Failed to initialize Spotify player: " + message, "error");
    });

    player.addListener("authentication_error", ({ message }) => {
      console.error("Spotify Player authentication error:", message);
      showStatus("Spotify authentication error: " + message, "error");
    });

    player.addListener("account_error", ({ message }) => {
      console.error("Spotify Player account error:", message);
      showStatus("Spotify Premium required for full playback", "error");
    });

    player.addListener("playback_error", ({ message }) => {
      console.error("Spotify Player playback error:", message);
      showStatus("Playback error: " + message, "error");
    });

    // Ready
    player.addListener("ready", ({ device_id }) => {
      console.log("Spotify Player ready with Device ID:", device_id);
      deviceId = device_id;
      isSpotifySDKReady = true;
      showStatus(
        "Spotify player ready! You can now play full songs.",
        "success"
      );
    });

    // Not Ready
    player.addListener("not_ready", ({ device_id }) => {
      console.log("Spotify Player device has gone offline:", device_id);
      isSpotifySDKReady = false;
    });

    // Player state changes
    player.addListener("player_state_changed", (state) => {
      if (!state) return;

      console.log("Player state changed:", state);

      const track = state.track_window.current_track;
      const isPlaying = !state.paused;

      if (track) {
        // Update current track info
        currentTrack = {
          name: track.name,
          artists: track.artists,
          album: { images: [{ url: track.album.images[0]?.url }] },
          id: track.id,
          uri: track.uri,
        };

        // Update UI
        updateNowPlayingCard(currentTrack, isPlaying);
        updatePlayButtonStates(isPlaying);

        // Find and highlight the current playing row
        const songRow = findSongRowForTrack(currentTrack);
        if (songRow) {
          // Remove playing state from all rows
          document.querySelectorAll(".song-row").forEach((row) => {
            row.classList.remove("playing");
            const playBtn = row.querySelector(".play-btn");
            if (playBtn) playBtn.textContent = "▶";
          });

          // Add playing state to current row
          if (isPlaying) {
            songRow.classList.add("playing");
            const playBtn = songRow.querySelector(".play-btn");
            if (playBtn) playBtn.textContent = "⏸";
          }

          currentPlayingRow = songRow;
        }
      }
    });

    // Connect to the player!
    const connected = await player.connect();
    if (connected) {
      console.log("Successfully connected to Spotify Player");
      spotifyPlayer = player;
    } else {
      console.error("Failed to connect to Spotify Player");
      showStatus("Failed to connect to Spotify player", "error");
    }
  } catch (error) {
    console.error("Error initializing Spotify player:", error);
    showStatus("Error setting up Spotify player: " + error.message, "error");
  }
}

function updatePlayButtonStates(isPlaying) {
  const globalPlayBtn = document.getElementById("globalPlayBtn");
  if (globalPlayBtn) {
    globalPlayBtn.textContent = isPlaying ? "⏸" : "▶";
  }
}

async function playSpotifyTrack(trackUri, trackName, artistName, songRow) {
  if (!isSpotifySDKReady || !deviceId) {
    console.log("Spotify SDK not ready, falling back to preview");
    playPreviewFallback(trackUri, trackName, artistName, songRow);
    return;
  }

  try {
    // Find track in allTracks array and update currentTrack
    const trackData = allTracks.find(
      (t) =>
        t.name === trackName &&
        (t.artists?.[0]?.name || t.artist) === artistName
    );
    currentTrackIndex = trackData ? allTracks.indexOf(trackData) : -1;

    // Check if clicking the same song that's playing (only if songRow exists)
    if (songRow && currentPlayingRow === songRow && spotifyPlayer) {
      const state = await spotifyPlayer.getCurrentState();
      if (state && !state.paused) {
        // Pause the current track
        await spotifyPlayer.pause();
        return;
      } else if (state && state.paused) {
        // Resume the current track
        await spotifyPlayer.resume();
        return;
      }
    }

    console.log("Playing Spotify track:", trackName, "by", artistName);
    console.log("Track URI:", trackUri);

    // Play the track using Spotify Web API
    const playResponse = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + spotifyState.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      }
    );

    if (playResponse.ok || playResponse.status === 204) {
      console.log("Successfully started playback");
      showStatus(`Playing: ${trackName}`, "success");

      // Update UI immediately (the player state listener will also update it)
      currentPlayingRow = songRow;

      // Remove playing state from all other rows
      document.querySelectorAll(".song-row").forEach((row) => {
        if (row !== songRow) {
          row.classList.remove("playing");
          const playBtn = row.querySelector(".play-btn");
          if (playBtn) playBtn.textContent = "▶";
        }
      });

      // Add playing state to current row (only if songRow exists)
      if (songRow) {
        songRow.classList.add("playing");
        const playBtn = songRow.querySelector(".play-btn");
        if (playBtn) playBtn.textContent = "⏸";
      }
    } else {
      const errorData = await playResponse.text();
      console.error("Playback failed:", playResponse.status, errorData);

      if (playResponse.status === 404) {
        showStatus("Device not found. Please refresh and try again.", "error");
      } else if (playResponse.status === 403) {
        showStatus("Spotify Premium required for full playback", "error");
      } else {
        showStatus("Playback failed. Trying preview instead.", "error");
        // Fallback to preview
        const track = allTracks.find((t) => t.name === trackName);
        if (track && track.preview_url) {
          playPreviewFallback(
            track.preview_url,
            trackName,
            artistName,
            songRow
          );
        }
      }
    }
  } catch (error) {
    console.error("Error playing Spotify track:", error);
    showStatus("Playback error. Trying preview instead.", "error");

    // Fallback to preview
    const track = allTracks.find((t) => t.name === trackName);
    if (track && track.preview_url) {
      playPreviewFallback(track.preview_url, trackName, artistName, songRow);
    }
  }
}

function playPreviewFallback(previewUrl, trackName, artistName, songRow) {
  // Stop current audio if playing
  if (currentAudio) {
    currentAudio.pause();
    if (currentPlayingRow) {
      currentPlayingRow.classList.remove("playing");
      const playBtn = currentPlayingRow.querySelector(".play-btn");
      if (playBtn) playBtn.textContent = "▶";
    }
  }

  if (!previewUrl) {
    showStatus("No preview available for this track", "info");
    return;
  }

  // If clicking the same song that's playing, just stop (only if songRow exists)
  if (
    songRow &&
    currentPlayingRow === songRow &&
    currentAudio &&
    !currentAudio.paused
  ) {
    currentAudio.pause();
    songRow.classList.remove("playing");
    const playBtn = songRow.querySelector(".play-btn");
    if (playBtn) playBtn.textContent = "▶";
    currentPlayingRow = null;
    currentAudio = null;
    currentTrack = null;
    updateNowPlayingCard(null);
    return;
  }

  // Create and play new audio
  currentAudio = new Audio(previewUrl);
  currentPlayingRow = songRow;

  // Find track in allTracks array and update currentTrack
  const trackData = allTracks.find(
    (t) =>
      t.name === trackName && (t.artists?.[0]?.name || t.artist) === artistName
  );
  currentTrack = trackData || {
    name: trackName,
    artist: artistName,
    artists: [{ name: artistName }],
    preview_url: previewUrl,
  };
  currentTrackIndex = trackData ? allTracks.indexOf(trackData) : -1;

  // Add playing state only if songRow exists
  if (songRow) {
    songRow.classList.add("playing");
    const playBtn = songRow.querySelector(".play-btn");
    if (playBtn) playBtn.textContent = "⏸";
  }

  // Update now playing card
  updateNowPlayingCard(currentTrack, true);

  currentAudio.play().catch((error) => {
    console.error("Playback failed:", error);
    showStatus("Playback failed. Try again!", "error");
    if (songRow) {
      songRow.classList.remove("playing");
      const playBtn = songRow.querySelector(".play-btn");
      if (playBtn) playBtn.textContent = "▶";
    }
    updateNowPlayingCard(null);
  });

  currentAudio.onended = () => {
    if (songRow) {
      songRow.classList.remove("playing");
      const playBtn = songRow.querySelector(".play-btn");
      if (playBtn) playBtn.textContent = "▶";
    }
    currentPlayingRow = null;
    currentAudio = null;
    updateNowPlayingCard(null);
    playNext();
  };
}

function createSongRow(track, container) {
  const div = document.createElement("div");
  div.className = "song-row";

  const previewUrl = track.preview_url;
  const hasPreview = !!previewUrl;

  // Use smaller images for faster loading
  const imageUrl =
    track.album?.images?.[2]?.url || // Small (64x64)
    track.album?.images?.[1]?.url || // Medium (300x300)
    track.album?.images?.[0]?.url || // Large (640x640)
    track.images?.[0]?.url ||
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23ddd"/><text x="20" y="24" text-anchor="middle" font-size="12" fill="%23999">♪</text></svg>';

  div.innerHTML = `
      <img src="${imageUrl}" alt="${track.name}" loading="lazy">
      <div class="song-info">
        <p class="track-name">${track.name}</p>
        <p class="artist-name">${
          track.artists?.[0]?.name || track.artist || "Unknown Artist"
        }</p>
      </div>
      <div class="play-controls">
        ${hasPreview ? '<button class="play-btn">▶</button>' : ""}
        <a href="https://open.spotify.com/track/${
          track.id || ""
        }" target="_blank" class="spotify-link" onclick="event.stopPropagation()">🎵</a>
      </div>
    `;

  // Make the entire song row clickable (except for the Spotify link)
  div.addEventListener("click", (e) => {
    // Don't trigger if clicking the Spotify link
    if (e.target.classList.contains("spotify-link")) {
      return;
    }

    const trackUri = track.uri || `spotify:track:${track.id}`;
    console.log(
      "Playing track:",
      track.name,
      "by",
      track.artists?.[0]?.name || track.artist
    );

    if (trackUri && track.id) {
      playSpotifyTrack(
        trackUri,
        track.name,
        track.artists?.[0]?.name || track.artist,
        div
      );
    } else if (hasPreview) {
      playPreviewFallback(
        previewUrl,
        track.name,
        track.artists?.[0]?.name || track.artist,
        div
      );
    } else {
      showStatus("Track not available for playback", "info");
    }
  });

  // Still add the play button functionality for explicit play button clicks
  if (hasPreview) {
    const playBtn = div.querySelector(".play-btn");
    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("Play button clicked for:", track.name);

        const trackUri = track.uri || `spotify:track:${track.id}`;
        if (trackUri && track.id) {
          playSpotifyTrack(
            trackUri,
            track.name,
            track.artists?.[0]?.name || track.artist,
            div
          );
        } else if (previewUrl) {
          playPreviewFallback(
            previewUrl,
            track.name,
            track.artists?.[0]?.name || track.artist,
            div
          );
        }
      });
    }
  }

  return div;
}

async function fetchUserPlaylists() {
  try {
    const playlistsRes = await fetch(
      "https://api.spotify.com/v1/me/playlists?limit=15", // Reduced for faster loading
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (playlistsRes.ok) {
      const playlistsData = await playlistsRes.json();
      const playlists = playlistsData.items || [];

      const playlistGrid = document.getElementById("playlistGrid");
      if (playlistGrid) {
        playlistGrid.innerHTML = "";

        if (playlists.length > 0) {
          playlists.forEach((playlist) => {
            const playlistItem = document.createElement("div");
            playlistItem.className = "playlist-item";

            // Use smaller playlist images for faster loading
            const playlistImageUrl =
              playlist.images && playlist.images.length > 0
                ? playlist.images[playlist.images.length - 1]?.url ||
                  playlist.images[0].url // Use smallest available
                : null;

            playlistItem.innerHTML = `
                <div class="playlist-art">
                  ${
                    playlistImageUrl
                      ? `<img src="${playlistImageUrl}" alt="${playlist.name}" loading="lazy">`
                      : "📋"
                  }
                </div>
                <div class="playlist-info">
                  <div class="playlist-name">${playlist.name}</div>
                  <div class="playlist-count">${
                    playlist.tracks.total
                  } tracks</div>
                </div>
              `;

            playlistItem.addEventListener("click", () => {
              const playlistSongs = document.getElementById("playlistSongs");
              const isCurrentlySelected =
                playlistItem.classList.contains("selected");

              // Remove selection from all playlists
              document.querySelectorAll(".playlist-item").forEach((item) => {
                item.classList.remove("selected");
              });

              if (isCurrentlySelected) {
                // If clicking the same playlist, minimize it
                if (playlistSongs) {
                  playlistSongs.innerHTML = "";
                  playlistSongs.style.display = "none";
                }
              } else {
                // If clicking a different playlist, show it
                playlistItem.classList.add("selected");
                if (playlistSongs) {
                  playlistSongs.style.display = "flex";
                }
                fetchPlaylistTracks(playlist.id, playlist.name);
              }
            });

            playlistGrid.appendChild(playlistItem);
          });
        } else {
          playlistGrid.innerHTML =
            '<p style="text-align: center; color: #666; font-size: 0.8rem;">No playlists found</p>';
        }
      }
    }
  } catch (error) {
    console.error("Playlists error:", error);
    const playlistGrid = document.getElementById("playlistGrid");
    if (playlistGrid) {
      playlistGrid.innerHTML =
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">Unable to load playlists</p>';
    }
  }
}

async function fetchPlaylistTracks(playlistId, playlistName) {
  const playlistSongs = document.getElementById("playlistSongs");

  // Show loading state immediately
  if (playlistSongs) {
    showSkeletonLoading("playlistSongs");
  }

  try {
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=15`, // Reduced for faster loading
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (tracksRes.ok) {
      const tracksData = await tracksRes.json();
      const tracks =
        tracksData.items
          ?.map((item) => item.track)
          .filter((track) => track && track.id) || [];

      if (playlistSongs) {
        playlistSongs.innerHTML = "";

        if (tracks.length > 0) {
          // Add playlist tracks to allTracks array for global controls
          allTracks = [...allTracks, ...tracks];

          // Use document fragment for better performance
          const fragment = document.createDocumentFragment();
          tracks.forEach((track) => {
            const songRow = createSongRow(track, playlistSongs);
            fragment.appendChild(songRow);
          });
          playlistSongs.appendChild(fragment);
        } else {
          playlistSongs.innerHTML =
            '<p style="text-align: center; color: #666; font-size: 0.8rem;">No tracks in this playlist</p>';
        }
      }
    }
  } catch (error) {
    console.error("Playlist tracks error:", error);
    const playlistSongs = document.getElementById("playlistSongs");
    if (playlistSongs) {
      playlistSongs.innerHTML =
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">Unable to load tracks</p>';
    }
  }
}

async function loginSpotify() {
  console.log("loginSpotify called");
  try {
    console.log("clientId:", clientId);
    console.log("redirectUri:", redirectUri);
    console.log("scopes:", scopes);

    showStatus("Connecting to Spotify...", "info");
    const btn = document.getElementById("connectSpotifyBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner"></div>Connecting...';
    }

    console.log("Generating code verifier...");
    const verifier = generateCodeVerifier();
    console.log("Code verifier generated, length:", verifier.length);
    sessionStorage.setItem("spotify_verifier", verifier);

    console.log("Generating code challenge...");
    const challenge = await generateCodeChallenge(verifier);
    console.log("Code challenge generated:", challenge);

    const url =
      `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge_method=S256&code_challenge=${challenge}`;

    console.log("Full Spotify URL:", url);
    console.log("About to redirect to Spotify...");

    // Try using window.location.href instead
    window.location.href = url;
  } catch (error) {
    console.error("Login error:", error);
    console.error("Login error stack:", error.stack);
    showStatus("Failed to connect to Spotify. Please try again.", "error");
    updateSpotifyButton();
  }
}

async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    showStatus("Spotify connection was cancelled.", "error");
    window.history.replaceState({}, document.title, redirectUri);
    return;
  }

  if (!code) return;

  try {
    showStatus("Completing Spotify connection...", "info");
    const verifier = sessionStorage.getItem("spotify_verifier");

    if (!verifier) {
      throw new Error("Missing verification code");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    });

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        `Token request failed: ${res.status} - ${
          errorData.error_description || errorData.error
        }`
      );
    }

    const data = await res.json();
    const expiresAt = Date.now() + data.expires_in * 1000;

    spotifyState.accessToken = data.access_token;
    spotifyState.refreshToken = data.refresh_token;
    spotifyState.expiresAt = expiresAt;
    spotifyState.isConnected = true;

    sessionStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) {
      sessionStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    sessionStorage.setItem("spotify_expires_at", expiresAt.toString());

    // Get user info
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + data.access_token },
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      spotifyState.userName = userData.display_name || userData.id;
      sessionStorage.setItem("spotify_user_name", spotifyState.userName);
    }

    window.history.replaceState({}, document.title, redirectUri);
    showStatus(
      `Connected successfully! Welcome, ${spotifyState.userName || "Bean"}! 🎵`,
      "success"
    );
    updateSpotifyButton();
    await fetchRecommendedTracks();
    // Initialize Spotify player after successful authentication
    if (window.Spotify) {
      await initializeSpotifyPlayer();
    }
  } catch (error) {
    console.error("Callback error:", error);
    showStatus(
      `Failed to complete Spotify connection: ${error.message}`,
      "error"
    );
    window.history.replaceState({}, document.title, redirectUri);
  }
}

async function fetchRecommendedTracks() {
  if (!spotifyState.accessToken) {
    const songOfDay = document.getElementById("songOfDay");
    if (songOfDay) {
      songOfDay.textContent = "Click 'Connect Spotify' to see your music!";
    }
    return;
  }

  try {
    // Check if token expired
    if (Date.now() >= spotifyState.expiresAt) {
      showStatus("Spotify session expired. Please reconnect.", "error");
      clearStoredAuth();
      return;
    }

    // Show loading states immediately
    showSkeletonLoading("recentSongs");
    showSkeletonLoading("suggestedSongs");
    showLoadingState("playlistGrid", "Loading playlists...");
    showLoadingState("discoverySongs", "Finding new music...");

    // Fetch recent tracks
    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=10",
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (recentRes.status === 401) {
      showStatus("Spotify session expired. Please reconnect.", "error");
      clearStoredAuth();
      return;
    }

    if (recentRes.status === 403) {
      showStatus(
        "Account needs to be added to app allowlist. Ask your developer to add you!",
        "error"
      );
      showFallbackMusic();
      return;
    }

    let recentTracks = [];
    if (recentRes.ok) {
      const recentData = await recentRes.json();
      const allRecentTracks =
        recentData.items
          ?.map((item) => item.track)
          .filter((track) => track && track.id) || [];

      // Remove duplicates based on track ID
      const seenTrackIds = new Set();
      recentTracks = allRecentTracks.filter((track) => {
        if (seenTrackIds.has(track.id)) {
          return false; // Skip duplicate
        }
        seenTrackIds.add(track.id);
        return true; // Keep unique track
      });
    }

    // If no recently played, fallback to top tracks
    if (!recentTracks.length) {
      const topRes = await fetch(
        "https://api.spotify.com/v1/me/top/tracks?limit=10",
        {
          headers: {
            Authorization: "Bearer " + spotifyState.accessToken,
          },
        }
      );

      if (topRes.status === 403) {
        showStatus(
          "Account needs to be added to app allowlist. Ask your developer to add you!",
          "error"
        );
        showFallbackMusic();
        return;
      }

      if (topRes.ok) {
        const topData = await topRes.json();
        recentTracks =
          topData.items?.filter((track) => track && track.id) || [];
      }
    }

    // Display recent tracks
    const recentContainer = document.getElementById("recentSongs");
    if (recentContainer) {
      recentContainer.innerHTML = "";

      if (recentTracks.length > 0) {
        // Update allTracks array for global controls
        allTracks = [...recentTracks.slice(0, 10)];

        recentTracks.slice(0, 10).forEach((track, index) => {
          const songRow = createSongRow(track, recentContainer);
          recentContainer.appendChild(songRow);

          if (index === 0) {
            const songOfDay = document.getElementById("songOfDay");
            if (songOfDay) {
              songOfDay.textContent = `🎵 ${track.name} — ${track.artists[0]?.name}`;
            }
          }
        });
      } else {
        recentContainer.innerHTML =
          '<p style="text-align: center; color: #666; font-size: 0.8rem;">No recent tracks found</p>';
        allTracks = [];
        showFallbackMusic();
        return;
      }
    }

    // Fetch recommendations, discovery, and playlists in parallel for speed
    const [recommendationsResult, discoveryResult, playlistsResult] =
      await Promise.allSettled([
        fetchSpotifyRecommendations(recentTracks),
        fetchDiscoveryRecommendations(recentTracks),
        fetchUserPlaylists(),
      ]);

    // Log any failures but don't block the UI
    if (recommendationsResult.status === "rejected") {
      console.warn("Recommendations failed:", recommendationsResult.reason);
    }
    if (discoveryResult.status === "rejected") {
      console.warn("Discovery failed:", discoveryResult.reason);
    }
    if (playlistsResult.status === "rejected") {
      console.warn("Playlists failed:", playlistsResult.reason);
    }
  } catch (error) {
    console.error("Fetch tracks error:", error);
    showStatus("Failed to load your music. Check your connection.", "error");
    showFallbackMusic();
  }
}

async function fetchSpotifyRecommendations(seedTracks) {
  try {
    const suggestedContainer = document.getElementById("suggestedSongs");
    if (!suggestedContainer) return;

    if (!seedTracks.length) {
      suggestedContainer.innerHTML =
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">No recent tracks for suggestions</p>';
      return;
    }

    // Try the recommendations endpoint first
    const seedTrackIds = seedTracks
      .slice(0, 3)
      .map((track) => track.id)
      .join(",");

    const recRes = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackIds}&limit=10`,
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (recRes.ok) {
      const recData = await recRes.json();
      const suggestions =
        recData.tracks?.filter((track) => track && track.id) || [];

      if (suggestions.length > 0) {
        suggestedContainer.innerHTML = "";
        // Add suggestions to allTracks array
        allTracks = [...allTracks, ...suggestions];

        suggestions.forEach((track) => {
          const songRow = createSongRow(track, suggestedContainer);
          suggestedContainer.appendChild(songRow);
        });
        return;
      }
    }

    // Fallback: Use user's top tracks as "suggestions"
    console.log(
      "Recommendations API not available, falling back to top tracks"
    );
    const topRes = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term",
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (topRes.ok) {
      const topData = await topRes.json();
      const topTracks =
        topData.items?.filter((track) => track && track.id) || [];

      suggestedContainer.innerHTML = "";

      if (topTracks.length > 0) {
        // Filter out tracks that are already in recent tracks
        const recentTrackIds = seedTracks.map((t) => t.id);
        const filteredTracks = topTracks.filter(
          (track) => !recentTrackIds.includes(track.id)
        );

        if (filteredTracks.length > 0) {
          // Add to allTracks array
          allTracks = [...allTracks, ...filteredTracks.slice(0, 10)];

          filteredTracks.slice(0, 10).forEach((track) => {
            const songRow = createSongRow(track, suggestedContainer);
            suggestedContainer.appendChild(songRow);
          });
        } else {
          suggestedContainer.innerHTML =
            '<p style="text-align: center; color: #666; font-size: 0.8rem;">All your top tracks are already in recent!</p>';
        }
      } else {
        suggestedContainer.innerHTML =
          '<p style="text-align: center; color: #666; font-size: 0.8rem;">Play more music to see suggestions!</p>';
      }
    } else {
      suggestedContainer.innerHTML =
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">Suggestions unavailable</p>';
    }
  } catch (error) {
    console.error("Recommendations error:", error);
    const suggestedContainer = document.getElementById("suggestedSongs");
    if (suggestedContainer) {
      suggestedContainer.innerHTML =
        '<p style="text-align: center; color: #666; font-size: 0.8rem;">Unable to load suggestions</p>';
    }
  }
}

async function fetchDiscoveryRecommendations(seedTracks) {
  try {
    const discoveryContainer = document.getElementById("discoverySongs");
    const messagesContainer = document.getElementById("discoveryMessages");

    if (!discoveryContainer) return;

    if (!seedTracks.length) {
      if (messagesContainer) {
        messagesContainer.textContent =
          "Connect Spotify to discover new music based on your taste!";
        messagesContainer.style.display = "block";
      }
      discoveryContainer.innerHTML = "";
      return;
    }

    // Show loading message
    if (messagesContainer) {
      messagesContainer.textContent = "🎯 Finding new music just for you...";
      messagesContainer.style.display = "block";
    }

    // Get user's top artists for more diverse recommendations
    const topArtistsRes = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    let seedArtists = [];
    if (topArtistsRes.ok) {
      const artistsData = await topArtistsRes.json();
      seedArtists =
        artistsData.items?.slice(0, 2).map((artist) => artist.id) || [];
    }

    // Use different seed approach for discovery - mix of tracks and artists
    const seedTrackIds = seedTracks.slice(0, 2).map((track) => track.id);
    const seedParams = [];

    if (seedTrackIds.length > 0) {
      seedParams.push(`seed_tracks=${seedTrackIds.join(",")}`);
    }
    if (seedArtists.length > 0) {
      seedParams.push(`seed_artists=${seedArtists.join(",")}`);
    }

    // Add some discovery-focused audio features
    seedParams.push("min_popularity=20"); // Include less mainstream tracks
    seedParams.push("max_popularity=80"); // But not completely obscure
    seedParams.push("limit=12"); // Get a few extra to filter

    const discoveryRes = await fetch(
      `https://api.spotify.com/v1/recommendations?${seedParams.join("&")}`,
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (discoveryRes.ok) {
      const discoveryData = await discoveryRes.json();
      let discoveryTracks =
        discoveryData.tracks?.filter((track) => track && track.id) || [];

      // Filter out tracks already in recent tracks and suggestions
      const existingTrackIds = new Set(allTracks.map((t) => t.id));
      discoveryTracks = discoveryTracks.filter(
        (track) => !existingTrackIds.has(track.id)
      );

      if (discoveryTracks.length > 0) {
        discoveryContainer.innerHTML = "";
        if (messagesContainer) {
          messagesContainer.textContent = `🎯 Found ${discoveryTracks.length} fresh tracks for you!`;
        }

        // Add discovery tracks to allTracks array
        allTracks = [...allTracks, ...discoveryTracks.slice(0, 10)];

        discoveryTracks.slice(0, 10).forEach((track) => {
          const songRow = createSongRow(track, discoveryContainer);
          discoveryContainer.appendChild(songRow);
        });

        // Hide messages after showing tracks
        setTimeout(() => {
          if (messagesContainer) {
            messagesContainer.style.display = "none";
          }
        }, 3000);
        return;
      }
    }

    // Fallback 1: Try genre-based recommendations
    console.log("Trying genre-based discovery...");
    const genreRes = await fetch(
      "https://api.spotify.com/v1/recommendations/available-genre-seeds",
      { headers: { Authorization: "Bearer " + spotifyState.accessToken } }
    );

    if (genreRes.ok) {
      const genreData = await genreRes.json();
      const genres = genreData.genres || [];

      // Pick some popular but diverse genres
      const discoveryGenres = genres
        .filter((genre) =>
          [
            "indie-pop",
            "alternative",
            "indie-rock",
            "pop",
            "electronic",
            "chill",
          ].includes(genre)
        )
        .slice(0, 3);

      if (discoveryGenres.length > 0) {
        const genreBasedRes = await fetch(
          `https://api.spotify.com/v1/recommendations?seed_genres=${discoveryGenres.join(
            ","
          )}&min_popularity=30&max_popularity=85&limit=10`,
          {
            headers: {
              Authorization: "Bearer " + spotifyState.accessToken,
            },
          }
        );

        if (genreBasedRes.ok) {
          const genreData = await genreBasedRes.json();
          let genreTracks =
            genreData.tracks?.filter((track) => track && track.id) || [];

          // Filter out existing tracks
          const existingTrackIds = new Set(allTracks.map((t) => t.id));
          genreTracks = genreTracks.filter(
            (track) => !existingTrackIds.has(track.id)
          );

          if (genreTracks.length > 0) {
            discoveryContainer.innerHTML = "";
            if (messagesContainer) {
              messagesContainer.textContent = `🎯 Discovered ${genreTracks.length} tracks from trending genres!`;
            }

            // Add to allTracks array
            allTracks = [...allTracks, ...genreTracks];

            genreTracks.forEach((track) => {
              const songRow = createSongRow(track, discoveryContainer);
              discoveryContainer.appendChild(songRow);
            });

            setTimeout(() => {
              if (messagesContainer) {
                messagesContainer.style.display = "none";
              }
            }, 3000);
            return;
          }
        }
      }
    }

    // Final fallback: Show encouraging message
    discoveryContainer.innerHTML = "";
    if (messagesContainer) {
      messagesContainer.innerHTML =
        "🎯 Discovery panel ready! Play more music to get personalized recommendations.";
      messagesContainer.style.display = "block";
    }
  } catch (error) {
    console.error("Discovery recommendations error:", error);
    const discoveryContainer = document.getElementById("discoverySongs");
    const messagesContainer = document.getElementById("discoveryMessages");

    if (discoveryContainer) {
      discoveryContainer.innerHTML = "";
    }
    if (messagesContainer) {
      messagesContainer.textContent =
        "🎯 Discovery temporarily unavailable. Try again later!";
      messagesContainer.style.display = "block";
    }
  }
}

function showFallbackMusic() {
  const fallbackTracks = [
    {
      name: "Good 4 U",
      artist: "Olivia Rodrigo",
      spotifyId: "4ZtFanR9U6ndgddUvNcjcG",
      preview_url: null,
    },
    {
      name: "Anti-Hero",
      artist: "Taylor Swift",
      spotifyId: "0V3wPSX9ygBnCm8psDIegu",
      preview_url: null,
    },
    {
      name: "Flowers",
      artist: "Miley Cyrus",
      spotifyId: "0yLdNVWF3Srea0uzk55zFn",
      preview_url: null,
    },
    {
      name: "As It Was",
      artist: "Harry Styles",
      spotifyId: "4Dvkj6JhhA12EX05fT7y2e",
      preview_url: null,
    },
    {
      name: "Unholy",
      artist: "Sam Smith ft. Kim Petras",
      spotifyId: "3nqQXoyQOWXiESFLlDF1hG",
      preview_url: null,
    },
  ];

  const songOfDay = document.getElementById("songOfDay");
  if (songOfDay) {
    songOfDay.textContent = `🎵 ${fallbackTracks[0].name} — ${fallbackTracks[0].artist} (Popular Track)`;
  }

  const recentContainer = document.getElementById("recentSongs");
  const suggestedContainer = document.getElementById("suggestedSongs");
  if (recentContainer) recentContainer.innerHTML = "";
  if (suggestedContainer) suggestedContainer.innerHTML = "";

  // Reset allTracks for fallback
  allTracks = [];

  fallbackTracks.forEach((track) => {
    const fakeTrack = {
      name: track.name,
      artist: track.artist,
      artists: [{ name: track.artist }],
      id: track.spotifyId,
      preview_url: track.preview_url,
      album: { images: [] },
    };

    allTracks.push(fakeTrack);

    if (recentContainer) {
      const songRow = createSongRow(fakeTrack, recentContainer);
      recentContainer.appendChild(songRow);
    }
  });

  if (suggestedContainer) {
    suggestedContainer.innerHTML =
      '<p style="text-align: center; color: #666; font-size: 0.8rem;">Connect Spotify for personalized suggestions!</p>';
  }

  // Clear discovery panel
  const discoveryContainer = document.getElementById("discoverySongs");
  const discoveryMessages = document.getElementById("discoveryMessages");
  if (discoveryContainer) {
    discoveryContainer.innerHTML = "";
  }
  if (discoveryMessages) {
    discoveryMessages.textContent = "Connect Spotify to discover new music!";
    discoveryMessages.style.display = "block";
  }

  // Clear playlists
  const playlistGrid = document.getElementById("playlistGrid");
  const playlistSongs = document.getElementById("playlistSongs");
  if (playlistGrid) {
    playlistGrid.innerHTML =
      '<p style="text-align: center; color: #666; font-size: 0.8rem;">Connect Spotify to see playlists!</p>';
  }
  if (playlistSongs) {
    playlistSongs.innerHTML = "";
  }
}

function clearStoredAuth() {
  sessionStorage.removeItem("spotify_access_token");
  sessionStorage.removeItem("spotify_refresh_token");
  sessionStorage.removeItem("spotify_expires_at");
  sessionStorage.removeItem("spotify_user_name");
  sessionStorage.removeItem("spotify_verifier");

  spotifyState = {
    isConnected: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    userName: null,
  };
  updateSpotifyButton();
}

function checkStoredAuth() {
  const token = sessionStorage.getItem("spotify_access_token");
  const expiresAt = sessionStorage.getItem("spotify_expires_at");
  const userName = sessionStorage.getItem("spotify_user_name");

  if (token && expiresAt) {
    if (Date.now() < parseInt(expiresAt)) {
      spotifyState.accessToken = token;
      spotifyState.expiresAt = parseInt(expiresAt);
      spotifyState.userName = userName;
      spotifyState.isConnected = true;

      showStatus(`Welcome back, ${userName || "Bean"}! 🎵`, "success");
      updateSpotifyButton();
      fetchRecommendedTracks();
      // Initialize Spotify player if SDK is ready
      if (window.Spotify) {
        initializeSpotifyPlayer();
      }
    } else {
      showStatus("Spotify session expired. Please reconnect.", "error");
      clearStoredAuth();
    }
  }
}

// Load Spotify SDK dynamically
function loadSpotifySDK() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Spotify) {
      console.log("Spotify SDK already loaded");
      resolve();
      return;
    }

    console.log("Loading Spotify SDK...");
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    script.onload = () => {
      console.log("Spotify SDK script loaded");
      // The SDK will call onSpotifyWebPlaybackSDKReady when ready
      resolve();
    };

    script.onerror = (error) => {
      console.error("Failed to load Spotify SDK:", error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

function initializeSpotifyModule() {
  console.log("Initializing Spotify module...");

  // Load Spotify SDK
  loadSpotifySDK().catch((error) => {
    console.error("Could not load Spotify SDK:", error);
    showStatus(
      "Failed to load Spotify SDK. Some features may not work.",
      "error"
    );
  });

  // Connect Spotify button
  const connectBtn = document.getElementById("connectSpotifyBtn");
  if (connectBtn) {
    console.log("Setting up connect button");
    connectBtn.addEventListener("click", (e) => {
      console.log("Connect button clicked!");
      e.preventDefault();
      console.log("Spotify state:", spotifyState);
      if (spotifyState.isConnected) {
        if (confirm("Already connected! Want to refresh your music?")) {
          fetchRecommendedTracks();
        }
      } else {
        console.log("Calling loginSpotify...");
        loginSpotify();
      }
    });
  } else {
    console.error("Connect button not found!");
  }

  // Global control event listeners
  const globalPlayBtn = document.getElementById("globalPlayBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (globalPlayBtn) globalPlayBtn.addEventListener("click", toggleGlobalPlay);
  if (prevBtn) prevBtn.addEventListener("click", playPrevious);
  if (nextBtn) nextBtn.addEventListener("click", playNext);

  // Check for existing auth and handle callback
  checkStoredAuth();
  handleSpotifyCallback();

  console.log("Spotify module initialized successfully");
}
