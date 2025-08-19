// Movies & Shows Hub - TMDB API Integration with Genre Filtering

// TMDB API Configuration
const TMDB_CONFIG = {
  apiKey: "3fd2be6f0c70a2a598f084ddfb75487c", // Free public API key
  baseUrl: "https://api.themoviedb.org/3",
  imageBaseUrl: "https://image.tmdb.org/t/p/w500",
  imageBaseUrlSmall: "https://image.tmdb.org/t/p/w300",
};

// Movie state management
let movieState = {
  currentGenre: "popular",
  currentPage: 1,
  totalPages: 1,
  currentMovies: [],
  genres: {},
  isLoading: false,
  lastFetch: 0,
  selectedCategory: "movies", // movies or tv
};

// Genre mappings from TMDB
const GENRE_CATEGORIES = {
  popular: { name: "Popular Now", endpoint: "popular", icon: "🔥" },
  trending: { name: "Trending", endpoint: "trending", icon: "📈" },
  topRated: { name: "Top Rated", endpoint: "top_rated", icon: "⭐" },
  upcoming: { name: "Coming Soon", endpoint: "upcoming", icon: "🎬" },
  action: { name: "Action", genreId: 28, icon: "💥" },
  comedy: { name: "Comedy", genreId: 35, icon: "😄" },
  drama: { name: "Drama", genreId: 18, icon: "🎭" },
  horror: { name: "Horror", genreId: 27, icon: "👻" },
  romance: { name: "Romance", genreId: 10749, icon: "💕" },
  scifi: { name: "Sci-Fi", genreId: 878, icon: "🚀" },
  fantasy: { name: "Fantasy", genreId: 14, icon: "🧙" },
  thriller: { name: "Thriller", genreId: 53, icon: "😱" },
  animation: { name: "Animation", genreId: 16, icon: "🎨" },
  family: { name: "Family", genreId: 10751, icon: "👨‍👩‍👧‍👦" },
};

// Fetch movies from TMDB API
async function fetchMoviesFromTMDB(category = "popular", page = 1) {
  try {
    movieState.isLoading = true;
    showLoadingState();

    let url;
    const categoryInfo = GENRE_CATEGORIES[category];

    if (!categoryInfo) {
      throw new Error("Invalid category");
    }

    // Build API URL based on category type
    if (categoryInfo.endpoint) {
      // Special endpoints like popular, trending, top_rated
      if (categoryInfo.endpoint === "trending") {
        url = `${TMDB_CONFIG.baseUrl}/trending/${movieState.selectedCategory}/week?api_key=${TMDB_CONFIG.apiKey}&page=${page}`;
      } else {
        url = `${TMDB_CONFIG.baseUrl}/${movieState.selectedCategory}/${categoryInfo.endpoint}?api_key=${TMDB_CONFIG.apiKey}&page=${page}`;
      }
    } else if (categoryInfo.genreId) {
      // Genre-based filtering
      url = `${TMDB_CONFIG.baseUrl}/discover/${movieState.selectedCategory}?api_key=${TMDB_CONFIG.apiKey}&with_genres=${categoryInfo.genreId}&page=${page}&sort_by=popularity.desc`;
    }

    console.log(
      `🎬 Fetching ${categoryInfo.name} ${movieState.selectedCategory} (page ${page})...`
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("No results found");
    }

    // Process movies/shows
    const processedItems = data.results.map((item) => ({
      id: item.id,
      title: item.title || item.name, // movies have 'title', TV shows have 'name'
      originalTitle: item.original_title || item.original_name,
      overview: item.overview || "No description available.",
      releaseDate: item.release_date || item.first_air_date,
      year: item.release_date
        ? new Date(item.release_date).getFullYear()
        : item.first_air_date
        ? new Date(item.first_air_date).getFullYear()
        : "TBA",
      rating: item.vote_average
        ? Math.round(item.vote_average * 10) / 10
        : "N/A",
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      genreIds: item.genre_ids || [],
      adult: item.adult || false,
      image: item.poster_path
        ? `${TMDB_CONFIG.imageBaseUrlSmall}${item.poster_path}`
        : getPlaceholderImage(),
      tmdbUrl: `https://www.themoviedb.org/${movieState.selectedCategory}/${item.id}`,
      type: movieState.selectedCategory,
    }));

    movieState.currentMovies =
      page === 1
        ? processedItems
        : [...movieState.currentMovies, ...processedItems];
    movieState.currentPage = page;
    movieState.totalPages = Math.min(data.total_pages, 500); // TMDB limits to 500 pages
    movieState.lastFetch = Date.now();

    console.log(
      `✅ Loaded ${processedItems.length} ${movieState.selectedCategory} (page ${page}/${movieState.totalPages})`
    );

    return processedItems;
  } catch (error) {
    console.error("❌ Error fetching from TMDB:", error);
    showErrorMessage(
      `Failed to load ${movieState.selectedCategory}: ${error.message}`
    );
    return [];
  } finally {
    movieState.isLoading = false;
  }
}

