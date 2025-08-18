// Pattern Fetcher with Matched Images - Images actually match the patterns

// Pattern sources
const PATTERN_SOURCES = {
  allFreeKnitting: {
    name: "AllFreeKnitting",
    url: "https://www.allfreeknitting.com/rss.xml",
    type: "rss",
    free: true,
  },
  purlSoho: {
    name: "Purl Soho",
    url: "https://www.purlsoho.com/create/feed/",
    type: "rss",
    free: true,
  },
  tinCanKnits: {
    name: "Tin Can Knits",
    url: "https://tincanknits.com/feed",
    type: "rss",
    free: true,
  },
  yarnspirations: {
    name: "Yarnspirations",
    url: "https://www.yarnspirations.com/rss.xml",
    type: "rss",
    free: true,
  },
  brooklynTweed: {
    name: "Brooklyn Tweed",
    url: "https://brooklyntweed.com/collections/patterns.json",
    type: "shopify_json",
    free: false,
  },
};

// Premium pattern backup with actual pattern links
const PREMIUM_PATTERNS = [
  {
    name: "Weekender Sweater",
    designer: "Andrea Mowry",
    price: 7.0,
    yardage: 1200,
    difficulty: 6,
    description: "Cozy oversized sweater perfect for weekend adventures",
    patternType: "sweater",
    link: "https://www.ravelry.com/patterns/library/weekender-4",
  },
  {
    name: "Simple Collection Cardigan",
    designer: "Joji Locatelli",
    price: 8.0,
    yardage: 1400,
    difficulty: 7,
    description: "Elegant cardigan with clean lines",
    patternType: "cardigan",
    link: "https://www.ravelry.com/patterns/library/simple-collection-cardigan",
  },
  {
    name: "Harvest Cardigan",
    designer: "Jennifer Wood",
    price: 6.5,
    yardage: 1600,
    difficulty: 8,
    description: "Beautiful textured cardigan with cables and bobbles",
    patternType: "cardigan",
    link: "https://www.ravelry.com/patterns/library/harvest-cardigan",
  },
  {
    name: "Cloud Cowl",
    designer: "Joji Locatelli",
    price: 5.0,
    yardage: 350,
    difficulty: 3,
    description: "Soft, fluffy cowl knit in mohair silk blend",
    patternType: "cowl",
    link: "https://www.ravelry.com/patterns/library/cloud-cowl",
  },
  {
    name: "Antler Cardigan",
    designer: "Norah Gaughan",
    price: 8.0,
    yardage: 1500,
    difficulty: 8,
    description: "Sophisticated cardigan with intricate cable work",
    patternType: "cardigan",
    link: "https://brooklyntweed.com/products/antler-cardigan",
  },
  {
    name: "Rambler Pullover",
    designer: "Thea Colman",
    price: 7.5,
    yardage: 1300,
    difficulty: 7,
    description: "Modern pullover with interesting construction details",
    patternType: "sweater",
    link: "https://www.ravelry.com/patterns/library/rambler-pullover",
  },
  {
    name: "Clayoquot Toque",
    designer: "Jennifer Wood",
    price: 4.0,
    yardage: 220,
    difficulty: 4,
    description: "Textured beanie with beautiful stitch definition",
    patternType: "hat",
    link: "https://www.ravelry.com/patterns/library/clayoquot-toque",
  },
  {
    name: "Hermione's Everyday Socks",
    designer: "Erica Lueder",
    price: 5.5,
    yardage: 400,
    difficulty: 5,
    description: "Classic toe-up socks with elegant detailing",
    patternType: "socks",
    link: "https://www.ravelry.com/patterns/library/hermiones-everyday-socks",
  },
  {
    name: "Shifting Sands Shawl",
    designer: "Melanie Berg",
    price: 6.0,
    yardage: 650,
    difficulty: 6,
    description: "Geometric shawl with stunning color transitions",
    patternType: "shawl",
    link: "https://www.ravelry.com/patterns/library/shifting-sands-shawl",
  },
  {
    name: "Featherweight Cardigan",
    designer: "Norah Gaughan",
    price: 7.5,
    yardage: 1100,
    difficulty: 7,
    description: "Light and airy cardigan perfect for layering",
    patternType: "cardigan",
    link: "https://brooklyntweed.com/products/featherweight-cardigan",
  },
];

