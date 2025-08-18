console.log("Script starting...");

// Love notes rotation
const loveNotes = [
  "You brighten my day 💛",
  "You're the best, Bean 🌸",
  "Love you endlessly 💕",
  "You're magical, truly ✨",
];

let noteIndex = 0;
setInterval(() => {
  noteIndex = (noteIndex + 1) % loveNotes.length;
  const noteEl = document.getElementById("loveNote");
  if (noteEl) {
    noteEl.textContent = loveNotes[noteIndex];
  }
}, 7000);

// Status message utility
function showStatus(message, type = "info") {
  console.log("Status:", message, type);
  const statusEl = document.getElementById("statusMessage");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = "block";

    if (type !== "error") {
      setTimeout(() => {
        statusEl.style.display = "none";
      }, 3000);
    }
  }
}

// Loading state management
function showLoadingState(containerId, message = "Loading...") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 20px; color: #666;">
      <div class="loading-spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

function showSkeletonLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array.from(
    { length: 5 },
    (_, i) => `
    <div class="skeleton-song">
      <div class="loading-skeleton skeleton-art"></div>
      <div class="skeleton-info">
        <div class="loading-skeleton skeleton-title"></div>
        <div class="loading-skeleton skeleton-artist"></div>
      </div>
    </div>
  `
  ).join("");

  container.innerHTML = skeletons;
}

function addSectionLoadingState(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add("loading");
  }
}

function removeSectionLoadingState(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove("loading");
  }
}

function initializeApp() {
  console.log("Initializing app...");

  // Initialize other modules
  if (typeof initializeSpotifyModule === "function") {
    initializeSpotifyModule();
  }

  if (typeof initializeYouTubeModule === "function") {
    initializeYouTubeModule();
  }

  // Initialize live knitting pattern fetcher
  if (typeof initializeLiveKnittingModule === "function") {
    console.log("Initializing Live Knitting Pattern Fetcher...");
    initializeLiveKnittingModule();
  } else if (typeof initializeKnittingModule === "function") {
    console.log("Initializing fallback Knitting Module...");
    initializeKnittingModule();
  }

  // Set up other feature buttons
  const buttons = [
    { id: "addPlantBtn", message: "Add Plant coming!" },
    { id: "surpriseMeBtn", message: "Surprise content!" },
  ];

  buttons.forEach(({ id, message }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => alert(message));
    }
  });

  console.log("App initialized successfully");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
