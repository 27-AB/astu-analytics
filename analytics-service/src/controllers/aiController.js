const { GoogleGenerativeAI } = require("@google/generative-ai");
const AiCache = require("../models/AiCache");
const { getAggregatedAnalytics } = require("../services/aggregatorService");

// Initialize Gemini GenAI Client safely
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API:", err.message);
  }
}

/**
 * AI-Powered Translation (Amharic / Afaan Oromoo) with Caching & Offline fallback
 */
exports.translateText = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ success: false, message: "Missing text or targetLang." });
    }

    const langName = targetLang.toLowerCase() === "amharic" ? "Amharic" : "Afaan Oromoo";
    const cacheKey = `trans_${Buffer.from(text).toString("base64").slice(0, 100)}_${langName}`;

    // 1. Check cache first
    try {
      const cached = await AiCache.findOne({ type: "translation", key: cacheKey });
      if (cached) {
        return res.json({ success: true, translatedText: cached.content, source: "cache" });
      }
    } catch (dbErr) {
      console.warn("MongoDB Cache lookup error:", dbErr.message);
    }

    // 2. Try Gemini API
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Translate the following academic research or community project description from English into the language: "${langName}". 
        Maintain a professional, formal academic tone. Do not add any conversational remarks, introductions, or notes. Output ONLY the translated text.
        
        Text to translate:
        "${text}"`;

        const result = await model.generateContent(prompt);
        const translatedText = result.response.text().trim();

        // Save to cache asynchronously
        try {
          await AiCache.create({
            type: "translation",
            key: cacheKey,
            content: translatedText
          });
        } catch (dbSaveErr) {
          console.warn("Failed to write to translation cache:", dbSaveErr.message);
        }

        return res.json({ success: true, translatedText, source: "gemini" });
      } catch (geminiErr) {
        console.warn("Gemini translation call failed, falling back to offline mode:", geminiErr.message);
      }
    }

    // 3. Offline Fallback (Rules-based simulation for local demo/unlimited)
    const offlineTranslations = getOfflineTranslation(text, langName);
    return res.json({ 
      success: true, 
      translatedText: offlineTranslations, 
      source: "offline_fallback" 
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * AI Chat Copilot with Aggregation context & offline keyword-matching fallback
 */
exports.chatCopilot = async (req, res) => {
  try {
    const { message } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!message) {
      return res.status(400).json({ success: false, message: "Missing message." });
    }

    // Prepare cache key for this user message
    const cleanMsg = message.toLowerCase().trim();
    const cacheKey = `chat_${Buffer.from(cleanMsg).toString("base64").slice(0, 100)}`;

    // 1. Check cache first
    try {
      const cached = await AiCache.findOne({ type: "chat", key: cacheKey });
      if (cached) {
        return res.json({ success: true, reply: cached.content, source: "cache" });
      }
    } catch (dbErr) {
      console.warn("MongoDB Cache lookup error:", dbErr.message);
    }

    // Fetch system state context for the LLM
    let aggregatedData = null;
    try {
      if (token) {
        aggregatedData = await getAggregatedAnalytics(token);
      }
    } catch (aggErr) {
      console.warn("Could not fetch analytics context:", aggErr.message);
    }

    // 2. Try Gemini API
    if (genAI && aggregatedData) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Compile compact context of ASTU projects
        const projectsSummary = aggregatedData.recentProjects.map(p => ({
          title: p.title,
          lead: p.lead,
          college: p.college,
          status: p.status,
          funding: p.fundingETB || p.budgetETB || 0,
          source: p.source
        }));

        const statsSummary = aggregatedData.summary;

        const prompt = `You are the ASTU Research & Community AI Copilot, a helpful academic assistant at Adama Science and Technology University.
        Below is the current system telemetry and statistics:
        - Total Projects: ${statsSummary.totalProjects}
        - Research Projects: ${statsSummary.researchCount}
        - Community Outreach Projects: ${statsSummary.communityCount}
        - Active Colleges: ${statsSummary.activeColleges}
        - Total Funding: ${statsSummary.totalFundingETB} ETB
        - Total Publications: ${statsSummary.totalPublications}
        
        Recent key projects:
        ${JSON.stringify(projectsSummary, null, 2)}
        
        Answer the following question about ASTU's research and community outreach using the context above.
        Be professional, friendly, and concise. If the user asks for a proposal draft, feel free to generate a creative summary based on ASTU's focus areas (Computing, Agriculture, Solar, Infrastructure).
        
        User Question: "${message}"`;

        const result = await model.generateContent(prompt);
        const reply = result.response.text().trim();

        // Cache the reply
        try {
          await AiCache.create({
            type: "chat",
            key: cacheKey,
            content: reply
          });
        } catch (dbSaveErr) {
          console.warn("Failed to write to chat cache:", dbSaveErr.message);
        }

        return res.json({ success: true, reply, source: "gemini" });
      } catch (geminiErr) {
        console.warn("Gemini chatbot failed, falling back to local NLP:", geminiErr.message);
      }
    }

    // 3. Local NLP Keyword-Router Fallback
    const reply = getOfflineChatReply(message, aggregatedData);
    return res.json({ success: true, reply, source: "offline_fallback" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Matchmaking logic to suggest collaborators and related projects
 */
exports.getMatchmaking = async (req, res) => {
  try {
    const { projectId, source } = req.query;
    const token = req.headers.authorization?.split(" ")[1];

    if (!projectId || !source) {
      return res.status(400).json({ success: false, message: "Missing projectId or source." });
    }

    const cacheKey = `match_${projectId}_${source}`;

    // 1. Check cache
    try {
      const cached = await AiCache.findOne({ type: "matchmaking", key: cacheKey });
      if (cached) {
        return res.json({ success: true, matchResults: JSON.parse(cached.content), source: "cache" });
      }
    } catch (dbErr) {
      console.warn("Cache lookup failed:", dbErr.message);
    }

    // Fetch context
    let aggregatedData = null;
    try {
      if (token) aggregatedData = await getAggregatedAnalytics(token);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Failed to gather database context." });
    }

    const allProjects = [
      ...(aggregatedData.researchProjects || []).map(p => ({ ...p, type: "research" })),
      ...(aggregatedData.communityProjects || []).map(p => ({ ...p, type: "community" }))
    ];

    const currentProject = allProjects.find(p => p._id.toString() === projectId);
    if (!currentProject) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Matchmaking Similarity Algorithm (TF-IDF/Vector approximation in JS)
    const matches = [];
    const currentTags = currentProject.tags || [];
    const currentTitleWords = currentProject.title.toLowerCase().split(/\s+/);

    for (const p of allProjects) {
      if (p._id.toString() === projectId) continue;

      let score = 0;
      const reasons = [];

      // Tag match (high weight)
      const pTags = p.tags || [];
      const sharedTags = currentTags.filter(t => pTags.includes(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 25;
        reasons.push(`Shared research focus: ${sharedTags.join(", ")}`);
      }

      // College match (low weight)
      if (p.college === currentProject.college) {
        score += 15;
        reasons.push(`Same College: ${p.college.replace("College of ", "")}`);
      }

      // Title word match
      const pTitleWords = p.title.toLowerCase().split(/\s+/);
      const sharedWords = currentTitleWords.filter(w => w.length > 3 && pTitleWords.includes(w));
      if (sharedWords.length > 0) {
        score += sharedWords.length * 10;
        reasons.push(`Overlapping topic keywords: ${sharedWords.slice(0, 3).join(", ")}`);
      }

      if (score > 0) {
        matches.push({
          projectId: p._id,
          title: p.title,
          lead: p.lead || "ASTU Faculty",
          college: p.college,
          score: Math.min(score, 100),
          reasons
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 3);

    // Save to Cache
    try {
      await AiCache.create({
        type: "matchmaking",
        key: cacheKey,
        content: JSON.stringify(topMatches)
      });
    } catch (dbErr) {
      console.warn("Failed to write matchmaking to cache:", dbErr.message);
    }

    return res.json({ success: true, matchResults: topMatches, source: "local_algo" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Offline Translater Helper
 */
function getOfflineTranslation(text, lang) {
  // Common dictionary for seed projects
  const dict = {
    "AI-Powered Crop Disease Detection Using Deep Learning": {
      "Amharic": "በዲፕ ለርኒንግ በመጠቀም በሰው ሰራሽ አስተዋፅኦ የሰብል በሽታዎችን መለየት",
      "Afaan Oromoo": "Iko-sistema deebii AI tiin dhukkuba midhaanii adda baasuu"
    },
    "Solar-Powered Water Purification for Rural Ethiopia": {
      "Amharic": "ለኢትዮጵያ ገጠር አካባቢዎች በፀሐይ ኃይል የሚሰራ የውሃ ማጣሪያ",
      "Afaan Oromoo": "Humna aduutiin bishaan qulqulleessuu baadiyyaa Itoophiyaatiif"
    },
    "Seismic Risk Assessment of Adama Urban Infrastructure": {
      "Amharic": "የአዳማ ከተማ መሠረተ ልማት የመሬት መንቀጥቀጥ ስጋት ግምገማ",
      "Afaan Oromoo": "Giddugala misooma magaalaa Adaamaa irratti sodaa kirkira lafaa madaaluu"
    },
    "Developing a mobile-first deep learning system to detect crop diseases from smartphone photos, targeting smallholder farmers in Oromia region.": {
      "Amharic": "በኦሮሚያ ክልል አነስተኛ አራሾችን ታሳቢ ያደረገ፣ በስማርትፎን ፎቶዎች የሰብል በሽታዎችን ለመለየት የሚያስችል የሞባይል ዲፕ ለርኒንግ ስርዓት ማልማት።",
      "Afaan Oromoo": "Oromiyaa keessatti qonnan bultoota xixiqqoodhaaf bilbila harkaa fayyadamuun dhukkuba midhaanii addaan baasuuf deep learning mobile-first hojjechuu."
    },
    "Designing low-cost solar-driven water treatment units deployable in off-grid communities, with pilot testing in Afar and SNNP regions.": {
      "Amharic": "ከዋናው የኤሌክትሪክ መስመር ውጪ ለሚኖሩ ማህበረሰቦች የሚሆኑ አነስተኛ ዋጋ ያላቸው የፀሐይ ኃይል የውሃ ማከሚያ ክፍሎችን መንደፍ፣ በአፋር እና በደቡብ ክልሎች የአብራሪ ሙከራዎች ማድረግ።",
      "Afaan Oromoo": "Kanneen humna elektrikaa hin qabneef filter bishaan aduutiin hojjetu qopheessuu, naannoo Affaar fi Kibbaa keessatti yaaliidhaan jalqabuu."
    }
  };

  // Check exact dictionary match
  const t = text.trim();
  if (dict[t] && dict[t][lang]) {
    return dict[t][lang];
  }

  // Generic fallback if not in dictionary
  if (lang === "Amharic") {
    return `[የአማርኛ ትርጉም]: ${t.slice(0, 60)}... (Gemini API limit hit; served offline)`;
  } else {
    return `[Hiika Afaan Oromoo]: ${t.slice(0, 60)}... (Gemini API limit hit; served offline)`;
  }
}

/**
 * Offline Chat Router Helper
 */
function getOfflineChatReply(message, context) {
  const m = message.toLowerCase();

  if (m.includes("solar") || m.includes("water") || m.includes("purification")) {
    return `☀️ **Solar Research in ASTU**: 
    - The lead solar project is **"Solar-Powered Water Purification for Rural Ethiopia"** by **Prof. Almaz Tadesse** (College of Mechanical, Chemical & Materials Engineering).
    - It has a budget of **1,200,000 ETB** funded by World Bank / MoSHE.
    - Research covers off-grid water treatment in Afar and SNNP regions.`;
  }

  if (m.includes("ai") || m.includes("deep learning") || m.includes("machine learning") || m.includes("nlp")) {
    return `🤖 **Artificial Intelligence & NLP in ASTU**:
    - **Crop Disease Detection**: Led by **Dr. Tesfaye Worku** (850,000 ETB, Commissioned by ESTC).
    - **Amharic NLP**: Led by **Dr. Hana Tesfaye** (720,000 ETB, Google Research Africa).
    - **Amharic Speech-to-Text**: Under review proposal using transformers (920,000 ETB).`;
  }

  if (m.includes("funding") || m.includes("budget") || m.includes("money") || m.includes("etb")) {
    const totalFunding = context ? context.summary.totalFundingETB.toLocaleString() : "19,530,000";
    return `💰 **Funding & Grants Telemetry**:
    - **Total Active Funding**: ~${totalFunding} ETB.
    - The largest funded research is **"Geothermal Energy Exploration in Aluto-Langano"** with **3,200,000 ETB** funded by ICEIDA.
    - Go to the **Funding** tab in the sidebar to see interactive breakdowns by college and source.`;
  }

  if (m.includes("researcher") || m.includes("faculty") || m.includes("prof")) {
    return `👨‍🔬 **ASTU Researchers**:
    - The system tracks **14 faculty researchers** across all 7 colleges.
    - Top publishers include **Prof. Dawit Asfaw** (9 publications) and **Prof. Mekdes Bekele** (8 publications).
    - Go to the **Researchers** tab to view detailed publication cards.`;
  }

  if (m.includes("hello") || m.includes("hi") || m.includes("hey")) {
    return `👋 Hello! I am the **ASTU Research AI Copilot**. How can I help you today?
    You can ask me questions like:
    - *"Which project has the highest budget?"*
    - *"Who is doing research in AI?"*
    - *"Tell me about solar energy studies"*
    - *"How many publications does ASTU have?"*`;
  }

  return `🤖 **ASTU AI Copilot (Offline Mode)**:
  I received your query: *"${message}"*.
  
  To protect your API limits, I am currently running in offline Mode. Try asking about: **Solar**, **AI**, **Funding**, or **Researchers**.`;
}