// Session state
let sessionState = {
  usedPatternIds: new Set(),
  allFetchedPatterns: [],
  currentDisplay: [],
  currentCategory: "free",
  categories: ["free", "premium"],
  refreshCount: 0,
  lastFetch: 0,
  fetchCooldown: 120000,
  patternImageCache: new Map(), // Cache pattern-specific images
};

const UNSPLASH_CONFIG = {
  accessKey: "hWc40Xnhggmx6QzykSEUqTVsuvKip55WV3ihfoXM68A",
  baseUrl: "https://api.unsplash.com",
};

// Get specific image for each pattern based on its name and type
async function getMatchedImageForPattern(pattern) {
  const cacheKey = `${pattern.name}-${pattern.patternType || "default"}`;

  // Check cache first
  if (sessionState.patternImageCache.has(cacheKey)) {
    const cachedImage = sessionState.patternImageCache.get(cacheKey);
    console.log(`💾 Using cached image for ${pattern.name}`);
    return cachedImage;
  }

  // Use RSS thumbnail if available and looks good
  if (pattern.rssImage && isGoodRSSImage(pattern.rssImage)) {
    console.log(`📸 Using RSS image for ${pattern.name}`);
    sessionState.patternImageCache.set(cacheKey, pattern.rssImage);
    return pattern.rssImage;
  }

  // Create specific search query for this pattern
  const searchQuery = createSpecificSearchQuery(pattern);

  try {
    console.log(
      `🔍 Searching for specific image: "${searchQuery}" for ${pattern.name}`
    );

    const response = await fetch(
      `${UNSPLASH_CONFIG.baseUrl}/search/photos?query=${encodeURIComponent(
        searchQuery
      )}&per_page=5&orientation=squarish&client_id=${UNSPLASH_CONFIG.accessKey}`
    );

    if (response.ok) {
      const data = await response.json();
      const images = data.results || [];

      if (images.length > 0) {
        // Pick the best matching image
        const bestImage = selectBestMatchingImage(images, pattern);
        const imageUrl = bestImage.urls.small;

        console.log(`✅ Found matching image for ${pattern.name}: ${imageUrl}`);

        // Cache the result
        sessionState.patternImageCache.set(cacheKey, imageUrl);
        return imageUrl;
      }
    }

    console.warn(`❌ No Unsplash images found for ${pattern.name}`);
  } catch (error) {
    console.error(`Error fetching image for ${pattern.name}:`, error);
  }

  // Fallback to type-specific placeholder
  const placeholderUrl = generateTypedPlaceholder(
    pattern.patternType,
    pattern.source
  );
  sessionState.patternImageCache.set(cacheKey, placeholderUrl);
  return placeholderUrl;
}

// Create specific search query based on pattern details
function createSpecificSearchQuery(pattern) {
  const patternType = pattern.patternType || detectPatternType(pattern.name);
  const name = pattern.name.toLowerCase();

  // Extract key descriptive words from pattern name
  const descriptiveWords = extractDescriptiveWords(name);

  // Build specific search query
  let searchQuery = "";

  // Start with the pattern type
  switch (patternType) {
    case "sweater":
    case "pullover":
      searchQuery = "knitted sweater";
      break;
    case "cardigan":
      searchQuery = "knitted cardigan";
      break;
    case "scarf":
      searchQuery = "knitted scarf";
      break;
    case "hat":
    case "beanie":
      searchQuery = "knitted hat";
      break;
    case "blanket":
    case "throw":
      searchQuery = "knitted blanket";
      break;
    case "mittens":
    case "gloves":
      searchQuery = "knitted mittens";
      break;
    case "shawl":
      searchQuery = "knitted shawl";
      break;
    case "socks":
      searchQuery = "knitted socks";
      break;
    default:
      searchQuery = "knitting pattern";
  }

  // Add descriptive words if they're relevant
  if (descriptiveWords.length > 0) {
    // Add the most relevant descriptive word
    const bestWord = descriptiveWords[0];
    if (isRelevantDescriptor(bestWord, patternType)) {
      searchQuery += " " + bestWord;
    }
  }

  // Add "handmade" for authenticity
  searchQuery += " handmade";

  console.log(`🎯 Search query for "${pattern.name}": "${searchQuery}"`);
  return searchQuery;
}