// Get placeholder image for movies without posters
function getPlaceholderImage() {
  return `https://images.unsplash.com/photo-1489599735188-900089b31391?w=300&h=450&fit=crop&q=80`;
}

// Fetch detailed movie/show information
async function fetchItemDetails(id, type = "movie") {
  try {
    const url = `${TMDB_CONFIG.baseUrl}/${type}/${id}?api_key=${TMDB_CONFIG.apiKey}&append_to_response=credits,videos,similar`;
    const response = await fetch(url);

    if (!response.ok) throw new Error("Failed to fetch details");

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching item details:", error);
    return null;
  }
}

// Search movies/shows
async function searchMovies(query, page = 1) {
  try {
    if (!query.trim()) return [];

    movieState.isLoading = true;
    showLoadingState();

    const url = `${TMDB_CONFIG.baseUrl}/search/${
      movieState.selectedCategory
    }?api_key=${TMDB_CONFIG.apiKey}&query=${encodeURIComponent(
      query
    )}&page=${page}`;

    console.log(`🔍 Searching for "${query}"...`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const data = await response.json();
    const results = data.results || [];

    console.log(`✅ Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error("❌ Search error:", error);
    showErrorMessage(`Search failed: ${error.message}`);
    return [];
  } finally {
    movieState.isLoading = false;
  }
}

// UI Functions
function showLoadingState() {
  const container = document.getElementById("movieCards");
  if (!container) return;

  container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; padding: 2rem; width: 100%; color: #666;">
        <div style="
          width: 20px; 
          height: 20px; 
          border: 2px solid #f0ede4; 
          border-top: 2px solid #8b4513; 
          border-radius: 50%; 
          animation: spin 1s linear infinite;
          margin-right: 10px;
        "></div>
        <span>Loading ${movieState.selectedCategory}...</span>
      </div>
    `;
}

function showErrorMessage(message) {
  const container = document.getElementById("movieCards");
  if (!container) return;

  container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #8b4513; width: 100%;">
        <p style="margin-bottom: 1rem;">${message}</p>
        <button onclick="loadMovies()" style="
          padding: 0.75rem 1.5rem;
          background: var(--brown);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Try Again</button>
      </div>
    `;
}

function showSuccessMessage(count, category) {
  if (typeof showStatus === "function") {
    showStatus(`🎬 Loaded ${count} ${category} from TMDB!`, "success");
  }
}

// Create movie/show card
function createMovieCard(item) {
  const card = document.createElement("div");
  card.className = "movie-card";
  card.style.cssText = `
      min-width: 200px;
      max-width: 200px;
      background: rgba(248, 246, 240, 0.9);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(44, 62, 24, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;
      border: 1px solid rgba(139, 69, 19, 0.1);
      position: relative;
      margin-bottom: 1rem;
    `;

  // Determine rating color
  const ratingColor =
    item.rating >= 8 ? "#27ae60" : item.rating >= 6 ? "#f39c12" : "#e74c3c";

  card.innerHTML = `
      <div style="position: relative;">
        <img src="${item.image}" alt="${item.title}" 
             style="width: 100%; height: 280px; object-fit: cover;"
             loading="lazy"
             onerror="this.src='${getPlaceholderImage()}';">
        
        ${
          item.rating !== "N/A"
            ? `
          <div style="
            position: absolute; 
            top: 8px; 
            right: 8px; 
            background: ${ratingColor}; 
            color: white; 
            padding: 0.25rem 0.5rem; 
            border-radius: 12px; 
            font-size: 0.75rem; 
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            ⭐ ${item.rating}
          </div>
        `
            : ""
        }
        
        <div style="
          position: absolute; 
          top: 8px; 
          left: 8px; 
          background: rgba(0,0,0,0.7); 
          color: white; 
          padding: 0.25rem 0.5rem; 
          border-radius: 8px; 
          font-size: 0.7rem; 
          font-weight: 500;
        ">
          ${item.year}
        </div>
      </div>
      
      <div style="padding: 1rem;">
        <h4 style="
          margin: 0 0 0.5rem 0; 
          font-size: 0.9rem; 
          color: var(--text-primary); 
          font-weight: 600; 
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        ">
          ${item.title}
        </h4>
        
        <p style="
          margin: 0 0 0.75rem 0; 
          font-size: 0.75rem; 
          color: var(--text-muted); 
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        ">
          ${item.overview}
        </p>
        
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <span style="
            background: var(--brown-light); 
            color: white; 
            padding: 0.2rem 0.5rem; 
            border-radius: 12px; 
            font-size: 0.7rem;
            font-weight: 500;
          ">
            ${item.type === "movie" ? "🎬 Movie" : "📺 TV Show"}
          </span>
          
          ${
            item.voteCount > 0
              ? `
            <span style="
              background: rgba(45, 80, 22, 0.1); 
              color: var(--green); 
              padding: 0.2rem 0.5rem; 
              border-radius: 12px; 
              font-size: 0.7rem;
            ">
              ${item.voteCount.toLocaleString()} votes
            </span>
          `
              : ""
          }
        </div>
      </div>
    `;

  // Click handler
  card.addEventListener("click", () => {
    openMovieDetails(item);
  });

  // Hover effects
  card.addEventListener("mouseenter", () => {
    card.style.transform = "translateY(-4px) scale(1.02)";
    card.style.boxShadow = "0 8px 25px rgba(44, 62, 24, 0.2)";
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "translateY(0) scale(1)";
    card.style.boxShadow = "0 4px 12px rgba(44, 62, 24, 0.1)";
  });

  return card;
}

// Open movie/show details
function openMovieDetails(item) {
  console.log(`🎬 Opening details for: ${item.title}`);

  // Open TMDB page in new tab
  window.open(item.tmdbUrl, "_blank");

  showSuccessMessage(1, `"${item.title}"`);
}

// Create genre filter buttons
function createGenreFilters() {
  const moviesSection = document.getElementById("moviesHub");
  if (!moviesSection) return;

  // Remove existing filters
  const existingFilters = document.getElementById("genreFilters");
  if (existingFilters) {
    existingFilters.remove();
  }

  // Create filter container
  const filterContainer = document.createElement("div");
  filterContainer.id = "genreFilters";
  filterContainer.style.cssText = `
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(240, 237, 228, 0.7);
      border-radius: 12px;
      border: 1px solid var(--border-light);
    `;

  // Type selector (Movies vs TV Shows)
  const typeSelector = document.createElement("div");
  typeSelector.style.cssText = `
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      justify-content: center;
    `;

  ["movies", "tv"].forEach((type) => {
    const typeBtn = document.createElement("button");
    typeBtn.textContent = type === "movies" ? "🎬 Movies" : "📺 TV Shows";
    typeBtn.style.cssText = `
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-light);
        border-radius: 20px;
        background: ${
          movieState.selectedCategory === type
            ? "var(--brown)"
            : "rgba(248, 246, 240, 0.8)"
        };
        color: ${
          movieState.selectedCategory === type
            ? "white"
            : "var(--text-secondary)"
        };
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: ${movieState.selectedCategory === type ? "600" : "400"};
      `;

    typeBtn.addEventListener("click", () => {
      movieState.selectedCategory = type;
      movieState.currentMovies = [];
      movieState.currentPage = 1;
      createGenreFilters(); // Refresh filters
      loadMovies(movieState.currentGenre);
    });

    typeSelector.appendChild(typeBtn);
  });

  filterContainer.appendChild(typeSelector);

  // Genre filter buttons
  const filterGrid = document.createElement("div");
  filterGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
      margin-bottom: 1rem;
    `;

  Object.entries(GENRE_CATEGORIES).forEach(([key, genre]) => {
    const button = document.createElement("button");
    button.textContent = `${genre.icon} ${genre.name}`;
    button.style.cssText = `
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border-light);
        border-radius: 8px;
        background: ${
          movieState.currentGenre === key
            ? "var(--green)"
            : "rgba(248, 246, 240, 0.8)"
        };
        color: ${
          movieState.currentGenre === key ? "white" : "var(--text-primary)"
        };
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.8rem;
        font-weight: ${movieState.currentGenre === key ? "600" : "400"};
      `;

    button.addEventListener("click", () => {
      movieState.currentGenre = key;
      movieState.currentMovies = [];
      movieState.currentPage = 1;
      createGenreFilters(); // Refresh active states
      loadMovies(key);
    });

    // Hover effect
    button.addEventListener("mouseenter", () => {
      if (movieState.currentGenre !== key) {
        button.style.background = "rgba(45, 80, 22, 0.1)";
        button.style.borderColor = "var(--green)";
      }
    });

    button.addEventListener("mouseleave", () => {
      if (movieState.currentGenre !== key) {
        button.style.background = "rgba(248, 246, 240, 0.8)";
        button.style.borderColor = "var(--border-light)";
      }
    });

    filterGrid.appendChild(button);
  });

  filterContainer.appendChild(filterGrid);

  // Search bar
  const searchContainer = document.createElement("div");
  searchContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      align-items: center;
    `;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = `Search ${movieState.selectedCategory}...`;
  searchInput.style.cssText = `
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: rgba(248, 246, 240, 0.9);
      color: var(--text-primary);
      font-size: 0.9rem;
    `;

  const searchBtn = document.createElement("button");
  searchBtn.textContent = "🔍 Search";
  searchBtn.style.cssText = `
      padding: 0.5rem 1rem;
      background: var(--brown);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    `;

  const handleSearch = async () => {
    const query = searchInput.value.trim();
    if (query) {
      movieState.currentGenre = "search";
      const results = await searchMovies(query);
      renderMovies(results, `Search: "${query}"`);
      createGenreFilters(); // Refresh to show search state
    }
  };

  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchBtn);
  filterContainer.appendChild(searchContainer);

  // Insert after h2
  const h2 = moviesSection.querySelector("h2");
  h2.insertAdjacentElement("afterend", filterContainer);
}

// Render movies/shows
function renderMovies(items, categoryName = null) {
  const container = document.getElementById("movieCards");
  if (!container) return;

  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666; width: 100%;">
          <p>No ${movieState.selectedCategory} found. Try a different category!</p>
        </div>
      `;
    return;
  }

  // Create cards
  items.forEach((item) => {
    const card = createMovieCard(item);
    container.appendChild(card);
  });

  // Show load more button if there are more pages
  if (
    movieState.currentPage < movieState.totalPages &&
    !categoryName?.includes("Search")
  ) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.textContent = `Load More ${
      movieState.selectedCategory === "movies" ? "Movies" : "TV Shows"
    } (Page ${movieState.currentPage + 1})`;
    loadMoreBtn.style.cssText = `
        min-width: 200px;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, var(--brown), var(--brown-light));
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        margin: 1rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
      `;

    loadMoreBtn.addEventListener("click", () => {
      loadMoreMovies();
    });

    loadMoreBtn.addEventListener("mouseenter", () => {
      loadMoreBtn.style.transform = "translateY(-2px)";
      loadMoreBtn.style.boxShadow = "0 6px 20px rgba(139, 69, 19, 0.4)";
    });

    loadMoreBtn.addEventListener("mouseleave", () => {
      loadMoreBtn.style.transform = "translateY(0)";
      loadMoreBtn.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.3)";
    });

    container.appendChild(loadMoreBtn);
  }

  // Update success message
  const genreName =
    categoryName || GENRE_CATEGORIES[movieState.currentGenre]?.name || "items";
  showSuccessMessage(
    items.length,
    `${genreName} ${movieState.selectedCategory}`
  );
}

