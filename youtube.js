// YouTube Integration Module with Simple Multi-Select Filtering

const creatorCardsContainer = document.getElementById("creatorCards");
const watchLaterBtn = document.getElementById("watchLaterBtn");

// YouTube API Configuration
const API_KEY = "AIzaSyD6ISfx6ekKOVlk7sLuvg5tp_KahhgfU4s";
const FAVORITE_CREATORS = [
  // Knitting channels (green) - listed first
  {
    id: "UCl8KpmxzXJ5tY5LqAV5DO1w",
    name: "amazingishgrace",
    category: "knitting",
  },
  {
    id: "UCFSyDmCD5kaQ_OeiTGEoyZg",
    name: "BeaCreativeKnits",
    category: "knitting",
  },
  {
    id: "UCvdgJPzarMFumOp1eIguQog",
    name: "natashacrawf",
    category: "knitting",
  },
  {
    id: "UCGXTcL9d367QXuRbKjAxo1Q",
    name: "melanielocke",
    category: "knitting",
  },
  { id: "UCaMfX5Gmyll4ceAX_NIAU3g", name: "CozyK", category: "knitting" },
  {
    id: "UC-B0snKT6-OzTJ6_843G7cQ",
    name: "mrsmoonheaven",
    category: "knitting",
  },
  { id: "UCQuRK-VFyCjf3VCqZkCDveA", name: "Uncomfy", category: "knitting" },

  // Gaming channels (orange) - listed second
  { id: "UC9CuvdOVfMPvKCiwdGKL3cQ", name: "Game Grumps", category: "gaming" },
  { id: "UCG6zBb8GZKo1XZW4eHdg-0Q", name: "PointCrow", category: "gaming" },
  { id: "UCXq2nALoSbxLMehAvYTxt_A", name: "thegrumps", category: "gaming" },
];

let allVideos = [];
let selectedCreators = new Set(); // Track multiple selected creators