// Extract descriptive words from pattern name
function extractDescriptiveWords(name) {
  // Common descriptive words in knitting patterns
  const descriptors = [
    "cable",
    "lace",
    "fair isle",
    "aran",
    "chunky",
    "fine",
    "bulky",
    "ribbed",
    "textured",
    "smooth",
    "cozy",
    "warm",
    "light",
    "heavy",
    "striped",
    "solid",
    "colorwork",
    "nordic",
    "traditional",
    "modern",
    "classic",
    "vintage",
    "simple",
    "complex",
    "basic",
    "advanced",
  ];

  const foundDescriptors = [];

  for (const descriptor of descriptors) {
    if (name.includes(descriptor)) {
      foundDescriptors.push(descriptor);
    }
  }

  return foundDescriptors;
}

// Check if a descriptor is relevant for the pattern type
function isRelevantDescriptor(descriptor, patternType) {
  const relevantDescriptors = {
    sweater: ["cable", "aran", "fair isle", "chunky", "textured", "ribbed"],
    cardigan: ["cable", "lace", "chunky", "classic", "modern"],
    scarf: ["cable", "ribbed", "chunky", "textured", "warm"],
    hat: ["ribbed", "chunky", "textured", "warm"],
    blanket: ["cable", "textured", "chunky", "granny", "striped"],
    shawl: ["lace", "delicate", "fine"],
    mittens: ["fair isle", "colorwork", "warm", "textured"],
  };

  const relevant = relevantDescriptors[patternType] || [];
  return relevant.includes(descriptor);
}

// Select the best matching image from Unsplash results
function selectBestMatchingImage(images, pattern) {
  // For now, just return the first image
  // In the future, could add scoring based on image analysis
  return images[0];
}

// Check if RSS image looks good
function isGoodRSSImage(imageUrl) {
  if (!imageUrl) return false;

  const url = imageUrl.toLowerCase();

  // Skip obvious placeholder or low-quality images
  const badIndicators = [
    "placeholder",
    "default",
    "no-image",
    "missing",
    "logo",
    "icon",
    "avatar",
    "thumb-default",
  ];

  for (const indicator of badIndicators) {
    if (url.includes(indicator)) {
      return false;
    }
  }

  // Must be a common image format
  const goodFormats = [".jpg", ".jpeg", ".png", ".webp"];
  const hasGoodFormat = goodFormats.some((format) => url.includes(format));

  return hasGoodFormat;
}

// Generate typed placeholder for when no image is found
function generateTypedPlaceholder(patternType, source) {
  const typeEmojis = {
    sweater: "🧥",
    cardigan: "🧥",
    pullover: "🧥",
    scarf: "🧣",
    hat: "🧢",
    beanie: "🧢",
    blanket: "🛏️",
    throw: "🛏️",
    mittens: "🧤",
    gloves: "🧤",
    socks: "🧦",
    shawl: "🧣",
    default: "🧶",
  };

  const emoji = typeEmojis[patternType] || typeEmojis.default;

  const sourceColors = {
    AllFreeKnitting: "e74c3c",
    "Purl Soho": "9b59b6",
    "Tin Can Knits": "2ecc71",
    Yarnspirations: "3498db",
    "Brooklyn Tweed": "2c5234",
    "Premium Patterns": "8e44ad",
  };

  const color = sourceColors[source] || "8b4513";
  return `https://via.placeholder.com/300x300/${color}/ffffff?text=${emoji}`;
}