// Load movies for a specific genre/category
async function loadMovies(category = "popular") {
  movieState.currentGenre = category;
  movieState.currentPage = 1;
  movieState.currentMovies = [];

  const items = await fetchMoviesFromTMDB(category, 1);
  if (items.length > 0) {
    renderMovies(items);
  }
}

// Load more movies (pagination)
async function loadMoreMovies() {
  if (movieState.isLoading || movieState.currentPage >= movieState.totalPages) {
    return;
  }

  const nextPage = movieState.currentPage + 1;
  const newItems = await fetchMoviesFromTMDB(movieState.currentGenre, nextPage);

  if (newItems.length > 0) {
    renderMovies(movieState.currentMovies); // Re-render all items including new ones
  }
}

// Random movie picker
function pickRandomMovie() {
  if (movieState.currentMovies.length === 0) {
    showErrorMessage("Load some movies first!");
    return;
  }

  const randomMovie =
    movieState.currentMovies[
      Math.floor(Math.random() * movieState.currentMovies.length)
    ];
  openMovieDetails(randomMovie);
}

// Initialize Movies Hub
function initializeMoviesHub() {
  console.log("🎬 Initializing Movies & Shows Hub...");

  // Create genre filters
  createGenreFilters();

  // Setup random pick button
  const randomBtn = document.getElementById("randomPickBtn");
  if (randomBtn) {
    randomBtn.textContent = "🎲 Random Pick";
    randomBtn.addEventListener("click", pickRandomMovie);

    randomBtn.style.cssText = `
        background: linear-gradient(135deg, var(--brown), var(--brown-light));
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        color: var(--cream);
        font-size: 0.9rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        width: 100%;
        margin-top: 1rem;
      `;
  }

  // Load initial movies
  loadMovies("popular");

  console.log("✅ Movies & Shows Hub ready!");
}

// Global exports
window.initializeMoviesHub = initializeMoviesHub;
window.loadMovies = loadMovies;
window.pickRandomMovie = pickRandomMovie;