// Fetch upload playlist for a channel
async function fetchChannelUploads(channelId) {
  try {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
    );

    if (!channelRes.ok) {
      throw new Error(`Failed to fetch channel data: ${channelRes.status}`);
    }

    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      console.warn(`No channel found for ID: ${channelId}`);
      return [];
    }

    const uploadsId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch more videos per creator to ensure we have enough for filtering
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${API_KEY}`
    );

    if (!playlistRes.ok) {
      throw new Error(`Failed to fetch playlist data: ${playlistRes.status}`);
    }

    const playlistData = await playlistRes.json();

    // Filter out any invalid videos and add debugging
    const validVideos = playlistData.items
      .filter((item) => {
        return (
          item &&
          item.snippet &&
          item.snippet.resourceId &&
          item.snippet.resourceId.videoId &&
          item.snippet.title &&
          item.snippet.title !== "Private video" &&
          item.snippet.title !== "Deleted video"
        );
      })
      .map((item) => ({
        channelId,
        channelTitle: item.snippet.channelTitle,
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
      }));

    console.log(`Fetched ${validVideos.length} valid videos for ${channelId}`);
    return validVideos;
  } catch (error) {
    console.error(`Error fetching uploads for channel ${channelId}:`, error);
    return [];
  }
}

async function loadAllVideos() {
  try {
    // Try localStorage cache first - but use a new cache key for the updated version
    const cached = localStorage.getItem("creatorVideosCache_v4");
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && Date.now() - parsedCache.timestamp < 1000 * 60 * 30) {
        console.log("Using cached video data (v4)");
        allVideos = parsedCache.data;
        createFilterControls();
        renderVideos();
        return;
      }
    }

    console.log("Fetching fresh video data...");
    showLoadingState("creatorCards", "Loading videos...");

    // Clear old cache versions
    localStorage.removeItem("creatorVideosCache");
    localStorage.removeItem("creatorVideosCache_v2");
    localStorage.removeItem("creatorVideosCache_v3");

    // Fetch fresh data
    const promises = FAVORITE_CREATORS.map((creator) =>
      fetchChannelUploads(creator.id)
    );

    const results = await Promise.allSettled(promises);

    // Combine all successful results
    const rawVideos = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .flat();

    // Remove duplicates based on video ID
    const uniqueVideos = [];
    const seenVideoIds = new Set();

    rawVideos.forEach((video) => {
      if (!seenVideoIds.has(video.videoId)) {
        seenVideoIds.add(video.videoId);
        uniqueVideos.push(video);
      }
    });

    // Sort by newest first
    allVideos = uniqueVideos.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    console.log(
      `Removed ${rawVideos.length - uniqueVideos.length} duplicate videos`
    );
    console.log(`Final unique video count: ${allVideos.length}`);

    // Cache the results with new cache key
    try {
      localStorage.setItem(
        "creatorVideosCache_v4",
        JSON.stringify({ timestamp: Date.now(), data: allVideos })
      );
    } catch (error) {
      console.warn("Could not cache video data:", error);
    }

    createFilterControls();
    renderVideos();

    if (allVideos.length === 0) {
      showStatus("No videos found. Check your internet connection.", "error");
    } else {
      console.log(
        `Loaded ${allVideos.length} videos from ${FAVORITE_CREATORS.length} creators`
      );
    }
  } catch (error) {
    console.error("Error loading videos:", error);
    showErrorState();
  }
}

function createFilterControls() {
  const creatorsSection = document.getElementById("creatorsHub");
  if (!creatorsSection) return;

  // Remove existing filter controls if they exist
  const existingControls = document.getElementById("creatorFilterControls");
  if (existingControls) {
    existingControls.remove();
  }

  // Create filter controls container
  const filterContainer = document.createElement("div");
  filterContainer.id = "creatorFilterControls";
  filterContainer.style.cssText = `
    margin-bottom: 1rem;
    padding: 1rem;
    background: rgba(240, 237, 228, 0.7);
    border-radius: 12px;
    border: 1px solid var(--border-light);
  `;

  // Create title
  const title = document.createElement("h4");
  title.textContent = "Filter by Creator:";
  title.style.cssText = `
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 600;
  `;

  // Create scrollable checkboxes container with mobile optimization
  const checkboxContainer = document.createElement("div");
  checkboxContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    max-height: 200px;
    overflow-y: auto;
    padding: 0.25rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.3);
    
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--brown-light) transparent;
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      max-height: 160px;
      gap: 0.4rem;
    }
    
    @media (max-width: 480px) {
      grid-template-columns: 1fr 1fr;
      max-height: 140px;
      gap: 0.3rem;
    }
  `;

  // Webkit scrollbar styling
  const scrollbarStyle = document.createElement("style");
  scrollbarStyle.textContent = `
    #creatorFilterControls .checkbox-container::-webkit-scrollbar {
      width: 6px;
    }
    
    #creatorFilterControls .checkbox-container::-webkit-scrollbar-track {
      background: rgba(248, 246, 240, 0.5);
      border-radius: 3px;
    }
    
    #creatorFilterControls .checkbox-container::-webkit-scrollbar-thumb {
      background: var(--brown-light);
      border-radius: 3px;
    }
    
    #creatorFilterControls .checkbox-container::-webkit-scrollbar-thumb:hover {
      background: var(--brown);
    }
  `;
  document.head.appendChild(scrollbarStyle);

  checkboxContainer.className = "checkbox-container";

  // Create checkboxes for each creator with mobile-optimized styling
  FAVORITE_CREATORS.forEach((creator) => {
    const label = document.createElement("label");

    // Set color based on category
    const categoryColors = {
      knitting: {
        background: "rgba(45, 80, 22, 0.1)",
        selectedBackground:
          "linear-gradient(135deg, var(--green), var(--green-light))",
        selectedColor: "white",
        borderColor: "rgba(45, 80, 22, 0.3)",
        selectedBorderColor: "var(--green-light)",
      },
      gaming: {
        background: "rgba(255, 140, 0, 0.1)",
        selectedBackground: "linear-gradient(135deg, #ff8c00, #ffa500)",
        selectedColor: "white",
        borderColor: "rgba(255, 140, 0, 0.3)",
        selectedBorderColor: "#ff8c00",
      },
    };

    const colors = categoryColors[creator.category] || categoryColors.knitting;

    label.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.3rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: var(--text-primary);
      user-select: none;
      padding: 0.4rem 0.5rem;
      border-radius: 6px;
      border: 1px solid ${colors.borderColor};
      transition: all 0.2s ease;
      background: ${colors.background};
      min-height: 36px;
      
      /* Mobile optimizations */
      @media (max-width: 768px) {
        font-size: 0.75rem;
        padding: 0.35rem 0.4rem;
        gap: 0.25rem;
        min-height: 32px;
      }
      
      @media (max-width: 480px) {
        font-size: 0.7rem;
        padding: 0.3rem 0.35rem;
        min-height: 28px;
      }
    `;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `creator-${creator.id}`;
    checkbox.value = creator.id;
    checkbox.style.cssText = `
      margin: 0;
      transform: scale(1.0);
      flex-shrink: 0;
      
      @media (max-width: 480px) {
        transform: scale(0.9);
      }
    `;

    const span = document.createElement("span");
    span.textContent = creator.name;
    span.style.cssText = `
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    `;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedCreators.add(creator.id);
        label.style.background = colors.selectedBackground;
        label.style.color = colors.selectedColor;
        label.style.borderColor = colors.selectedBorderColor;
      } else {
        selectedCreators.delete(creator.id);
        label.style.background = colors.background;
        label.style.color = "var(--text-primary)";
        label.style.borderColor = colors.borderColor;
      }
      updateFilterSummary();
      renderVideos();
    });

    // Add hover effect
    label.addEventListener("mouseenter", () => {
      if (!checkbox.checked) {
        label.style.background =
          creator.category === "gaming"
            ? "rgba(255, 140, 0, 0.2)"
            : "rgba(45, 80, 22, 0.15)";
        label.style.borderColor =
          creator.category === "gaming"
            ? "rgba(255, 140, 0, 0.5)"
            : "rgba(45, 80, 22, 0.4)";
      }
    });

    label.addEventListener("mouseleave", () => {
      if (!checkbox.checked) {
        label.style.background = colors.background;
        label.style.borderColor = colors.borderColor;
      }
    });

    label.appendChild(checkbox);
    label.appendChild(span);
    checkboxContainer.appendChild(label);
  });

  // Create action buttons with mobile optimization
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    
    @media (max-width: 480px) {
      gap: 0.4rem;
    }
  `;

  const selectAllBtn = document.createElement("button");
  selectAllBtn.textContent = "Select All";
  selectAllBtn.style.cssText = `
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    border-radius: 6px;
    border: none;
    background: linear-gradient(135deg, var(--green), var(--green-light));
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    
    @media (max-width: 480px) {
      padding: 0.35rem 0.6rem;
      font-size: 0.7rem;
    }
  `;

  selectAllBtn.addEventListener("click", () => {
    const checkboxes = checkboxContainer.querySelectorAll(
      "input[type='checkbox']"
    );
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

    checkboxes.forEach((checkbox) => {
      checkbox.checked = !allChecked;
      checkbox.dispatchEvent(new Event("change"));
    });

    selectAllBtn.textContent = allChecked ? "Select All" : "Clear All";
  });

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.style.cssText = `
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    border-radius: 6px;
    border: none;
    background: linear-gradient(135deg, var(--brown), var(--brown-light));
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    
    @media (max-width: 480px) {
      padding: 0.35rem 0.6rem;
      font-size: 0.7rem;
    }
  `;

  clearBtn.addEventListener("click", () => {
    checkboxContainer
      .querySelectorAll("input[type='checkbox']")
      .forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));
      });
    selectAllBtn.textContent = "Select All";
  });

  // Create filter summary with mobile optimization
  const summary = document.createElement("div");
  summary.id = "filterSummary";
  summary.style.cssText = `
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
    margin-left: 0.5rem;
    flex: 1;
    min-width: 0;
    
    @media (max-width: 480px) {
      font-size: 0.75rem;
      margin-left: 0;
      margin-top: 0.25rem;
      flex-basis: 100%;
      text-align: center;
    }
  `;
  summary.textContent = "Showing all creators";

  buttonContainer.appendChild(selectAllBtn);
  buttonContainer.appendChild(clearBtn);
  buttonContainer.appendChild(summary);

  filterContainer.appendChild(title);
  filterContainer.appendChild(checkboxContainer);
  filterContainer.appendChild(buttonContainer);

  // Insert filter controls after the h2 but before the cards
  const h2 = creatorsSection.querySelector("h2");
  h2.insertAdjacentElement("afterend", filterContainer);
}