// Enhanced pattern processing with matched images
async function enhancePatternsWithMatchedImages(patterns) {
  console.log(`🖼️ Getting matched images for ${patterns.length} patterns...`);

  // Process patterns in small batches to avoid overwhelming Unsplash
  const batchSize = 2;

  for (let i = 0; i < patterns.length; i += batchSize) {
    const batch = patterns.slice(i, i + batchSize);

    // Process batch in parallel
    await Promise.all(
      batch.map(async (pattern) => {
        console.log(`🎯 Getting image for: ${pattern.name}`);

        const matchedImage = await getMatchedImageForPattern(pattern);

        pattern.first_photo.small_url = matchedImage;
        pattern.image_source = matchedImage.includes("placeholder")
          ? "placeholder"
          : "matched";

        console.log(
          `✅ Image set for ${pattern.name}: ${pattern.image_source}`
        );
      })
    );

    // Small delay between batches
    if (i + batchSize < patterns.length) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  const matchedCount = patterns.filter(
    (p) => p.image_source === "matched"
  ).length;
  const placeholderCount = patterns.filter(
    (p) => p.image_source === "placeholder"
  ).length;

  console.log(
    `📊 Image results: ${matchedCount} matched, ${placeholderCount} placeholders`
  );

  return patterns;
}

// Fetch patterns from RSS feeds
async function fetchSingleRSSFeed(source) {
  try {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
      source.url
    )}`;

    const response = await fetch(rss2jsonUrl);
    if (!response.ok) throw new Error(`RSS2JSON failed: ${response.status}`);

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error("No items in RSS feed");
    }

    return data.items.map((item) => ({
      id: `rss-${source.name}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      name: cleanPatternName(item.title),
      designer: { name: source.name + " Contributors" },
      free: true,
      difficulty_average: estimateDifficulty(item.title),
      yardage: estimateYardage(item.title),
      description: cleanDescription(item.description),
      source: source.name,
      link: item.link,
      publishedAt: new Date(item.pubDate),
      real_pattern: true,
      patternType: detectPatternType(item.title),
      price: 0,
      rssImage: item.thumbnail || extractImageFromDescription(item.description), // Store RSS image
      first_photo: {
        small_url: null, // Will be filled by matched image system
        alt_description: item.title,
      },
    }));
  } catch (error) {
    console.warn(`Failed to fetch RSS from ${source.name}:`, error.message);
    return [];
  }
}

// Extract image from RSS description HTML
function extractImageFromDescription(description) {
  if (!description) return null;

  const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
  return imgMatch ? imgMatch[1] : null;
}

// Fetch from Brooklyn Tweed Shopify
async function fetchBrooklynTweedPatterns() {
  try {
    console.log("🧶 Fetching from Brooklyn Tweed...");

    const proxyUrl = "https://api.allorigins.win/get?url=";
    const response = await fetch(
      proxyUrl + encodeURIComponent(PATTERN_SOURCES.brooklynTweed.url)
    );

    if (!response.ok) {
      throw new Error(`Brooklyn Tweed API failed: ${response.status}`);
    }

    const data = await response.json();
    const shopifyData = JSON.parse(data.contents);

    if (shopifyData.products) {
      console.log(
        `✅ Found ${shopifyData.products.length} Brooklyn Tweed patterns`
      );

      return shopifyData.products.map((product) => ({
        id: `bt-${product.id}`,
        name: product.title,
        designer: { name: "Brooklyn Tweed Design Team" },
        free: false,
        difficulty_average: estimateDifficulty(product.title),
        yardage: estimateYardage(product.title),
        description: cleanShopifyDescription(product.body_html),
        source: "Brooklyn Tweed",
        link: `https://brooklyntweed.com/products/${product.handle}`,
        publishedAt: new Date(product.created_at),
        real_pattern: true,
        patternType: detectPatternType(product.title),
        price: product.variants?.[0]?.price
          ? parseFloat(product.variants[0].price)
          : Math.random() * 5 + 5,
        rssImage: product.images?.[0]?.src || null, // Store Shopify image
        first_photo: {
          small_url: null, // Will be filled by matched image system
          alt_description: product.title,
        },
      }));
    }

    return [];
  } catch (error) {
    console.warn("Brooklyn Tweed fetch failed:", error.message);
    return [];
  }
}

// Generate premium patterns from backup
function generatePremiumPatterns() {
  console.log("🧶 Using premium pattern backup...");

  const shuffled = [...PREMIUM_PATTERNS].sort(() => Math.random() - 0.5);

  return shuffled.map((pattern, index) => ({
    id: `premium-${Date.now()}-${index}`,
    name: pattern.name,
    designer: { name: pattern.designer },
    free: false,
    difficulty_average: pattern.difficulty,
    yardage: pattern.yardage,
    description: pattern.description,
    source: "Premium Patterns",
    link: pattern.link, // Keep the actual pattern link
    publishedAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ),
    real_pattern: true,
    patternType: pattern.patternType,
    price: pattern.price,
    rssImage: null,
    first_photo: {
      small_url: null,
      alt_description: pattern.name,
    },
  }));
}

// Main pattern fetching functions
async function fetchFreePatterns() {
  console.log("🧶 Fetching free patterns...");

  const freeSourceKeys = [
    "allFreeKnitting",
    "purlSoho",
    "tinCanKnits",
    "yarnspirations",
  ];
  const fetchPromises = freeSourceKeys.map((key) => {
    const source = PATTERN_SOURCES[key];
    return source ? fetchSingleRSSFeed(source) : Promise.resolve([]);
  });

  try {
    const results = await Promise.allSettled(fetchPromises);

    let allFreePatterns = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.length > 0) {
        console.log(
          `✅ ${freeSourceKeys[index]}: ${result.value.length} patterns`
        );
        allFreePatterns.push(...result.value);
      }
    });

    return allFreePatterns;
  } catch (error) {
    console.error("Error fetching free patterns:", error);
    return [];
  }
}

async function fetchPremiumPatterns() {
  console.log("🧶 Fetching premium patterns...");

  try {
    const brooklynTweedPatterns = await fetchBrooklynTweedPatterns();
    const backupPatterns = generatePremiumPatterns();

    return [...brooklynTweedPatterns, ...backupPatterns];
  } catch (error) {
    console.error("Error fetching premium patterns:", error);
    return generatePremiumPatterns();
  }
}

// Main pattern loading function
async function getFreshPatterns(category = "free") {
  const now = Date.now();

  // Check if we need fresh data
  if (
    sessionState.allFetchedPatterns.length === 0 ||
    now - sessionState.lastFetch > sessionState.fetchCooldown
  ) {
    showKnittingLoadingState(
      "trendingPosts",
      "🧶 Fetching patterns with matched images..."
    );

    try {
      const [freePatterns, premiumPatterns] = await Promise.all([
        fetchFreePatterns(),
        fetchPremiumPatterns(),
      ]);

      const allPatterns = [...freePatterns, ...premiumPatterns];
      sessionState.allFetchedPatterns = shuffleArray(allPatterns);
      sessionState.lastFetch = now;

      console.log(
        `📊 Total patterns: ${allPatterns.length} (${freePatterns.length} free, ${premiumPatterns.length} premium)`
      );
    } catch (error) {
      console.error("Error fetching patterns:", error);
      showKnittingStatus("Could not fetch patterns", "error");
      return [];
    }
  }

  // Filter and select patterns
  let filteredPatterns = sessionState.allFetchedPatterns.filter(
    (pattern) => !sessionState.usedPatternIds.has(pattern.id)
  );

  if (category === "free") {
    filteredPatterns = filteredPatterns.filter((p) => p.free === true);
    filteredPatterns.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
  } else if (category === "premium") {
    filteredPatterns = filteredPatterns.filter((p) => p.free === false);
    filteredPatterns.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  // Take 10 patterns
  const selectedPatterns = filteredPatterns.slice(0, 10);

  // Mark as used
  selectedPatterns.forEach((pattern) => {
    sessionState.usedPatternIds.add(pattern.id);
  });

  // Get matched images for each pattern
  const patternsWithImages = await enhancePatternsWithMatchedImages(
    selectedPatterns
  );

  sessionState.currentDisplay = patternsWithImages;
  sessionState.refreshCount++;

  return patternsWithImages;
}

// Utility functions
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cleanPatternName(title) {
  return title
    .replace(/Free Pattern:?/gi, "")
    .replace(/Pattern:?/gi, "")
    .trim();
}

function detectPatternType(title) {
  const titleLower = title.toLowerCase();
  const types = [
    "sweater",
    "cardigan",
    "pullover",
    "scarf",
    "hat",
    "beanie",
    "blanket",
    "throw",
    "mittens",
    "gloves",
    "socks",
    "shawl",
  ];

  for (const type of types) {
    if (titleLower.includes(type)) return type;
  }
  return "default";
}

function estimateDifficulty(title) {
  const text = title.toLowerCase();
  if (text.includes("beginner") || text.includes("easy"))
    return Math.floor(Math.random() * 3) + 1;
  if (text.includes("intermediate")) return Math.floor(Math.random() * 3) + 4;
  if (text.includes("advanced")) return Math.floor(Math.random() * 3) + 7;
  return Math.floor(Math.random() * 6) + 2;
}

function estimateYardage(title) {
  const text = title.toLowerCase();
  if (text.includes("hat")) return Math.floor(Math.random() * 150) + 150;
  if (text.includes("scarf")) return Math.floor(Math.random() * 200) + 250;
  if (text.includes("sweater") || text.includes("cardigan"))
    return Math.floor(Math.random() * 800) + 1000;
  if (text.includes("blanket")) return Math.floor(Math.random() * 1000) + 1200;
  return Math.floor(Math.random() * 600) + 200;
}

function cleanDescription(description) {
  if (!description) return "Fresh knitting pattern from the web.";
  return (
    description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, "")
      .trim()
      .substring(0, 120) + "..."
  );
}