function updateFilterSummary() {
  const summary = document.getElementById("filterSummary");
  if (!summary) return;

  if (selectedCreators.size === 0) {
    summary.textContent = "Showing all creators";
    summary.style.color = "var(--text-muted)";
  } else {
    const selectedNames = FAVORITE_CREATORS.filter((creator) =>
      selectedCreators.has(creator.id)
    ).map((creator) => creator.name);

    if (selectedNames.length === 1) {
      summary.textContent = `Showing ${selectedNames[0]}`;
    } else if (selectedNames.length === 2) {
      summary.textContent = `Showing ${selectedNames.join(" and ")}`;
    } else {
      summary.textContent = `Showing ${selectedNames.length} creators`;
    }
    summary.style.color = "var(--green)";
    summary.style.fontWeight = "500";
  }
}

function renderVideos() {
  if (!creatorCardsContainer) {
    console.error("Creator cards container not found");
    return;
  }

  creatorCardsContainer.innerHTML = "";

  let videos = allVideos;

  // Apply filtering based on selected creators
  if (selectedCreators.size > 0) {
    videos = videos.filter((v) => selectedCreators.has(v.channelId));
    console.log(
      `After filtering: ${videos.length} videos from ${selectedCreators.size} selected creators`
    );
  }

  // Always sort by most recent first (publishedAt descending)
  videos = videos.sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  if (videos.length === 0) {
    const message =
      selectedCreators.size > 0
        ? "No videos found for selected creators"
        : "No videos found";
    creatorCardsContainer.innerHTML = `<p style="text-align: center; color: #666; font-size: 0.8rem; padding: 2rem;">${message}</p>`;
    return;
  }

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  // Always take exactly 10 videos (or all if less than 10 available)
  const videosToShow = videos.slice(0, 10);
  console.log(
    `Showing ${videosToShow.length} videos out of ${videos.length} available`
  );

  videosToShow.forEach((video) => {
    const card = document.createElement("div");
    card.className = "creator-card";

    // Create a more accessible and informative card
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail for ${
      video.title
    }" loading="lazy">
      <p title="${video.title}">${truncateText(video.title, 60)}</p>
      <small style="color: #666; font-size: 0.7rem;">${
        video.channelTitle
      }</small>
    `;

    card.addEventListener("click", () => {
      window.open(
        `https://www.youtube.com/watch?v=${video.videoId}`,
        "_blank",
        "noopener,noreferrer"
      );
    });

    // Add keyboard navigation
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute(
      "aria-label",
      `Watch ${video.title} by ${video.channelTitle}`
    );

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });

    fragment.appendChild(card);
  });

  creatorCardsContainer.appendChild(fragment);
}