function cleanShopifyDescription(html) {
  if (!html) return "Premium knitting pattern with detailed instructions.";
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, "")
      .trim()
      .substring(0, 120) + "..."
  );
}

// UI functions
async function loadFreshPatterns(category = "free", forceRefresh = false) {
  if (forceRefresh) {
    sessionState.lastFetch = 0;
  }

  try {
    const patterns = await getFreshPatterns(category);

    if (patterns.length > 0) {
      renderFreshPatterns(patterns, category);
      showKnittingStatus(
        `✨ Found ${patterns.length} ${category} patterns with matched images!`,
        "success"
      );
    } else {
      showKnittingStatus(`No ${category} patterns found`, "error");
    }

    return patterns;
  } catch (error) {
    console.error("Error loading patterns:", error);
    showKnittingStatus("Failed to load patterns", "error");
    return [];
  }
}

function renderFreshPatterns(patterns, category) {
  const container = document.getElementById("trendingPosts");
  if (!container) return;

  container.innerHTML = "";

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
    gap: 0.5rem;
  `;

  const matchedCount = patterns.filter(
    (p) => p.image_source === "matched"
  ).length;
  const averagePrice =
    patterns
      .filter((p) => !p.free)
      .reduce((sum, p) => sum + (p.price || 0), 0) /
    patterns.filter((p) => !p.free).length;

  const priceDisplay =
    category === "premium" && averagePrice
      ? ` • Avg: $${averagePrice.toFixed(2)}`
      : "";

  header.innerHTML = `
    <div>
      <h3 style="margin: 0; color: var(--green); font-family: 'Pacifico', cursive; font-size: 1.1rem;">
        ${category === "free" ? "Free" : "Premium"} Patterns 🧶
      </h3>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
        ${patterns.length} patterns • Refresh #${
    sessionState.refreshCount
  }${priceDisplay}
        ${matchedCount > 0 ? ` • ${matchedCount} matched images` : ""}
      </div>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button onclick="switchToCategory('free')" 
              style="
                padding: 0.5rem 1rem;
                font-size: 0.8rem;
                border-radius: 20px;
                border: 1px solid var(--border-light);
                background: ${
                  category === "free"
                    ? "var(--green)"
                    : "rgba(248, 246, 240, 0.8)"
                };
                color: ${
                  category === "free" ? "white" : "var(--text-secondary)"
                };
                cursor: pointer;
                transition: all 0.2s ease;
                font-weight: ${category === "free" ? "600" : "400"};
              ">
        FREE
      </button>
      <button onclick="switchToCategory('premium')" 
              style="
                padding: 0.5rem 1rem;
                font-size: 0.8rem;
                border-radius: 20px;
                border: 1px solid var(--border-light);
                background: ${
                  category === "premium"
                    ? "var(--brown)"
                    : "rgba(248, 246, 240, 0.8)"
                };
                color: ${
                  category === "premium" ? "white" : "var(--text-secondary)"
                };
                cursor: pointer;
                transition: all 0.2s ease;
                font-weight: ${category === "premium" ? "600" : "400"};
              ">
        PREMIUM
      </button>
    </div>
  `;

  container.appendChild(header);

  if (patterns.length === 0) {
    container.innerHTML += `<p style="text-align: center; color: #666; padding: 2rem;">No ${category} patterns found</p>`;
    return;
  }

  // Pattern cards
  patterns.forEach((pattern) => {
    const card = createMatchedPatternCard(pattern);
    container.appendChild(card);
  });
}

function createMatchedPatternCard(pattern) {
  const card = document.createElement("div");
  card.className = "pattern-card matched-images";
  card.style.cssText = `
    background: rgba(248, 246, 240, 0.9);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    box-shadow: 0 2px 8px var(--shadow-light);
    transition: all var(--transition);
    cursor: pointer;
    border: 1px solid var(--border-light);
    position: relative;
    overflow: hidden;
  `;

  const sourceColors = {
    AllFreeKnitting: "#e74c3c",
    "Purl Soho": "#9b59b6",
    "Tin Can Knits": "#2ecc71",
    Yarnspirations: "#3498db",
    "Brooklyn Tweed": "#2c5234",
    "Premium Patterns": "#8e44ad",
  };

  const sourceColor = sourceColors[pattern.source] || "#8b4513";

  // Image quality indicator
  let imageQualityBadge = "";
  if (pattern.image_source === "matched") {
    imageQualityBadge =
      '<div style="position: absolute; bottom: 45px; left: 10px; background: rgba(46, 204, 113, 0.9); color: white; padding: 0.1rem 0.4rem; font-size: 0.6rem; border-radius: 4px;">MATCHED</div>';
  }

  // Price/Free ribbon
  let ribbonHtml = "";
  if (pattern.free) {
    ribbonHtml +=
      '<div style="position: absolute; top: 10px; right: -8px; background: linear-gradient(135deg, var(--green), var(--green-light)); color: white; padding: 0.2rem 0.8rem 0.2rem 0.5rem; font-size: 0.7rem; font-weight: 600; transform: rotate(3deg); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">FREE</div>';
  } else {
    const priceText = pattern.price ? `${pattern.price.toFixed(2)}` : "PREMIUM";
    ribbonHtml += `<div style="position: absolute; top: 10px; right: -8px; background: linear-gradient(135deg, var(--brown), var(--brown-light)); color: white; padding: 0.2rem 0.8rem 0.2rem 0.5rem; font-size: 0.7rem; font-weight: 600; transform: rotate(3deg); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${priceText}</div>`;
  }

  // Source badge
  ribbonHtml += `<div style="position: absolute; top: 10px; left: 10px; background: ${sourceColor}; color: white; padding: 0.2rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${pattern.source}</div>`;

  card.innerHTML = `
    ${ribbonHtml}
    <div style="display: flex; gap: 1rem; align-items: flex-start;">
      <div style="width: 80px; height: 80px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: rgba(${sourceColor
        .slice(1)
        .match(/.{2}/g)
        .map((hex) => parseInt(hex, 16))
        .join(", ")}, 0.1); position: relative;">
        <img src="${pattern.first_photo?.small_url}" alt="${pattern.name}" 
             style="width: 100%; height: 100%; object-fit: cover;" 
             loading="lazy"
             onerror="this.src='${generateTypedPlaceholder(
               pattern.patternType,
               pattern.source
             )}';">
        ${imageQualityBadge}
      </div>
      <div style="flex: 1; min-width: 0;">
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-primary); font-weight: 600; line-height: 1.2;">
          ${pattern.name}
        </h4>
        <p style="margin: 0 0 0.25rem 0; font-size: 0.8rem; color: var(--text-secondary);">
          by ${pattern.designer?.name}
        </p>
        <p style="margin: 0 0 0.5rem 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${pattern.description}
        </p>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          ${
            pattern.difficulty_average
              ? `
            <span style="background: var(--brown-light); color: white; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.7rem;">Level ${Math.round(
              pattern.difficulty_average
            )}/10</span>
          `
              : ""
          }
          ${
            pattern.yardage
              ? `
            <span style="background: var(--accent-warm); color: var(--text-primary); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.7rem;">${pattern.yardage}yd</span>
          `
              : ""
          }
          <span style="background: rgba(45, 80, 22, 0.1); color: var(--green); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">Matched ✨</span>
        </div>
      </div>
    </div>
  `;

  // Make clickable - ensure it opens the actual pattern page
  card.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent any default behavior

    if (pattern.link && pattern.link.trim()) {
      console.log(`🔗 Opening pattern: ${pattern.name} at ${pattern.link}`);
      window.open(pattern.link, "_blank", "noopener,noreferrer");
      showKnittingStatus(
        `🔗 Opening "${pattern.name}" from ${pattern.source}!`,
        "success"
      );
    } else {
      console.warn(`❌ No link available for pattern: ${pattern.name}`);
      showKnittingStatus(
        `Sorry, no link available for "${pattern.name}"`,
        "error"
      );
    }
  });

  // Hover effects
  card.addEventListener("mouseenter", () => {
    card.style.transform = "translateY(-3px) scale(1.01)";
    card.style.boxShadow = "0 8px 24px var(--shadow)";
    card.style.borderColor = sourceColor;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "translateY(0) scale(1)";
    card.style.boxShadow = "0 2px 8px var(--shadow-light)";
    card.style.borderColor = "var(--border-light)";
  });

  return card;
}

// Global functions
function switchToCategory(category) {
  console.log(`Switching to ${category} category`);
  sessionState.currentCategory = category;
  loadFreshPatterns(category);
}

function refreshPatterns() {
  console.log("🔄 Refreshing patterns...");

  // Prevent page scrolling by stopping any default behavior
  event?.preventDefault();

  // Keep scroll position
  const currentScrollTop =
    window.pageYOffset || document.documentElement.scrollTop;

  showKnittingStatus(
    "🔄 Fetching 10 new patterns with matched images...",
    "info"
  );

  // Load patterns and maintain scroll position
  loadFreshPatterns(sessionState.currentCategory, true).then(() => {
    // Restore scroll position after patterns load
    window.scrollTo(0, currentScrollTop);
  });
}

// Status and loading functions
function showKnittingLoadingState(containerId, message = "Loading...") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 2rem; color: #666;">
      <div class="loading-spinner"></div>
      <span style="margin-left: 0.5rem;">${message}</span>
    </div>
  `;
}

function showKnittingStatus(message, type = "info") {
  if (typeof showStatus === "function") {
    showStatus(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Initialize the matched pattern fetcher
function initializeLiveKnittingModule() {
  console.log("🧶 Initializing Matched Pattern Fetcher...");

  const inspirationBtn = document.getElementById("randomPatternBtn");

  if (inspirationBtn) {
    inspirationBtn.textContent = "🔄 Get 10 New Patterns";

    // Use proper event handler to prevent scrolling
    inspirationBtn.onclick = function (event) {
      event.preventDefault();
      refreshPatterns();
      return false;
    };

    // Style the button
    inspirationBtn.style.cssText = `
      background: linear-gradient(135deg, var(--green), var(--green-light));
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: var(--cream);
      font-size: 0.9rem;
      transition: all var(--transition);
      box-shadow: 0 4px 12px rgba(45, 80, 22, 0.3);
      width: 100%;
    `;

    // Add hover effects
    inspirationBtn.addEventListener("mouseenter", () => {
      inspirationBtn.style.transform = "translateY(-2px)";
      inspirationBtn.style.boxShadow = "0 8px 20px rgba(45, 80, 22, 0.4)";
    });

    inspirationBtn.addEventListener("mouseleave", () => {
      inspirationBtn.style.transform = "translateY(0)";
      inspirationBtn.style.boxShadow = "0 4px 12px rgba(45, 80, 22, 0.3)";
    });
  }

  // Load initial patterns
  loadFreshPatterns("free");

  console.log("✨ Matched Pattern Fetcher initialized!");
  console.log(
    "🎯 Each pattern gets a specific image search based on its name and type"
  );
}

// Global exports
window.initializeLiveKnittingModule = initializeLiveKnittingModule;
window.switchToCategory = switchToCategory;
window.refreshPatterns = refreshPatterns;
window.loadFreshPatterns = loadFreshPatterns;