function showErrorState() {
  if (creatorCardsContainer) {
    creatorCardsContainer.innerHTML = `
      <div style="text-align: center; color: #666; font-size: 0.8rem; padding: 2rem;">
        <p>Unable to load videos</p>
        <button onclick="loadAllVideos()" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.8rem;">
          Retry
        </button>
      </div>
    `;
  }
}

// Utility function to truncate text
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function initializeYouTubeModule() {
  console.log(
    "Initializing YouTube module with simple multi-select filtering..."
  );

  // Set up surprise me button
  if (watchLaterBtn) {
    // Update button text and styling
    watchLaterBtn.textContent = "ðŸŽ² Surprise Me";
    watchLaterBtn.style.cssText = `
      background: linear-gradient(135deg, var(--brown), var(--brown-light));
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: var(--cream);
      font-size: 0.9rem;
      transition: all var(--transition);
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
      border: 1px solid var(--brown-dark);
      width: 100%;
      margin-top: 1rem;
    `;

    watchLaterBtn.addEventListener("click", () => {
      openRandomVideo();
    });

    // Add hover effects
    watchLaterBtn.addEventListener("mouseenter", () => {
      watchLaterBtn.style.transform = "translateY(-2px)";
      watchLaterBtn.style.boxShadow = "0 8px 20px rgba(139, 69, 19, 0.4)";
      watchLaterBtn.style.background =
        "linear-gradient(135deg, var(--brown-light), var(--accent-warm))";
    });

    watchLaterBtn.addEventListener("mouseleave", () => {
      watchLaterBtn.style.transform = "translateY(0)";
      watchLaterBtn.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.3)";
      watchLaterBtn.style.background =
        "linear-gradient(135deg, var(--brown), var(--brown-light))";
    });
  }

  // Load videos (this will also create filter controls)
  loadAllVideos();

  console.log(
    "YouTube module initialized successfully with checkbox filtering"
  );
}

function openRandomVideo() {
  let availableVideos = allVideos;

  // Apply the same filtering logic as the main display
  if (selectedCreators.size > 0) {
    availableVideos = allVideos.filter((v) =>
      selectedCreators.has(v.channelId)
    );
  }

  if (availableVideos.length === 0) {
    // Show a styled alert-like message
    showTemporaryMessage(
      "No videos available! Try selecting some creators first.",
      "error"
    );
    return;
  }

  // Get a random video from available videos
  const randomIndex = Math.floor(Math.random() * availableVideos.length);
  const randomVideo = availableVideos[randomIndex];

  // Show which video was selected
  const creatorName =
    FAVORITE_CREATORS.find((c) => c.id === randomVideo.channelId)?.name ||
    randomVideo.channelTitle;
  showTemporaryMessage(
    `ðŸŽ² Opening "${randomVideo.title}" by ${creatorName}!`,
    "success"
  );

  // Open the video in a new tab
  window.open(
    `https://www.youtube.com/watch?v=${randomVideo.videoId}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function showTemporaryMessage(message, type = "info") {
  // Create or update a temporary message element
  let messageEl = document.getElementById("surpriseMessage");

  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.id = "surpriseMessage";
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.9rem;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;
    document.body.appendChild(messageEl);
  }

  // Set message and style based on type
  messageEl.textContent = message;

  if (type === "success") {
    messageEl.style.background =
      "linear-gradient(135deg, var(--green), var(--green-light))";
    messageEl.style.color = "white";
    messageEl.style.border = "1px solid var(--green-light)";
  } else if (type === "error") {
    messageEl.style.background =
      "linear-gradient(135deg, var(--brown), var(--brown-light))";
    messageEl.style.color = "white";
    messageEl.style.border = "1px solid var(--brown-light)";
  } else {
    messageEl.style.background = "rgba(210, 180, 140, 0.95)";
    messageEl.style.color = "var(--brown-dark)";
    messageEl.style.border = "1px solid var(--accent-warm)";
  }

  // Animate in
  setTimeout(() => {
    messageEl.style.transform = "translateX(0)";
  }, 10);

  // Animate out after delay
  setTimeout(() => {
    messageEl.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (messageEl && messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 300);
  }, 3000);
}

// Export functions for potential external use
window.YouTubeModule = {
  loadAllVideos,
  renderVideos,
  createFilterControls,
  initializeYouTubeModule,
  selectedCreators, // Expose for debugging
};
