import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import fetch from "node-fetch"; // Needed to call Ollama
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Paynow } from "paynow";
import crypto from 'crypto';
import multer from 'multer';


dotenv.config();

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// --- CONFIGURATION ---
const OLLAMA_API_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL_NAME = "chikoro-ai";
const LIGHT_MODEL = "gemma3:1b"
const TOOL_SERVER_URL = "http://localhost:3080";

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID || "19208",
  process.env.PAYNOW_INTEGRATION_KEY || "1569d49f-67e7-4e3b-9b7c-168c7d37e312"
);

paynow.returnUrl = "https://www.chikoro-ai.com/api/v1/payments/status";
// This is your backend webhook URL that Paynow's servers will call
paynow.resultUrl = `https://www.chikoro-ai.com/enrol`;

// --- DATABASE CONNECTION ---
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env file.");
  process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = "mydatabase";
let db;

const connectToDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = 5000; // Increased delay to 5 seconds

  while (attempts < maxAttempts) {
    try {
      console.log(
        `Attempting to connect to MongoDB (Attempt ${
          attempts + 1
        }/${maxAttempts})...`
      );
      await client.connect();
      db = client.db(DB_NAME); // Assign the connected database to the global variable
      console.log("MongoDB connected successfully");
      return db; // Return the connected database instance
    } catch (error) {
      console.error("MongoDB connection error: ", error.message);
      attempts++;
      if (attempts >= maxAttempts) {
        console.error("Failed to connect to MongoDB after several attempts.");
        throw new Error("Failed to connect to MongoDB after several attempts");
      }
      console.log(`Retrying MongoDB connection in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  const JWT_SECRET = process.env.JWTPRIVATEKEY;
  if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not configured on the server.");
    return res.status(500).send({ message: "Server configuration error." });
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "Authentication failed. Please log in again." });
    }

    // ✅ FIX: Ensure both id and email are present in the payload
    if (!userPayload || !userPayload._id || !userPayload.email) {
      console.warn(
        "Authentication Failed: JWT payload is missing _id or email."
      );
      return res.status(403).send({ message: "Invalid token payload." });
    }

    // Attach the complete user info to the request object
    req.user = {
      id: userPayload._id,
      email: userPayload.email,
    };

    console.log(
      `Authentication Successful. User ID: ${req.user.id}, Email: ${req.user.email}`
    );
    next();
  });
};

// =================================================================================
// API v1 ROUTES
// =================================================================================
const apiRouter = express.Router();

// --- OLLAMA HELPER FUNCTION ---
async function getOllamaJson(
  messages,
  expectJson = false,
  modelName = OLLAMA_MODEL_NAME
) {
  const payload = {
    model:modelName,
    messages: messages,
    stream: false,
    ...(expectJson && { format: "json" }),
  };

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API Error (HTTP ${response.status}): ${errorText}`
      );
    }
    const responseJson = await response.json();
    return responseJson.message.content;
  } catch (error) {
    console.error("Error calling Ollama service:", error);
    throw error; // Re-throw to be caught by the route handler
  }
}

async function streamOllamaResponse(
  messages,
  res,
  modelName = OLLAMA_MODEL_NAME
) {
  const payload = {
    model: modelName,
    messages: messages,
    stream: true, // The key to making it fast!
  };

  try {
    const ollamaResponse = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(
        `Ollama API Error (HTTP ${ollamaResponse.status}): ${errorText}`
      );
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe the response body directly to the client
    // Each chunk from Ollama's stream is a line of JSON.
    // We parse it, extract the content, and send it to the client.
    for await (const chunk of ollamaResponse.body) {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");
      for (const line of lines) {
        const parsed = JSON.parse(line);
        if (parsed.message && parsed.message.content) {
          // Write the chunk in SSE format
          res.write(
            `data: ${JSON.stringify({ text: parsed.message.content })}\n\n`
          );
        }
        if (parsed.done) {
          // Signal the end of the stream
          res.write(`data: ${JSON.stringify({ event: "done" })}\n\n`);
          res.end();
          return;
        }
      }
    }
  } catch (error) {
    console.error("Error streaming from Ollama service:", error);
    // If an error occurs, make sure to end the response.
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Failed to stream response from AI service." });
    } else {
      res.end();
    }
  }
}

const extendTimeout = (timeoutMs = 300000) => { // 5 minutes default
  return (req, res, next) => {
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    next();
  };
};

// Enhanced conversation-with-pages route
apiRouter.post(
  "/chat/conversation-with-pages",
  authenticateUser,
  async (req, res) => {
    try {
      const { prompt, subject, pages } = req.body;
      const profileId = req.user.id;
      const BATCH_SIZE = 10; // Process 10 pages at a time. Adjust if needed.

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ error: "No pages were provided for analysis." });
      }
      
      const student = await db.collection("students").findOne({ _id: new ObjectId(profileId) });
      if (!student) {
        return res.status(404).json({ error: "Student not found." });
      }

      // --- STEP 1: EFFICIENTLY ANALYZE PAGES IN BATCHES ---
      console.log(`[Vision] Analyzing ${pages.length} pages in batches of ${BATCH_SIZE}...`);
      const OLLAMA_VISION_MODEL = "granite3.2-vision:latest";
      
      const base64Images = pages.map(pageDataUrl => pageDataUrl.split(',')[1]).filter(Boolean);
      if (base64Images.length === 0) {
        return res.status(400).json({ error: "No valid image pages were found." });
      }

      let combinedDocumentContext = "";
      
      // Loop through the images in chunks of BATCH_SIZE
      for (let i = 0; i < base64Images.length; i += BATCH_SIZE) {
        const batchImages = base64Images.slice(i, i + BATCH_SIZE);
        const batchNumber = (i / BATCH_SIZE) + 1;
        console.log(`[Vision] Processing Batch #${batchNumber} with ${batchImages.length} images.`);

        const extractionPrompt = `You are an expert document analysis assistant. I am sending you a batch of ${batchImages.length} pages from a larger document.
My main question is: "${prompt}"

Your task is to analyze ONLY this batch of pages. Extract any text, data, or concepts that are directly relevant to answering my question.
- Do NOT answer the question yourself.
- Do NOT add any conversational phrases.
- Your sole job is to extract the raw, relevant information from THIS BATCH.
- If nothing in this batch is relevant, respond with the single phrase: "No relevant information."`;

        const messagesForBatch = [{ 
            role: "user", 
            content: extractionPrompt, 
            images: batchImages 
        }];
        
        // Make an API call for the current batch
        const batchContext = await getOllamaJson(messagesForBatch, false, OLLAMA_VISION_MODEL);

        if (batchContext && batchContext.trim().toLowerCase() !== "no relevant information.") {
            combinedDocumentContext += batchContext + "\n\n"; // Append context from the successful batch
        }
      }
      
      // --- All batches are processed, now check if we found anything ---
      if (combinedDocumentContext.trim() === "") {
        console.warn(`[Vision] After processing all batches, no relevant context was found for prompt: "${prompt}"`);
        return res.status(404).json({ 
          success: false,
          response: "I've carefully reviewed the entire document, but I couldn't find any information relevant to your specific question. Please try asking about a different topic covered in the file." 
        });
      }
      
      // --- STEP 2: SYNTHESIZE A SINGLE, COHESIVE ANSWER ---
      console.log(`[Tutor] Synthesizing final answer for student ${profileId} from combined context.`);
      const systemInstruction = buildSystemInstruction(student.grade, student.curriculum || "ZIMSEC");
      
      const messagesForChatModel = [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `I have provided you with relevant context extracted from a document. Please use this information to help me answer my question.

My Question: "${prompt}"

--- Combined Document Context ---
${combinedDocumentContext}
--- End of Document Context ---

Now, please act as my tutor and provide a comprehensive answer based on the context.`
        }
      ];
      
      const finalResponse = await getOllamaJson(messagesForChatModel, false, OLLAMA_MODEL_NAME);

      res.json({
        success: true,
        response: finalResponse,
      });

    } catch (error) {
      console.error("Error in /chat/conversation-with-pages route:", error);
      if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            response: "An unexpected error occurred on the server while processing the document. This could be due to a problem with the AI service. Please try again later." 
          });
      }
    }
  }
);

/**
 * Optimized document processing function
 */
async function processDocumentPages(pages, prompt, systemInstruction, subject) {
  const OLLAMA_VISION_MODEL = "granite3.2-vision:latest";
  
  try {
    // For single page, process directly
    if (pages.length === 1) {
      return await processSinglePage(pages[0], prompt, systemInstruction, OLLAMA_VISION_MODEL);
    }

    // For multiple pages, use optimized multi-page processing
    return await processMultiplePages(pages, prompt, systemInstruction, OLLAMA_VISION_MODEL, subject);

  } catch (error) {
    console.error("Error in processDocumentPages:", error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

/**
 * Process a single page efficiently
 */
async function processSinglePage(pageData, prompt, systemInstruction, model) {
  const messages = [
    { role: "system", content: systemInstruction },
    {
      role: "user",
      content: `Please analyze this document page and help me with: "${prompt}"`,
      images: [pageData.replace(/^data:image\/[a-z]+;base64,/, '')]
    }
  ];

  return await getOllamaJson(messages, false, model);
}

/**
 * Process multiple pages with optimization
 */
async function processMultiplePages(pages, prompt, systemInstruction, model, subject) {
  // Convert pages to base64 without data URI prefix
  const imageData = pages.map(page => 
    page.replace(/^data:image\/[a-z]+;base64,/, '')
  );

  const messages = [
    { role: "system", content: systemInstruction },
    {
      role: "user",
      content: `Please analyze these ${pages.length} document pages and help me with: "${prompt}". 
                Subject context: ${subject}. 
                Please provide a comprehensive analysis that considers all pages together.`,
      images: imageData
    }
  ];

  return await getOllamaJson(messages, false, model);
}

/**
 * Enhanced conversation-with-file route with better optimization
 */
apiRouter.post(
  "/chat/conversation-with-file",
  authenticateUser,
  extendTimeout(180000), // 3 minute timeout for file uploads
  upload.single('file'),
  async (req, res) => {
    try {
      const { prompt, subject } = req.body;
      const file = req.file;
      const profileId = req.user.id;

      if (!file) {
        return res.status(400).json({ 
          success: false, 
          response: "No file was uploaded." 
        });
      }

      // Check file size (limit to 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          response: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload files smaller than 10MB.`
        });
      }

      const student = await db.collection("students").findOne({ 
        _id: new ObjectId(profileId) 
      });
      
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          response: "Student profile not found." 
        });
      }

      // Process based on file type
      const result = await processUploadedFile(
        file, 
        prompt, 
        subject, 
        student.grade, 
        student.curriculum || "ZIMSEC"
      );

      res.json({
        success: true,
        response: result,
        fileName: file.originalname,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

    } catch (error) {
      console.error("Error in /chat/conversation-with-file route:", error);
      
      if (error.message.includes('timeout')) {
        return res.status(408).json({
          success: false,
          response: "File processing timed out. Please try a smaller file or simpler query."
        });
      }

      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          response: "Failed to process the uploaded file due to a server error." 
        });
      }
    }
  }
);

/**
 * Process uploaded file with optimization
 */
async function processUploadedFile(file, prompt, subject, grade, curriculum) {
  const OLLAMA_VISION_MODEL = "granite3.2-vision:latest";
  const systemInstruction = buildSystemInstruction(grade, curriculum);

  // Optimize image processing
  let base64Image = file.buffer.toString('base64');
  
  // For very large images, you might want to compress them
  // This is a placeholder - implement actual image compression if needed
  if (file.size > 5 * 1024 * 1024) { // 5MB
    console.log(`Large image detected (${(file.size / 1024 / 1024).toFixed(1)}MB), processing...`);
    // Add image compression logic here if needed
  }

  const messages = [
    { role: "system", content: systemInstruction },
    {
      role: "user",
      content: `Please analyze this ${file.mimetype.includes('image') ? 'image' : 'document'} and help me with my question: "${prompt}"
                Subject: ${subject}`,
      images: [base64Image]
    }
  ];

  return await getOllamaJson(messages, false, OLLAMA_VISION_MODEL);
}

/**
 * Enhanced getOllamaJson with timeout and retry logic
 */
async function getOllamaJsonEnhanced(messages, stream = false, model, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying Ollama request (attempt ${attempt + 1}/${maxRetries + 1})`);
        // Add exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

      // Call your existing getOllamaJson function with timeout
      const result = await Promise.race([
        getOllamaJson(messages, stream, model),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ollama request timeout')), 240000) // 4 minutes
        )
      ]);

      return result;

    } catch (error) {
      lastError = error;
      console.error(`Ollama request attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('authentication') || 
          error.message.includes('not found') || 
          error.message.includes('invalid')) {
        break;
      }
    }
  }

  throw new Error(`Ollama request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}
apiRouter.get("/students/me", authenticateUser, async (req, res) => {
  // This route uses the ID from the secure token, not the URL.
  const authenticatedUserId = req.user.id; 

  try {
    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(authenticatedUserId) });

    if (!student) {
      // 404 is correct if the student profile doesn't exist for this user yet
      return res.status(404).json({ error: "Student profile not found." });
    }

    // If found, send the student data back
    res.json(student);
  } catch (error) {
    console.error("Error fetching student by authenticated ID:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching your profile." });
  }
});

apiRouter.get("/students/:id", authenticateUser, async (req, res) => {
  const requestedprofileId = req.params.id;
  const authenticatedUserId = req.user.id;

  // Security Check: A user should only be able to fetch their own data.
  if (requestedprofileId !== authenticatedUserId) {
    console.warn(
      `SECURITY ALERT: User ${authenticatedUserId} tried to access data for student ${requestedprofileId}.`
    );
    return res
      .status(403)
      .json({ error: "Forbidden: You can only access your own data." });
  }

  try {
    if (!ObjectId.isValid(requestedprofileId)) {
      return res.status(400).json({ error: "Invalid student ID format." });
    }

    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(requestedprofileId) });

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // If found, send the student data back as JSON
    res.json(student);
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching student data." });
  }
});

async function searchWithToolServer(query) {
    console.log(`[Main Server] Calling tool server to search for: "${query}"`);
    try {
        const response = await fetch(`${TOOL_SERVER_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) {
            throw new Error(`Tool server search failed with status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[Main Server] Error calling search tool:', error.message);
        return []; // Return empty array on failure
    }
}

async function scrapeWithToolServer(url) {
    console.log(`[Main Server] Calling tool server to scrape: "${url}"`);
    try {
        const response = await fetch(`${TOOL_SERVER_URL}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!response.ok) {
            throw new Error(`Tool server scrape failed with status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`[Main Server] Error calling scrape tool for ${url}:`, error.message);
        return `Failed to scrape content from ${url}.`; // Return error message on failure
    }
}

async function performGoogleSearch(query) {
  console.log(`Performing a live Google search for: ${query}`);

  // Google Custom Search API settings
  const customSearchApiKey = process.env.Search_API_KEY;
  const cx = process.env.Search_CX;

  if (!customSearchApiKey || !cx) {
    console.error(
      "Google Search API Key or CX not set in environment variables."
    );
    // In a real app, you might want to return an error message to the user
    return "The search service is not configured correctly on the server.";
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${customSearchApiKey}&cx=${cx}&q=${encodeURIComponent(
    query
  )}&num=10`; // Get top 5 results

  try {
    const searchResponse = await fetch(url);
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error(
        `Search API error: ${searchResponse.status} - ${searchResponse.statusText}`,
        errorBody
      );
      return `Sorry, I encountered an error while searching the web.`;
    }

    const searchData = await searchResponse.json();

    // If no results, return a clear message
    if (!searchData.items || searchData.items.length === 0) {
      return "I couldn't find any relevant results on the web for that query.";
    }

    // Format the search results into a simple string for the AI to process
    const formattedResults = searchData.items
      .map(
        (item, index) =>
          `Result ${index + 1}: [Title: ${item.title}, Snippet: ${
            item.snippet
          }, Link: ${item.link}]`
      )
      .join("\n");

    return formattedResults;
  } catch (error) {
    console.error("Error during performGoogleSearch:", error);
    return "There was a critical error with the search function.";
  }
}

// --- CORE CHAT ROUTE --
const buildSystemInstruction = (grade, curriculum) => {
  return `You are Chikoro AI, a personalised AI tutor for Zimbabwean students. Your core identity and instructions are:

**MEMORY & CONTEXT:**
- You have access to our full conversation history. Always reference and build upon previous discussions.
- Remember the student's learning progress, difficulties, and breakthroughs from earlier in our conversation.
- If the student asks about something we discussed before, acknowledge the previous conversation.
- Keep track of concepts you've already explained and build upon them progressively.

**PERSONA & APPROACH:**
- You are a friendly, patient, and encouraging tutor who remembers everything we've discussed.
- Current student level: ${grade} - adapt ALL explanations to this level.
- Use Zimbabwean context (places, culture, currency, examples) to make concepts relatable.
- Note that your primary language is Shona
- You can mix English and Shona naturally, especially if the student does.

**TEACHING METHOD - SOCRATIC APPROACH:**
- NEVER give direct answers. Your primary method is guiding through questions.
- Build on our conversation history when asking questions.
- If we've covered similar topics before, reference that learning: "Remember when we discussed..."
- Guide the student to the answer by asking leading questions that connect to what they already know.

**CURRICULUM & PROGRESSION:**
- Teaching aligns with ${curriculum} curriculum.
- Track the student's understanding level based on our conversation history.
- If they struggled with something before, approach it differently or provide more support.
- If they mastered a concept, introduce more challenging related ideas.

**ADAPTIVE LEARNING:**
- Adjust difficulty based on our conversation history and their responses.
- If they're struggling: simplify, provide more scaffolding, use familiar examples.
- If they're excelling: introduce complexity, make connections to advanced concepts.
- Remember their preferred learning style from previous interactions.

**CONVERSATION CONTINUITY:**
- Always maintain awareness of our ongoing conversation.
- Reference previous topics, questions, and the student's responses naturally.
- Build lessons that connect to earlier discussions.
- Acknowledge their progress: "You've improved since we first talked about this..."

**CHARACTER CONSISTENCY:**
- Never break character or mention that you are an AI model.
- Behave as a human tutor who has been working with this student over time.
- Show genuine interest in their learning journey and progress.

Remember: You are not just answering isolated questions - you are engaged in an ongoing educational relationship with this student. Use everything we've discussed to provide the most effective, personalized tutoring experience.`;
};

/**
 * Generates a set of diverse search queries based on the user's prompt
 * to maximize the chance of finding relevant information online.
 * @param {string} p The user's prompt.
 * @param {boolean} isDefQuestion A flag indicating if it's a definition question.
 * @returns {string[]} An array of unique search query strings.
 */
const generateSearchQueries = (p, isDefQuestion) => {
    const queries = new Set();
    const prompt = p.toLowerCase();
    queries.add(p); // Always add the original prompt

    // --- Definitions: Mwana we... (Young of animals) ---
    if (prompt.includes("mwana wembudzi")) queries.add("what is a baby goat called in Shona").add("Shona name for goat kid");
    if (prompt.includes("mwana wemombe")) queries.add("what is a calf called in Shona").add("Shona word for calf");
    if (prompt.includes("mwana weshumba")) queries.add("what is a lion cub called in Shona").add("Shona word for lion cub");
    if (prompt.includes("mwana wehuku")) queries.add("what is a chick called in Shona").add("Shona word for chick");
    if (prompt.includes("mwana weimbwa")) queries.add("what is a puppy called in Shona").add("Shona word for puppy");

    // --- Tsumo (Proverbs) ---
    if (prompt.includes("tsumo yekuti") || prompt.includes("chirevo chekuti") || prompt.includes("dudziro yetsumo")) {
        // Extract the proverb text itself
        const tsumoMatch = p.match(/['"](.*?)['"]/);
        if (tsumoMatch && tsumoMatch[1]) {
            const tsumo = tsumoMatch[1];
            queries.add(`meaning of shona proverb "${tsumo}"`);
            queries.add(`dudziro yetsumo "${tsumo}"`);
            queries.add(`"${tsumo}" tsumo meaning`);
        }
    }

    // --- People & History ---
    if (prompt.includes("mbuya nehanda")) queries.add("who was Mbuya Nehanda").add("history of Mbuya Nehanda");
    if (prompt.includes("oliver mtukudzi")) queries.add("Oliver Mtukudzi biography").add("when was oliver mtukudzi born");
    if (prompt.includes("robert mugabe")) queries.add("Robert Mugabe history").add("when did Robert Mugabe rule Zimbabwe");
    if (prompt.includes("tongai moyo")) queries.add("Tongai Moyo death date").add("Tongai Moyo biography");
    if (prompt.includes("jah prayzah")) queries.add("Jah Prayzah real name").add("Jah Prayzah latest album");
    if (prompt.includes("winky d")) queries.add("Winky D biography").add("Winky D real name Wallace Chirumiko");
    if (prompt.includes("hondo yechimurenga")) queries.add("First Chimurenga war dates").add("Second Chimurenga war history");
    if (prompt.includes("rusununguko") || prompt.includes("independence")) queries.add("When did Zimbabwe get independence").add("Zimbabwe independence day history 1980");
    if (prompt.includes("mutungamiri wenyika") || prompt.includes("president of zimbabwe")) queries.add("current president of Zimbabwe").add("who is the president of zimbabwe 2025");

    // --- Places & Geography ---
    if (prompt.includes("great zimbabwe")) queries.add("history of Great Zimbabwe").add("who built Great Zimbabwe ruins");
    if (prompt.includes("gomo renyangani") || prompt.includes("mount nyangani")) queries.add("where is Mount Nyangani").add("highest point in Zimbabwe");
    if (prompt.includes("victoria falls") || prompt.includes("mosi-oa-tunya")) queries.add("Victoria Falls location").add("history of Mosi-oa-Tunya");
    if (prompt.includes("zambezi river")) queries.add("Zambezi river map flow").add("countries Zambezi river passes through");
    if (prompt.includes("harare")) queries.add("capital city of Zimbabwe").add("history of Harare");

    // --- General Knowledge & Culture ---
    if (prompt.includes("sadza rinobikwa sei")) queries.add("how to cook sadza recipe").add("zimbabwean sadza ingredients");
    if (prompt.includes("mari ye zimbabwe") || prompt.includes("currency ye zimbabwe")) queries.add("current currency of Zimbabwe").add("what is the new currency in Zimbabwe 2025 ZiG");
    
    // Generic fallback for other definition questions
    if (isDefQuestion && p.includes(' ') && queries.size < 3) {
        const parts = p.split(' ');
        if (parts.length > 1) {
            const subject = parts.slice(0, -1).join(' ');
            queries.add(`"${subject}" meaning in english`);
            queries.add(`shona term for "${subject}"`);
        }
    }

    return Array.from(queries);
};

apiRouter.post("/chat/conversation", authenticateUser, async (req, res) => {
  try {
    const { prompt, history, curriculum } = req.body;
    const profileId = req.user.id;

    // --- Steps 1-6 remain unchanged ---
    const student = await db.collection("students").findOne({ _id: new ObjectId(profileId) });
    if (!student) return res.status(404).json({ error: "Student not found." });
    
    const grade = student?.grade || "unknown grade";
    const studentCurriculum = curriculum || student?.curriculum || "ZIMSEC";
    const systemInstruction = buildSystemInstruction(grade, studentCurriculum);

    let fullConversationHistory = [];
    if (curriculum && student.chatHistory && student.chatHistory[curriculum]) {
      fullConversationHistory = student.chatHistory[curriculum];
    }
    const clientHistory = history || [];
    const combinedHistory = [...fullConversationHistory];
    if (clientHistory.length > fullConversationHistory.length) {
      const newMessages = clientHistory.slice(fullConversationHistory.length);
      combinedHistory.push(...newMessages);
    }
    
    const MAX_CONTEXT_MESSAGES = 40;
    const PRIORITY_MESSAGES = 10;
    let contextHistory = [];
    if (combinedHistory.length <= MAX_CONTEXT_MESSAGES) {
      contextHistory = combinedHistory;
    } else {
      const recentMessages = combinedHistory.slice(-PRIORITY_MESSAGES);
      const olderMessages = combinedHistory.slice(0, -PRIORITY_MESSAGES);
      const sampledOlder = olderMessages.filter((_, index) => 
        index % Math.ceil(olderMessages.length / (MAX_CONTEXT_MESSAGES - PRIORITY_MESSAGES)) === 0
      );
      contextHistory = [...sampledOlder, ...recentMessages];
    }

    const formattedHistory = contextHistory.map((msg) => {
        let role = msg.role === "model" || msg.role === "assistant" || msg.type === "bot" ? "assistant" : "user";
        let content = msg.content || msg.message || msg.rawText || "";
        return { role, content: content.trim() };
    }).filter(msg => msg.content.length > 0);

    // --- Step 7: REFACTORED Enhanced Web Search with Expanded Patterns ---
    let searchEnhancedPrompt = prompt;
    let searchSucceeded = false;
    
    const recencyKeywords = /\b(current|latest|recent|today|now|2024|2025|news|update|breaking|live|price of)\b/i;
    const definitionKeywords = /\b(what is|what's|how do i|who is|where can i find| when did|why does|is it true that|can you explain|how to ifx|what to do when|chii chinonzi|anonzi|ndiani|sei|riini|kupi|yakavakwa|inowanikwa|unozviita sei|ndiani anonzi|ndiani|ndingawanepi|nditsanangurire|ndiudze|nei|sei|anonzi)\b/i;
    const isDefinitionQuestion = definitionKeywords.test(prompt);
    
    // The trigger is now broader, catching questions about people (ndiani), places (kupi), dates (rini), etc.
    const needsSearch = recencyKeywords.test(prompt) || isDefinitionQuestion || prompt.toLowerCase().includes("tsumo yekuti");
    
    if (needsSearch) {
      console.log(`[Search] Enhanced search triggered for: "${prompt}"`);
      
      try {
        // Use the new expanded pattern generator
        const searchQueries = generateSearchQueries(prompt, isDefinitionQuestion);
        console.log(`[Search] Generated ${searchQueries.length} unique queries:`, searchQueries);

        const searchPromises = searchQueries.map(q => searchWithToolServer(q));
        const searchResultsArray = await Promise.all(searchPromises);

        const allResults = searchResultsArray.flat();
        const uniqueUrls = new Set();
        const uniqueResults = allResults.filter(result => {
            if (result && result.url && !uniqueUrls.has(result.url)) {
                uniqueUrls.add(result.url);
                return true;
            }
            return false;
        });

        if (uniqueResults.length > 0) {
          console.log(`[Search] Found ${uniqueResults.length} unique results from multiple queries.`);
          
          const scrapePromises = uniqueResults.slice(0, 3).map(result =>
            scrapeWithToolServer(result.url).catch(err => {
              console.warn(`[Search] Failed to scrape ${result.url}:`, err.message);
              return `Failed to access content from ${result.url}`;
            })
          );
          
          const scrapedContents = await Promise.all(scrapePromises);
          const validContent = scrapedContents
            .filter(content => content && !content.startsWith("Failed to"))
            .join("\n\n---\n\n");
          
          if (validContent.trim().length > 50) {
            const truncatedContent = validContent.length > 4000 ? validContent.substring(0, 4000) + "... [content truncated]" : validContent;
            searchEnhancedPrompt = `Based on the following information, help me understand my question: "${prompt}".\n\n[Information found online:]\n${truncatedContent}\n\nNow, guide me to the answer for my question: "${prompt}"`;
            searchSucceeded = true;
            console.log("[Search] Enhanced prompt with scraped web content.");
          } else {
            const snippets = uniqueResults.slice(0, 4).map(item => `[Source: ${item.title}]\nSnippet: ${item.snippet || 'N/A'}`).join("\n\n");
            if (snippets.trim().length > 0) {
                 searchEnhancedPrompt = `Based on these summaries from a web search, help me understand my question: "${prompt}".\n\n[Search Summaries:]\n${snippets}\n\nNow, guide me to the answer for my question: "${prompt}"`;
                searchSucceeded = true;
                console.log("[Search] Enhanced prompt with search snippets as fallback.");
            }
          }
        }
      } catch (searchError) {
        console.warn("[Search] Multi-query search failed:", searchError.message);
      }
    }

    // --- Steps 8-10 remain unchanged ---
    const messagesForOllama = [
      { role: "system", content: systemInstruction },
      ...formattedHistory,
      { role: "user", content: searchEnhancedPrompt }
    ];

    console.log(`[Context Debug] Final prompt to LLM is search-enhanced: ${searchSucceeded}`);
    
    return streamOllamaResponse(messagesForOllama, res, OLLAMA_MODEL_NAME);

  } catch (error) {
    console.error("Error in chat route:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process your request." });
    }
  }
});

// --- DYNAMIC CARDS ROUTE ---
apiRouter.get("/chat/dynamic-cards", authenticateUser, async (req, res) => {
  try {
    const { subject } = req.query;
    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(req.user.id) });
    const grade = student?.grade || "unknown grade";

    const GENERATION_MODEL = "gemma3:1b";

    const prompt = `Generate exactly 4 learning topic suggestions for a ${grade} student in Zimbabwe studying ${subject}. Format each suggestion as a question a student would ask. Requirements: Use simple language. Do NOT use any numbering or bullet points. Separate each question with a newline. Example: How do I solve for x in an equation?`;

    const responseText = await getOllamaJson(
      [{ role: "user", content: prompt }],
      false,
      GENERATION_MODEL
    );
    const cards = responseText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    res.json(cards);
  } catch (error) {
    res.status(500).json([]); // Send empty array on error
  }
});

apiRouter.post("/students/history/update", authenticateUser, async (req, res) => {
  try {
    const profileId = req.user.id;
    const { subject, userMessage, modelResponse, attachment } = req.body;
    
    if (!subject || userMessage === undefined || modelResponse === undefined) {
      return res.status(400).json({ error: "Missing required history parameters" });
    }

    const studentsCollection = db.collection("students");
    
    // Create properly formatted entries with ALL required fields
    const userEntry = {
      type: "user",
      role: "user",
      message: userMessage,
      content: userMessage, // For API consistency
      timestamp: new Date(),
    };
    
    if (attachment) {
      userEntry.attachment = attachment;
    }

    const modelEntry = {
      type: "model",
      role: "assistant",
      message: modelResponse,
      content: modelResponse, // For API consistency
      timestamp: new Date(),
    };

    // Update the student's chat history
    const result = await studentsCollection.updateOne(
      { _id: new ObjectId(profileId) },
      {
        $push: {
          [`chatHistory.${subject}`]: {
            $each: [userEntry, modelEntry],
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found." });
    }

    console.log(`[History] Updated chat history for subject: ${subject} (${profileId})`);
    
    // Also log the entries for debugging
    console.log(`[History] Added entries:`, {
      user: { type: userEntry.type, messageLength: userEntry.message.length },
      model: { type: modelEntry.type, messageLength: modelEntry.message.length }
    });

    res.json({ success: true, message: "History updated successfully." });
    
  } catch (error) {
    console.error("Error in /students/history/update route:", error);
    res.status(500).json({ error: "Failed to update history." });
  }
});

// Also add a route to get history for debugging
apiRouter.get("/students/history/:subject", authenticateUser, async (req, res) => {
  try {
    const profileId = req.user.id;
    const subject = req.params.subject;
    
    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(profileId) });
    
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }
    
    const history = student.chatHistory?.[subject] || [];
    
    console.log(`[History Debug] Retrieved ${history.length} messages for ${subject}`);
    
    res.json({
      success: true,
      subject: subject,
      messageCount: history.length,
      history: history
    });
    
  } catch (error) {
    console.error("Error in /students/history/:subject route:", error);
    res.status(500).json({ error: "Failed to retrieve history." });
  }
});

apiRouter.get(
  "/students/:id/history/:subject",
  authenticateUser,
  async (req, res) => {
    const profileId = req.params.id; // ID from URL param
    const subject = req.params.subject;

    // Security Check: Ensure the requested ID matches the authenticated user's ID
    if (req.user.id !== profileId) {
      console.warn(
        `Authenticated user ${req.user.id} attempted to access chat history for student ID ${profileId}. Forbidden.`
      );
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: "Database not connected" });
    }

    try {
      const database = db; // Use the global db connection
      const collection = database.collection("students");

      if (!ObjectId.isValid(profileId)) {
        console.error(
          "Invalid profileId format from authenticated user ID:",
          profileId
        );
        return res.status(400).json({ error: "Invalid user ID format" });
      }

      const student = await collection.findOne(
        { _id: new ObjectId(profileId) },
        { projection: { chatHistory: 1 } } // Only fetch chatHistory field
      );

      if (student && student.chatHistory && student.chatHistory[subject]) {
        // Return chat history for specific subject
        res.json(student.chatHistory[subject]);
      } else {
        // Return empty array if student not found or no history for subject
        res.json([]);
      }
    } catch (error) {
      console.error("Error retrieving chat history:", error);
      res.status(500).json({ error: "Failed to retrieve chat history" });
    }
  }
);

// --- TEST GENERATION ROUTE ---
apiRouter.post("/tests/generate", authenticateUser, async (req, res) => {
  try {
    const { subject, gradeLevel, numQuestions = 15 } = req.body;
    const profileId = req.user.id;
    const GENERATION_MODEL = "gemma3:1b";

    if (!subject || !gradeLevel) {
      return res
        .status(400)
        .json({ error: "Subject and grade level are required." });
    }

    // --- 1. Fetch student's chat history for the subject ---
    const student = await db.collection("students").findOne(
        { _id: new ObjectId(profileId) },
        { projection: { [`chatHistory.${subject}`]: 1 } }
    );

    const chatHistory = student?.chatHistory?.[subject] || [];
    let formattedHistory = "No recent conversation history found for this subject.";

    if (chatHistory.length > 0) {
        // Take the last 20 messages and format them for the prompt
        formattedHistory = chatHistory
            .slice(-20)
            .map(item => `${item.type === 'user' ? 'Student' : 'Tutor'}: ${item.message}`)
            .join("\n");
    }

    // --- 2. Construct the detailed, history-aware prompt ---
    const generationPrompt = `
        You are an expert test creator for a ${gradeLevel} student in Zimbabwe. 
        Your task is to create a personalized test based on the student's recent conversation history in the subject of ${subject}.

        **Recent Conversation History:**
        """
        ${formattedHistory}
        """

        **Instructions:**
        1. Create a test with exactly ${numQuestions} questions.
        2. The questions MUST be based on the topics discussed in the conversation history provided above. Focus on the areas where the student asked questions or seemed to be learning new concepts. If the history is empty, create a general test for the subject and grade.
        3. Include a mix of "multiple-choice" and "short-answer" questions.
        4. Return ONLY a valid JSON object. Do not include any other text, markdown, or comments.
        5. The JSON object must follow this exact structure: { "subject": "${subject}", "gradeLevel": "${gradeLevel}", "questions": [ { "type": "multiple-choice", "question": "Example question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "Option B" }, { "type": "short-answer", "question": "Example short-answer question?", "correctAnswer": "A brief, ideal answer.", "gradingRubric": "Criteria for grading the answer." } ] }
    `;

    // --- 3. Call Ollama and get the response ---
    // ✅ FIX: Using the correct getOllamaJson function
    const responseText = await getOllamaJson(
      [{ role: "user", content: generationPrompt }],
      true,
      GENERATION_MODEL
    );

    // Clean the response to ensure it's valid JSON
    const cleanedJson = responseText.replace(/```json\s*|\s*```/g, "").trim();

    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error("Error in /tests/generate route:", error);
    res.status(500).json({ error: "Failed to generate test questions." });
  }
});

apiRouter.post("/tests/grade", authenticateUser, async (req, res) => {
  const { test, answers } = req.body;
  const profileId = req.user.id;
  const GRADING_MODEL = "gemma3:1b";

  if (
    !test ||
    !test.questions ||
    !answers ||
    test.questions.length !== answers.length
  ) {
    return res
      .status(400)
      .json({ error: "Invalid or incomplete test data provided." });
  }

  try {
    const gradingResults = [];
    for (const [index, question] of test.questions.entries()) {
      const studentAnswer = answers[index];

      if (!studentAnswer) {
        gradingResults.push({ questionIndex: index, error: "No answer provided" });
        continue;
      }

      const gradingPrompt = `
        You are an expert AI tutor. Evaluate the student's answer. Return ONLY a valid JSON object.
        Question: ${question.question}
        Student's Answer: ${studentAnswer}
        ${
          question.type === "multiple-choice"
            ? `Correct Answer: ${question.correctAnswer}\nJSON Format: {"questionIndex": ${index}, "isCorrect": boolean, "feedback": "A one-sentence explanation."}`
            : `Ideal Answer: ${question.correctAnswer}\nJSON Format: {"questionIndex": ${index}, "score": /* 0-100 */, "feedback": "Detailed feedback.", "strengths": ["..."], "improvements": ["..."]}`
        }
      `;

      try {
        const responseText = await getOllamaJson(
          [{ role: "user", content: gradingPrompt }],
          true,
          GRADING_MODEL
        );

        const cleanedResponse = responseText.replace(/```json\s*|\s*```/g, "").trim();
        let evaluation = JSON.parse(cleanedResponse);
        gradingResults.push(evaluation);
      } catch (aiError) {
        console.error(`Ollama grading error for question ${index}:`, aiError);
        gradingResults.push({ questionIndex: index, error: `AI evaluation failed: ${aiError.message}` });
      }
    }

    let totalScore = 0;
    let totalPossiblePoints = 0;
    gradingResults.forEach((result, index) => {
        const question = test.questions[index];
        const questionWeight = question.weight || 1;
        totalPossiblePoints += questionWeight;

        if (result.isCorrect === true) {
            totalScore += questionWeight;
        } else if (typeof result.score === "number") {
            totalScore += (result.score / 100) * questionWeight;
        }
    });

    const finalPercentage = totalPossiblePoints > 0 
        ? Math.round((totalScore / totalPossiblePoints) * 100) 
        : 0;

    // --- ✅ 1. DETERMINE PROFICIENCY LEVEL ---
    let proficiencyLevel = 'Beginner';
    if (finalPercentage >= 91) {
        proficiencyLevel = 'Expert';
    } else if (finalPercentage >= 80) {
        proficiencyLevel = 'Advanced';
    } else if (finalPercentage >= 60) {
        proficiencyLevel = 'Proficient';
    } else if (finalPercentage >= 40) {
        proficiencyLevel = 'Developing';
    }

    const summaryPrompt = `
      You are an AI learning coach analyzing a student's test results. The final score is ${finalPercentage}%.
      Based on the results below, generate a helpful and encouraging summary. Return ONLY a valid JSON object.
      Results: ${JSON.stringify(gradingResults, null, 2)}
      JSON Format: {"strengths": ["..."], "improvements": ["..."], "recommendations": ["..."], "feedback": "..."}
    `;

    let summaryData = {};
    try {
      const summaryResponseText = await getOllamaJson(
        [{ role: "user", content: summaryPrompt }],
        true,
        GRADING_MODEL
      );
      const cleanedSummary = summaryResponseText.replace(/```json\s*|\s*```/g, "").trim();
      summaryData = JSON.parse(cleanedSummary);
    } catch (summaryError) {
      console.error("Ollama summary generation error:", summaryError);
      summaryData = { feedback: `Final score is ${finalPercentage}%.`, strengths: [], improvements: [], recommendations: [] };
    }

    const finalResultsPayload = {
      testMeta: {
        subject: test.subject,
        gradeLevel: test.gradeLevel,
        totalQuestions: test.questions.length,
      },
      results: gradingResults,
      summary: { overallScore: finalPercentage, ...summaryData },
    };

    // --- ✅ 2. ASSEMBLE THE OBJECT TO BE SAVED IN THE DATABASE ---
    const testToSave = {
      _id: new ObjectId(),
      subject: test.subject,
      score: finalPercentage,
      date: new Date(),
      totalQuestions: test.questions.length, // Added field
      proficiencyLevel: proficiencyLevel,     // Added field
      details: finalResultsPayload,
    };

    const pointsEarned = Math.round(finalPercentage / 10);
    const gamificationUpdates = {
      $inc: { "gamification.totalPoints": pointsEarned },
    };

    if (finalPercentage >= 90) {
      const newBadge = {
        id: `high_scorer_${test.subject.toLowerCase().replace(" ", "_")}`,
        name: `High Scorer (${test.subject})`,
        description: `Scored ${finalPercentage}% on a ${test.subject} test.`,
        earnedDate: new Date(),
        icon: "../../assets/advanced_proficiency.png",
      };
      gamificationUpdates.$addToSet = { "gamification.badges": newBadge };
    }

    await db.collection("students").updateOne(
      { _id: new ObjectId(profileId) },
      {
        $push: { tests: testToSave },
        ...gamificationUpdates,
      }
    );
    console.log(`Saved test and awarded ${pointsEarned} points to student ${profileId}`);
    if (gamificationUpdates.$addToSet) {
      console.log(`Awarded badge to student ${profileId}`);
    }

    res.json({
      ...finalResultsPayload,
      pointsAwarded: pointsEarned,
    });
  } catch (error) {
    console.error("Critical error in /tests/grade route:", error);
    res.status(500).json({ error: "A critical error occurred during the grading process." });
  }
});



// Get tests for a student
// Apply authentication middleware
apiRouter.get("/students/:id/tests", authenticateUser, async (req, res) => {
  // <-- Middleware applied here
  const profileId = req.params.id; // ID from URL param

  // Added logging to see IDs side-by-side
  console.log(`Accessing /students/${profileId}/tests`);
  console.log(`  ID from Token (req.user.id): ${req.user.id}`);
  console.log(`  ID from URL (req.params.id): ${profileId}`);

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== profileId) {
    console.warn(
      `AUTHORIZATION FAILED: Authenticated user ${req.user.id} attempted to access tests for student ID ${profileId}. Forbidden.`
    );
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    // Validate the student ID
    if (!ObjectId.isValid(profileId)) {
      console.error(
        "Invalid student ID format from authenticated user ID:",
        profileId
      );
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: "Database not connected" });
    }

    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(profileId) },
      { projection: { tests: 1 } } // Only fetch tests field
    );

    if (!student) {
      console.warn(
        `Student not found for tests retrieval for user ID: ${profileId}`
      );
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student.tests || []); // Return tests array or empty array
  } catch (error) {
    console.error("Error retrieving tests:", error);
    res.status(500).json({ error: "Failed to retrieve test results" });
  }
});


// Get tests for a student
// Apply authentication middleware
apiRouter.get("/students/:id/tests", authenticateUser, async (req, res) => {
  // <-- Middleware applied here
  const profileId = req.params.id; // ID from URL param

  // Added logging to see IDs side-by-side
  console.log(`Accessing /students/${profileId}/tests`);
  console.log(`  ID from Token (req.user.id): ${req.user.id}`);
  console.log(`  ID from URL (req.params.id): ${profileId}`);

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== profileId) {
    console.warn(
      `AUTHORIZATION FAILED: Authenticated user ${req.user.id} attempted to access tests for student ID ${profileId}. Forbidden.`
    );
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    // Validate the student ID
    if (!ObjectId.isValid(profileId)) {
      console.error(
        "Invalid student ID format from authenticated user ID:",
        profileId
      );
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: "Database not connected" });
    }

    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(profileId) },
      { projection: { tests: 1 } } // Only fetch tests field
    );

    if (!student) {
      console.warn(
        `Student not found for tests retrieval for user ID: ${profileId}`
      );
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student.tests || []); // Return tests array or empty array
  } catch (error) {
    console.error("Error retrieving tests:", error);
    res.status(500).json({ error: "Failed to retrieve test results" });
  }
});

apiRouter.get(
  "/students/:id/gamification",
  authenticateUser,
  async (req, res) => {
    // <-- Middleware applied here
    // --- Added log at the very beginning of the route handler ---
    console.log(`Entering /students/:id/gamification route handler.`);
    console.log(`  State of req.user upon entry: ${JSON.stringify(req.user)}`);
    // --- End Added log ---

    const profileId = req.params.id; // ID from URL param

    // Added logging to see IDs side-by-side
    console.log(`Accessing /students/${profileId}/gamification`);
    console.log(`  ID from Token (req.user.id): ${req.user.id}`);
    console.log(`  ID from URL (req.params.id): ${profileId}`);

    // --- SECURITY NOTE: Reinstated the authorization check below ---
    // This now requires the authenticated user ID to match the student ID in the URL.
    if (req.user.id !== profileId) {
      console.warn(
        `AUTHORIZATION FAILED: Authenticated user ${req.user.id} attempted to access gamification for student ID ${profileId}. Forbidden.`
      );
      return res.status(403).json({ error: "Forbidden" });
    }
    // --- End Security Note ---

    if (!ObjectId.isValid(profileId)) {
      console.error(
        "Invalid student ID format from authenticated user ID:",
        profileId
      );
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: "Database not connected" });
    }

    try {
      const database = db; // Use the global db connection
      const collection = database.collection("students");

      const student = await collection.findOne(
        { _id: new ObjectId(profileId) },
        { projection: { gamification: 1 } } // Only fetch gamification field
      );

      // Return gamification data or default empty structure
      res.json(
        student?.gamification || {
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          level: 1,
          badges: [],
        }
      );
    } catch (error) {
      console.error("Error fetching gamification data:", error);
      res.status(500).json({ error: "Failed to fetch gamification data" });
    }
  }
);

// --- GET PROGRESS DASHBOARD DATA ---
apiRouter.get("/students/:id/progress", authenticateUser, async (req, res) => {
  // Security Check
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    // This is where you would call your backend helper functions to calculate metrics
    const progressData = {
      subjectsStudied: 1, // Replace with call to: calculateSubjectsStudiedLast24Hours(student.chatHistory),
      totalStudyTime: 60, // Replace with call to: calculateTotalStudyTime(student.chatHistory),
      completedTests: student.tests?.length || 0,
      // Include other metrics your frontend needs
    };
    res.json(progressData);
  } catch (error) {
    console.error("Error fetching progress data:", error);
    res.status(500).json({ error: "Failed to fetch progress data" });
  }
});

apiRouter.get(
  "/students/by-email/:email",
  authenticateUser,
  async (req, res) => {
    const requestedEmail = req.params.email.toLowerCase();
    const authenticatedUserEmail = req.user.email; // Assumes your JWT payload includes email

    // Security Check: Ensure the logged-in user can only fetch their own profile by email
    if (requestedEmail !== authenticatedUserEmail) {
      return res
        .status(403)
        .json({ error: "Forbidden: You can only view your own profile." });
    }

    try {
      const student = await db
        .collection("students")
        .findOne({ email: requestedEmail });

      if (student) {
        res.json(student);
      } else {
        res.status(404).json({ error: "Student profile not found." });
      }
    } catch (error) {
      console.error("Error fetching student by email:", error);
      res.status(500).json({ error: "Server error while fetching profile." });
    }
  }
);

apiRouter.post("/students", authenticateUser, async (req, res) => {
  // The user's email will come from the authenticated token, not the form body.
  const userEmail = req.user.email; // Assuming email is in your JWT payload
  const { name, age, academicLevel, curriculum, grade } = req.body;

  if (!name || !age || !academicLevel || !curriculum || !grade) {
    return res.status(400).json({ error: "Missing required student fields." });
  }

  try {
    const studentsCollection = db.collection("students");

    // Check if a student profile already exists for this user
    const existingStudent = await studentsCollection.findOne({
      _id: new ObjectId(req.user.id),
    });
    if (existingStudent) {
      return res.status(409).json({
        error: "A student profile already exists for this account.",
        student: existingStudent,
      });
    }

    // Create the new student document
    const newStudent = {
      _id: new ObjectId(req.user.id), // Link to the user's auth ID
      email: userEmail,
      name,
      age: parseInt(age, 10),
      academicLevel,
      curriculum,
      grade,
        role: "student",
      chatHistory: {},
      tests: [],
      goals: [],
      studySessions: [], // Initialize empty study sessions array
      gamification: {
        // Initialize gamification fields
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        level: 1,
        badges: [],
      },
      subscription: {
        // Initialize subscription fields
        status: "none",
        expirationDate: null,
        plan: null,
        updatedAt: null,
        paymentPollUrl: null,
      },
      trial_messages_used: 0, // Initialize trial fields
      trial_start_date: new Date(), // Set trial start date on creation
      is_trial_expired: false,
      createdAt: new Date(),
    };

    const result = await studentsCollection.insertOne(newStudent);

    // Return the newly created student object
    res.status(201).json(newStudent);
  } catch (error) {
    console.error("Error creating student profile:", error);
    res.status(500).json({ error: "Failed to create student profile." });
  }
});

// --- GET LEADERBOARD DATA ---
// (This route is public and does not need authentication)
apiRouter.get("/leaderboard", async (req, res) => {
  try {
    const leaderboardData = await db
      .collection("students")
      .find(
        {},
        {
          projection: {
            name: 1,
            "gamification.totalPoints": 1,
            "gamification.level": 1,
          },
        }
      )
      .sort({ "gamification.totalPoints": -1 }) // Sort by points descending
      .limit(10) // Get top 10 students
      .toArray();

    res.json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

const ALL_SUBJECTS_DATA = [
  {
    id: "P_ZIM_SHO",
    name: "Shona",
    iconKey: "shona",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_ENG",
    name: "English",
    iconKey: "english",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_NDE",
    name: "Isindebele",
    iconKey: "ndebele",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_SCI",
    name: "Science",
    iconKey: "science",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_MTH",
    name: "Maths",
    iconKey: "maths",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_HER",
    name: "Heritage",
    iconKey: "heritage",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_FRM",
    name: "FAREME",
    iconKey: "fareme",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_HEC",
    name: "Home Economics",
    iconKey: "home_eco",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_AGR",
    name: "Agriculture",
    iconKey: "agriculture",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_ICT",
    name: "Computer Science",
    iconKey: "computers",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_MUS",
    name: "Music",
    iconKey: "music",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_ART",
    name: "Art",
    iconKey: "art",
    level: "primary",
    curriculum: "zimsec",
  },
  {
    id: "P_ZIM_PED",
    name: "Physical Education(PE)",
    iconKey: "pe",
    level: "primary",
    curriculum: "zimsec",
  },

  // --- Primary School Subjects (Cambridge) ---

  {
    id: "P_CAM_ENG",
    name: "English (Cambridge)",
    iconKey: "english",
    level: "primary",
    curriculum: "cambridge",
  },
  {
    id: "P_CAM_SCI",
    name: "Science (Cambridge)",
    iconKey: "science",
    level: "primary",
    curriculum: "cambridge",
  },
  {
    id: "P_CAM_MTH",
    name: "Maths (Cambridge)",
    iconKey: "maths",
    level: "primary",
    curriculum: "cambridge",
  },

  // --- Secondary School Subjects (Zimsec) ---
  {
    id: "S_ZIM_BIO",
    name: "Biology",
    iconKey: "biology",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_MTH",
    name: "Mathematics",
    iconKey: "maths",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_CSC",
    name: "Combined Science",
    iconKey: "science",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_CHE",
    name: "Chemistry",
    iconKey: "chemistry",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_ECO",
    name: "Economics",
    iconKey: "economics",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_BUS",
    name: "Business Studies",
    iconKey: "business",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_ACC",
    name: "Accounting",
    iconKey: "accounts",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_COM",
    name: "Commerce",
    iconKey: "commerce",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_PHY",
    name: "Physics",
    iconKey: "physics",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_GEO",
    name: "Geography",
    iconKey: "geography",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_WDW",
    name: "Woodwork",
    iconKey: "woodwork",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_MTW",
    name: "Metal Work",
    iconKey: "metal",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_HIS",
    name: "History",
    iconKey: "history",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_FNU",
    name: "Food and Nutrition",
    iconKey: "foods",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_FAF",
    name: "Fashion and Fabrics",
    iconKey: "fashion",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_TGR",
    name: "Technical Graphics",
    iconKey: "technical",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_ICT",
    name: "Computer Science",
    iconKey: "computers",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_ENG",
    name: "English",
    iconKey: "english",
    level: "secondary",
    curriculum: "zimsec",
  },
  {
    id: "S_ZIM_SHO",
    name: "Shona",
    iconKey: "shona",
    level: "secondary",
    curriculum: "zimsec",
  },

  // --- Secondary School Subjects (Cambridge) ---
  {
    id: "S_CAM_BIO",
    name: "Biology ",
    iconKey: "biology",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_CSC",
    name: "Combined Science ",
    iconKey: "science_sub",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_CHE",
    name: "Chemistry ",
    iconKey: "chemistry",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_ECO",
    name: "Economics ",
    iconKey: "economics",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_BUS",
    name: "Business Studies ",
    iconKey: "business",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_MTH",
    name: "Mathematics",
    iconKey: "maths",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_ACC",
    name: "Accounting ",
    iconKey: "accounts",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_COM",
    name: "Commerce ",
    iconKey: "commerce",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_PHY",
    name: "Physics ",
    iconKey: "physics",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_GEO",
    name: "Geography ",
    iconKey: "geography",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_DTW",
    name: "Woodwork ",
    iconKey: "woodwork",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_DTM",
    name: "Metal Work ",
    iconKey: "metal",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_HIS",
    name: "History ",
    iconKey: "history",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_FNU",
    name: "Food & Nutrition",
    iconKey: "foods",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_FAF",
    name: "Fashion & Textiles ",
    iconKey: "fashion",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_TGR",
    name: "Design & Technology",
    iconKey: "technical",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_ENG",
    name: "English",
    iconKey: "english",
    level: "secondary",
    curriculum: "cambridge",
  },
  {
    id: "S_CAM_ICT",
    name: "Computer Science",
    iconKey: "computers",
    level: "secondary",
    curriculum: "cambridge",
  },
];

apiRouter.get("/subjects", authenticateUser, (req, res) => {
  // This endpoint simply returns the hardcoded list of subjects.
  // It's authenticated to ensure only logged-in users can see it.
  res.json(ALL_SUBJECTS_DATA);
});
apiRouter.put("/students/preferences", authenticateUser, async (req, res) => {
  const { curriculum } = req.body;
  const profileId = req.user.id;

  if (!curriculum) {
    return res
      .status(400)
      .json({ error: "Curriculum preference is required." });
  }

  try {
    const result = await db.collection("students").updateOne(
      { _id: new ObjectId(profileId) },
      { $set: { curriculum: curriculum, lastModified: new Date() } } // Update the curriculum field
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found." });
    }

    res.json({
      success: true,
      message: "Curriculum preference updated successfully.",
    });
  } catch (error) {
    console.error("Error updating student preferences:", error);
    res.status(500).json({ error: "Failed to update preferences." });
  }
});

apiRouter.post("/payments/initiate", authenticateUser, async (req, res) => {
  const { phoneNumber, plan = "premium" } = req.body;
  const profileId = req.user.id;

  if (!phoneNumber || !/^(07[7-8])[0-9]{7}$/.test(phoneNumber)) {
    return res
      .status(400)
      .json({ error: "A valid Ecocash phone number is required" });
  }

  try {
    const amount = plan === "basic" ? 0.01 : 15.0;
    const planName = plan === "basic" ? "Basic" : "Premium";

    const payment = paynow.createPayment(
      `ChikoroSub-${profileId}-${Date.now()}`,
      req.user.email
    );
    payment.add(`Chikoro AI ${planName} Subscription`, amount);

    const response = await paynow.sendMobile(payment, phoneNumber, "ecocash");

    if (response && response.success) {
      await db.collection("students").updateOne(
        { _id: new ObjectId(profileId) },
        {
          $set: {
            "subscription.status": "pending",
            "subscription.plan": plan,
            "subscription.paymentPollUrl": response.pollUrl,
            "subscription.updatedAt": new Date(),
          },
        }
      );

      res.json({
        success: true,
        instructions: response.instructions,
      });
    } else {
      throw new Error(
        response.error || "Payment initiation failed at the gateway."
      );
    }
  } catch (error) {
    console.error("Payment Initiation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get("/payments/status", authenticateUser, async (req, res) => {
  const profileId = req.user.id;
  try {
    const student = await db
      .collection("students")
      .findOne({ _id: new ObjectId(profileId) });

    if (
      !student ||
      !student.subscription ||
      !student.subscription.paymentPollUrl
    ) {
      return res
        .status(404)
        .json({ error: "No pending payment transaction found for this user." });
    }

    const pollUrl = student.subscription.paymentPollUrl;
    const status = await paynow.pollTransaction(pollUrl);

    if (status && status.status === "paid") {
      const expirationDate = new Date(new Date().getTime() + THIRTY_DAYS_MS);

       console.log(`Updating student ${profileId} to PAID with expiry ${expirationDate.toISOString()}`); 

      const updateResult =  await db.collection("students").updateOne(
        { _id: new ObjectId(profileId) },
        {
          $set: {
            "subscription.status": "paid",
            "subscription.expirationDate": expirationDate,
            "subscription.updatedAt": new Date(),
            "subscription.paymentPollUrl": null,
            is_trial_expired: true,
          },
        }
      );
console.log("MongoDB update result:", updateResult); 
      res.json({
        success: true,
        status: "paid",
        message: "Payment confirmed and subscription activated.",
      });
    } else {
      res.json({
        success: false,
        status: status.status,
        message: 'Payment status is not yet "paid".',
      });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ error: "Failed to check payment status." });
  }
});


// ========= REPORT GENERATION HELPER FUNCTIONS =========

/**
 * Calculates the number of unique subjects the student has interacted with in the last 24 hours.
 * @param {object} chatHistory - The student's chatHistory object.
 * @returns {number} The count of unique subjects studied recently.
 */
function calculateSubjectsStudiedLast24Hours(chatHistory) {
  if (!chatHistory || Object.keys(chatHistory).length === 0) {
    return 0;
  }

  // Get the timestamp for exactly 24 hours ago from the current time
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSubjects = new Set();

  // Iterate over each subject in the chat history
  for (const subject in chatHistory) {
    // Check if any message in the subject's chat array is recent
    const hasRecentChat = chatHistory[subject].some(
      (chat) => new Date(chat.timestamp) > twentyFourHoursAgo
    );

    if (hasRecentChat) {
      recentSubjects.add(subject);
    }
  }

  return recentSubjects.size;
}

/**
 * Estimates the total study time in minutes based on chat interactions.
 * This is an estimation and can be tuned.
 * @param {object} chatHistory - The student's chatHistory object.
 * @returns {number} The estimated total study time in minutes.
 */
function calculateTotalStudyTime(chatHistory) {
  if (!chatHistory) {
    return 0;
  }

  // ASSUMPTION: Each interaction (a user message + a model response) takes about 2 minutes.
  // You can adjust this value to better reflect typical session lengths.
  const AVERAGE_MINUTES_PER_INTERACTION = 2;
  let totalInteractions = 0;

  for (const subject in chatHistory) {
    // We assume half the messages are from the user, so we divide by 2 to get interaction pairs.
    totalInteractions += Math.ceil(chatHistory[subject].length / 2);
  }

  return totalInteractions * AVERAGE_MINUTES_PER_INTERACTION;
}

/**
 * Compiles a list of the student's most recent activities from tests and chats.
 * @param {object} student - The full student object.
 * @returns {Array<object>} A sorted list of the 5 most recent activities.
 */
function getRecentActivities(student) {
    const activities = [];
    const { chatHistory, tests } = student;

    // Get latest chat activity for each subject
    if (chatHistory) {
        for (const subject in chatHistory) {
            const subjectChats = chatHistory[subject];
            if (subjectChats.length > 0) {
                // Get the timestamp of the most recent message in the subject
                const lastChat = subjectChats[subjectChats.length - 1];
                activities.push({
                    type: 'Study',
                    description: `Studied ${subject}`,
                    date: new Date(lastChat.timestamp),
                });
            }
        }
    }

    // Get test activities
    if (tests) {
        tests.forEach(test => {
            activities.push({
                type: 'Test',
                description: `Completed a test in ${test.subject}`,
                date: new Date(test.date),
            });
        });
    }
    
    // Sort activities by date descending (most recent first) and return the top 5
    return activities
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);
}

/**
 * Calculates the student's overall proficiency based on the average of all test scores.
 * @param {Array<object>} tests - The student's tests array.
 * @returns {string} The proficiency level string.
 */
function calculateOverallProficiency(tests) {
  if (!tests || tests.length === 0) {
    return "Not Assessed";
  }

  const totalScore = tests.reduce((sum, test) => sum + test.score, 0);
  const averageScore = totalScore / tests.length;

  // Use the same proficiency logic as in your /tests/grade route
  if (averageScore >= 91) return 'Expert';
  if (averageScore >= 80) return 'Advanced';
  if (averageScore >= 60) return 'Proficient';
  if (averageScore >= 40) return 'Developing';
  return 'Beginner';
}

/**
 * Calculates the change in test performance over the last 7 days vs. the period before that.
 * @param {Array<object>} tests - The student's tests array.
 * @returns {string} A descriptive string of the performance change.
 */
function calculateWeeklyPerformanceChange(tests) {
    if (!tests || tests.length < 2) {
        return "Not enough data";
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentTests = tests.filter(t => new Date(t.date) >= sevenDaysAgo);
    const olderTests = tests.filter(t => new Date(t.date) < sevenDaysAgo);

    if (recentTests.length === 0 || olderTests.length === 0) {
        return "Not enough recent data to compare";
    }

    const avgRecentScore = recentTests.reduce((sum, t) => sum + t.score, 0) / recentTests.length;
    const avgOlderScore = olderTests.reduce((sum, t) => sum + t.score, 0) / olderTests.length;

    const change = Math.round(avgRecentScore - avgOlderScore);

    if (change > 5) return `Improved by ${change} pts`;
    if (change < -5) return `Declined by ${Math.abs(change)} pts`;
    return "Stable";
}

/**
 * Calculates average proficiency for each subject.
 * @param {Array<object>} tests - The student's tests array.
 * @returns {object} An object mapping each subject to its proficiency level.
 */
function calculateSubjectProficiency(tests) {
    if (!tests || tests.length === 0) {
        return {};
    }

    const subjectScores = {}; // e.g., { Mathematics: [80, 90], Biology: [75] }

    tests.forEach(test => {
        if (!subjectScores[test.subject]) {
            subjectScores[test.subject] = [];
        }
        subjectScores[test.subject].push(test.score);
    });

    const subjectProficiency = {};
    for (const subject in subjectScores) {
        const scores = subjectScores[subject];
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        if (averageScore >= 91) subjectProficiency[subject] = 'Expert';
        else if (averageScore >= 80) subjectProficiency[subject] = 'Advanced';
        else if (averageScore >= 60) subjectProficiency[subject] = 'Proficient';
        else if (averageScore >= 40) subjectProficiency[subject] = 'Developing';
        else subjectProficiency[subject] = 'Beginner';
    }

    return subjectProficiency;
}

// ========= END OF HELPER FUNCTIONS =========

apiRouter.post('/generate-report', authenticateUser, async (req, res) => {
    const profileId = req.user.id; // Securely get the user's ID from the token

    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        // 1. Fetch the student from the database
        const student = await db.collection("students").findOne({ _id: new ObjectId(profileId) });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // 2. Format the student data into a clear string for the AI
        let reportDataString = `Student Name: ${student.name}\nAge: ${student.age}\nGrade: ${student.grade}\n\n`;

        // Format Chat History
        if (student.chatHistory && Object.keys(student.chatHistory).length > 0) {
            reportDataString += "=== Recent Conversation History ===\n";
            Object.entries(student.chatHistory).forEach(([subject, chats]) => {
                reportDataString += `Subject: ${subject}\n`;
                // Get the last 5 chats for brevity
                chats.slice(-5).forEach(chat => {
                    reportDataString += `  - ${chat.type}: ${chat.message}\n`;
                });
                reportDataString += '\n';
            });
        }

        // Format Test History
        if (student.tests && student.tests.length > 0) {
            reportDataString += "=== Recent Test Results ===\n";
            // Get the last 3 tests
            student.tests.slice(-3).forEach(test => {
                reportDataString += `Subject: ${test.subject}, Score: ${test.score}%, Proficiency: ${test.proficiencyLevel}\n`;
            });
            reportDataString += '\n';
        }

        // 3. Create a detailed prompt for the AI model
        const prompt = `
            You are an expert educational analyst. Generate a detailed, encouraging, and constructive academic report for the following student based on the data provided. The report should be easy for a parent or the student to understand.

            **Student Data:**
            \`\`\`
            ${reportDataString}
            \`\`\`

            **Report Structure:**
            Please generate a response as a valid JSON object. Do not include any other text or markdown formatting. The JSON object must follow this exact structure:
            {
              "studentName": "${student.name}",
              "reportDate": "${new Date().toLocaleDateString('en-CA')}",
              "overallSummary": "A brief, encouraging paragraph summarizing the student's overall engagement and progress.",
              "strengths": [
                "Identify 2-3 key strengths based on conversations and test scores. For example: 'Strong analytical skills in Mathematics as shown by high test scores.' or 'Demonstrates great curiosity in Biology by asking insightful questions.'"
              ],
              "areasForImprovement": [
                "Identify 2-3 specific, actionable areas for improvement. Be constructive. For example: 'Could improve on applying formulas in Physics problems.' or 'Focus on providing more detailed explanations in History essays.'"
              ],
              "recommendedNextSteps": [
                "Suggest 2-3 specific topics or activities for the student to focus on next. For example: 'Practice past paper questions for Combined Science.' or 'Explore the topic of chemical bonding in more detail.'"
              ]
            }
        `;

        // 4. Call the AI Model to generate the report
        // We use the getOllamaJson helper that already exists in your server.js
        const generatedJsonReport = await getOllamaJson(
            [{ role: 'user', content: prompt }],
            true, // We expect JSON back
            LIGHT_MODEL // Or whichever model you prefer
        );

        // 5. Parse the AI's response and send it to the frontend
        const report = JSON.parse(generatedJsonReport);

        res.json({ report });

    } catch (error) {
        console.error("Error generating AI report:", error);
        res.status(500).json({ error: 'Failed to generate AI-powered report' });
    }
});

apiRouter.post("/teachers", authenticateUser, async (req, res) => {
    // The user's email comes from the authenticated token.
    const userEmail = req.user.email;
    // FIX: Destructure both 'name' and 'school' from the request body.
    const { name, school } = req.body; 

    // FIX: Add a check to ensure the school name is also provided.
    if (!name || !school) {
        return res.status(400).json({ error: "Teacher's name and school are required." });
    }

    try {
        const teachersCollection = db.collection("teachers"); // Use a new, separate collection.

        // Check if a teacher profile already exists for this user ID.
        const existingTeacher = await teachersCollection.findOne({
            _id: new ObjectId(req.user.id),
        });
        if (existingTeacher) {
            return res.status(409).json({
                error: "A teacher profile already exists for this account.",
                teacher: existingTeacher,
            });
        }

        // Create the new teacher document.
        const newTeacher = {
            _id: new ObjectId(req.user.id), // Link to the user's auth ID.
            email: userEmail,
            name,
            school, // FIX: Save the 'school' variable from the request.
            role: "teacher", // Explicitly define the role.
            createdAt: new Date(),
        };

        await teachersCollection.insertOne(newTeacher);

        // Return the newly created teacher object.
        res.status(201).json(newTeacher);
    } catch (error) {
        console.error("Error creating teacher profile:", error);
        res.status(500).json({ error: "Failed to create teacher profile." });
    }
});

/**
 * @route   GET /api/v1/students/by-email/:email
 * @desc    Get a student profile by email to check for existence.
 * @access  Private
 */
apiRouter.get("/students/by-email/:email", authenticateUser, async (req, res) => {
    const requestedEmail = req.params.email.toLowerCase();
    const authenticatedUserEmail = req.user.email;

    // Security Check: A user can only check for their own profile.
    if (requestedEmail !== authenticatedUserEmail) {
        return res.status(403).json({ error: "Forbidden: You can only check for your own profile." });
    }

    try {
        const student = await db.collection("students").findOne({ email: requestedEmail });

        if (student) {
            res.json(student); // Found, return profile data
        } else {
            // This is the expected result if no profile exists. It's not an error.
            res.status(404).json({ message: "Student profile not found." });
        }
    } catch (error) {
        console.error("Error fetching student by email:", error);
        res.status(500).json({ error: "Server error while fetching profile." });
    }
});

/**
 * @route   GET /api/v1/teachers/by-email/:email
 * @desc    Get a teacher profile by email to check for existence.
 * @access  Private
 */
apiRouter.get("/teachers/by-email/:email", authenticateUser, async (req, res) => {
    const requestedEmail = req.params.email.toLowerCase();
    const authenticatedUserEmail = req.user.email;

    // Security Check: A user can only check for their own teacher profile.
    if (requestedEmail !== authenticatedUserEmail) {
        return res
            .status(403)
            .json({ error: "Forbidden: You can only check for your own profile." });
    }

    try {
        const teacher = await db
            .collection("teachers") // Query the new 'teachers' collection.
            .findOne({ email: requestedEmail });

        if (teacher) {
            res.json(teacher); // Found a profile, return it.
        } else {
            // This is not an error, it's the expected outcome for a user who is not a teacher.
            res.status(404).json({ message: "Teacher profile not found." });
        }
    } catch (error) {
        console.error("Error fetching teacher by email:", error);
        res.status(500).json({ error: "Server error while fetching teacher profile." });
    }
});

/**
 * @route   GET /api/v1/teachers/dashboard
 * @desc    Get the dashboard cards/actions for a teacher.
 * @access  Private
 */
apiRouter.get("/teachers/dashboard", authenticateUser, async (req, res) => {
    // First, verify the user is actually a teacher.
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) {
            return res.status(403).json({ error: "Access denied. User is not a registered teacher." });
        }

        // CORRECTED: Return a structured list of tool objects.
        // This is the data format the frontend component is designed to work with.
        const teacherDashboardTools = [
            {
                id: "lesson-planner",
                title: "Lesson Planner",
                description: "Generate a detailed lesson plan for any subject and topic, complete with objectives, activities, and assessments.",
                icon: "FaClipboardList",
                path: "/lesson-planner"
            },
            {
                id: "quiz-generator",
                title: "Quiz & Test Generator",
                description: "Create multiple-choice or short-answer questions to assess student understanding of any topic.",
                icon: "FaPencilRuler",
                path: "/quiz-generator"
            },
            {
                id: "report-comment-helper",
                title: "Report Comment Helper",
                description: "Generate constructive and personalized comments for student report cards based on performance.",
                icon: "FaComments",
                path: "/report-helper"
            },
            {
                id: "resource-finder",
                title: "Resource Finder",
                description: "Find relevant articles, videos, and worksheets from the web to supplement your lessons.",
                icon: "FaSearch",
                path: "/resource-finder"
            },
            {
                id: "scheme-of-work-creator",
                title: "Scheme of Work Creator",
                description: "Outline a scheme of work for an entire term, ensuring curriculum alignment and logical progression.",
                icon: "FaSitemap",
                path: "/scheme-creator"
            },
            {
                id: "quiz-reports", // Unique ID for this tool
                title: "Quiz Reports",
                description: "View submission data and detailed performance reports for quizzes you have created.",
                icon: "FaClipboardList", // You can choose a different icon if you have one, or reuse.
                                        // Maybe something like FaChartBar if you integrate react-icons later.
                path: "/teacher/quizzes" // This must match the path in App.js for the TeacherReports component
            },
        ];

        res.json(teacherDashboardTools);

    } catch (error) {
        console.error("Error fetching teacher dashboard data:", error);
        res.status(500).json({ error: "Failed to load teacher dashboard." });
    }
});
apiRouter.get("/teachers/me", authenticateUser, async (req, res) => {
    // This route uses the ID from the secure token, not from the URL.
    const authenticatedUserId = req.user.id;

    try {
        const teacherProfile = await db
            .collection("teachers")
            .findOne({ _id: new ObjectId(authenticatedUserId) });

        if (!teacherProfile) {
            // 404 is correct if the authenticated user does not have a teacher profile.
            return res.status(404).json({ error: "Teacher profile not found." });
        }

        // If found, send the teacher's data back.
        res.json(teacherProfile);
    } catch (error) {
        console.error("Error fetching teacher by authenticated ID:", error);
        res
            .status(500)
            .json({ error: "An error occurred while fetching your profile." });
    }
});

apiRouter.post("/teacher-tools/generate-lesson-plan", authenticateUser, async (req, res) => {
    // Verify the user is a teacher before proceeding
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) {
            return res.status(403).json({ error: "Access denied. This feature is for teachers only." });
        }
    } catch (authError) {
        return res.status(500).json({ error: "Failed to verify teacher status." });
    }

    const { subject, topic, grade, duration, objectives } = req.body;

    if (!subject || !topic || !grade || !duration) {
        return res.status(400).json({ error: "Please provide all required fields: subject, topic, grade, and duration." });
    }

    // A detailed, structured prompt for the AI model
    const lessonPlanPrompt = `
        As an expert Zimbabwean curriculum designer, create a detailed lesson plan for a ${grade} class.

        **Subject:** ${subject}
        **Topic:** ${topic}
        **Lesson Duration:** ${duration}
        
        **Core Learning Objectives (if provided):** ${objectives || "Not specified."}

        Please structure the lesson plan with the following sections, using clear markdown formatting (headings, bold text, and lists):
        
        ### 1. Learning Objectives
        - List 3-4 clear, measurable, and achievable learning outcomes for the lesson. If objectives were provided by the teacher, expand on them.
        
        ### 2. Materials & Resources
        - List all materials needed (e.g., textbooks, chalk, charts, projector, specific local items for demonstration).
        
        ### 3. Lesson Activities (Step-by-Step)
        - **Introduction (5-10 mins):** How to engage students and introduce the topic. Use an analogy relevant to Zimbabwean life.
        - **Main Activity (20-25 mins):** Detailed explanation of the core teaching activity. Describe the teacher's role and the students' tasks.
        - **Group Work / Practical Session (10-15 mins):** A collaborative activity for students to apply their knowledge.
        - **Conclusion & Recap (5 mins):** How to summarize the key points and check for understanding.

        ### 4. Assessment
        - Suggest a simple method to assess whether the learning objectives were met (e.g., a few short questions, an exit ticket, observation checklist).
    `;

    try {
       const lessonPlanText = await getOllamaJson([{ role: "user", content: lessonPlanPrompt }], false, LIGHT_MODEL);
        
        // Now, we send the complete text back as a simple JSON object.
        res.json({ lessonPlan: lessonPlanText });
        
    } catch (error) {
        console.error("Error generating lesson plan:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate the lesson plan." });
        }
    }
});

apiRouter.post("/teacher-tools/generate-quiz", authenticateUser, async (req, res) => {
    // Authentication check for teacher role
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) return res.status(403).json({ error: "Access denied." });
    } catch (e) { return res.status(500).json({ error: "Auth check failed."}); }

    const { subject, topic, grade, numQuestions, questionTypes } = req.body;
    if (!subject || !topic || !grade || !numQuestions || !questionTypes) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const quizPrompt = `
        Create a quiz for a ${grade} student in Zimbabwe on the subject of ${subject}, focusing on the topic: "${topic}".
        The quiz must have exactly ${numQuestions} questions.
        The question types should be: ${questionTypes}.

        Return ONLY a valid JSON object in the following structure:
        {
          "title": "Quiz on ${topic}",
          "questions": [
            {
              "type": "multiple-choice", 
              "question": "Question text here...", 
              "options": ["Option A", "Option B", "Option C", "Option D"], 
              "correctAnswer": "The correct option text"
            },
            {
              "type": "short-answer", 
              "question": "Question text here...",
              "correctAnswer": "A brief, ideal answer for grading."
            }
          ]
        }
    `;
    try {
        const responseText = await getOllamaJson([{ role: "user", content: quizPrompt }], true, LIGHT_MODEL);
        const cleanedJson = responseText.replace(/```json\s*|\s*```/g, "").trim();
        res.json(JSON.parse(cleanedJson));
    } catch (error) {
        console.error("Error generating quiz:", error);
        res.status(500).json({ error: "Failed to generate quiz." });
    }
});

/**
 * @route   POST /api/v1/teacher-tools/generate-report-comments
 * @desc    Generates report card comments using AI.
 * @access  Private
 */
apiRouter.post("/teacher-tools/generate-report-comments", authenticateUser, async (req, res) => {
    // Authentication check for teacher role
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) return res.status(403).json({ error: "Access denied." });
    } catch (e) { return res.status(500).json({ error: "Auth check failed."}); }

    const { studentName, subject, strengths, areasForImprovement, overallPerformance } = req.body;
    if (!studentName || !subject || !overallPerformance) {
        return res.status(400).json({ error: "Missing required fields." });
    }
    
    const commentPrompt = `
        As a compassionate and professional Zimbabwean teacher for the subject ${subject}, write 3 distinct, encouraging, and constructive report card comments for a student named ${studentName}.
        
        Student's Profile:
        - Overall Performance: ${overallPerformance}
        - Key Strengths: ${strengths || 'Not specified'}
        - Areas for Improvement: ${areasForImprovement || 'Not specified'}

        Generate comments that are positive and provide actionable advice. Use a formal but caring tone.
        
        Return ONLY a valid JSON object in the following structure:
        {
            "comments": [
                "Comment option 1...",
                "Comment option 2...",
                "Comment option 3..."
            ]
        }
    `;
    try {
        const responseText = await getOllamaJson([{ role: "user", content: commentPrompt }], true, LIGHT_MODEL);
        const cleanedJson = responseText.replace(/```json\s*|\s*```/g, "").trim();
        res.json(JSON.parse(cleanedJson));
    } catch (error) {
        console.error("Error generating report comments:", error);
        res.status(500).json({ error: "Failed to generate comments." });
    }
});

/**
 * @route   POST /api/v1/teacher-tools/find-resources
 * @desc    Finds web resources for a topic using AI and web search.
 * @access  Private
 */
apiRouter.post("/teacher-tools/find-resources", authenticateUser, async (req, res) => {
    // Authentication check for teacher role
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) return res.status(403).json({ error: "Access denied." });
    } catch (e) { return res.status(500).json({ error: "Auth check failed."}); }

    const { topic, grade } = req.body;
    if (!topic || !grade) {
        return res.status(400).json({ error: "Topic and grade are required." });
    }

    try {
        const searchResults = await performGoogleSearch(`teaching resources for ${topic} for ${grade} students`);

        const resourcePrompt = `
            Analyze the following web search results and extract the 3-5 most useful teaching resources for the topic "${topic}".
            For each resource, provide a title, a brief one-sentence description of what it is, and the direct link.
            
            Search Results:
            """
            ${searchResults}
            """

            Return ONLY a valid JSON object in the following structure:
            {
                "resources": [
                    {"title": "Resource Title 1", "description": "A brief description.", "link": "http://example.com/link1"},
                    {"title": "Resource Title 2", "description": "A brief description.", "link": "http://example.com/link2"}
                ]
            }
        `;
        const responseText = await getOllamaJson([{ role: "user", content: resourcePrompt }], true, LIGHT_MODEL);
        const cleanedJson = responseText.replace(/```json\s*|\s*```/g, "").trim();
        res.json(JSON.parse(cleanedJson));

    } catch (error) {
        console.error("Error finding resources:", error);
        res.status(500).json({ error: "Failed to find resources." });
    }
});

/**
 * @route   POST /api/v1/teacher-tools/generate-scheme
 * @desc    Generates a scheme of work using AI.
 * @access  Private
 */
apiRouter.post("/teacher-tools/generate-scheme", authenticateUser, async (req, res) => {
    // Authentication check for teacher role
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) return res.status(403).json({ error: "Access denied." });
    } catch (e) { return res.status(500).json({ error: "Auth check failed."}); }
    
    const { subject, grade, term, weeks } = req.body;
    if (!subject || !grade || !term || !weeks) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const schemePrompt = `
        As an expert Zimbabwean curriculum designer, create a week-by-week scheme of work for ${subject}, Grade/Form ${grade}, for Term ${term}. The term is ${weeks} weeks long.

        For each week, provide:
        - The main topic.
        - Key sub-topics or concepts to be covered.
        - A brief list of learning objectives.
        - A suggested simple assessment method.

        Present the entire scheme of work as a single block of markdown text, using headings for each week.
    `;
    try {
        // --- THIS IS THE FIX ---
        // Changed from the streaming function to the single-response function.
        const schemeText = await getOllamaJson([{ role: "user", content: schemePrompt }], false, LIGHT_MODEL);
        
        // Send the complete text back as a simple JSON object.
        res.json({ schemeOfWork: schemeText });

    } catch (error) {
        console.error("Error generating scheme of work:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate scheme of work." });
        }
    }
});


apiRouter.post("/quizzes/save", authenticateUser, async (req, res) => {
    try {
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) {
            return res.status(403).json({ error: "Only teachers can save quizzes." });
        }

        const quizData = req.body;
        quizData.teacherId = req.user.id;
        quizData.createdAt = new Date();

        const result = await db.collection("quizzes").insertOne(quizData);
        
        // Return the ID of the newly created quiz
        res.status(201).json({ quizId: result.insertedId });

    } catch (error) {
        console.error("Error saving quiz:", error);
        res.status(500).json({ error: "Failed to save the quiz." });
    }
});
/**
 * @route   POST /api/v1/quizzes/:quizId/submit
 * @desc    Receives student answers, grades them, and saves the result.
 * @access  Private (Student)
 */
apiRouter.post("/quizzes/:quizId/submit", authenticateUser, async (req, res) => {
    try {
        const profileId = req.user.id;
        const studentAnswers = req.body.answers; // Expects an array of answers, ensure they are indexed to match questions

        if (!ObjectId.isValid(req.params.quizId)) {
            return res.status(400).json({ error: "Invalid quiz ID format." });
        }

        // 1. Get the full quiz with answers from the DB
        const quiz = await db.collection("quizzes").findOne({ _id: new ObjectId(req.params.quizId) });
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }

        const GRADING_MODEL = "gemma3:1b"; // Ensure you have this constant defined

        // --- NEW: AI GRADING LOGIC START ---
        const gradingResults = [];
        let score = 0; // Initialize score for manual calculation
        const totalQuestions = quiz.questions.length;

        for (const [index, question] of quiz.questions.entries()) {
            const studentAnswer = studentAnswers[index]; // Assuming studentAnswers array matches question order

            if (!studentAnswer) {
                gradingResults.push({ questionIndex: index, error: "No answer provided" });
                continue; // Skip to next question if no answer
            }

            // Construct prompt for AI grading based on question type
            const gradingPrompt = `
                You are an expert AI tutor. Evaluate the student's answer. Return ONLY a valid JSON object.
                Question: ${question.question}
                Student's Answer: ${studentAnswer}
                ${
                  question.type === "multiple-choice"
                    ? `Correct Answer: ${question.correctAnswer}\nJSON Format: {"questionIndex": ${index}, "isCorrect": boolean, "feedback": "A one-sentence explanation."}`
                    : `Ideal Answer: ${question.correctAnswer}\nJSON Format: {"questionIndex": ${index}, "score": /* 0-100 */, "feedback": "Detailed feedback.", "strengths": ["..."], "improvements": ["..."]}`
                }
            `;

            try {
                const responseText = await getOllamaJson(
                    [{ role: "user", content: gradingPrompt }],
                    true,
                    GRADING_MODEL
                );
                const cleanedResponse = responseText.replace(/```json\s*|\s*```/g, "").trim();
                let evaluation = JSON.parse(cleanedResponse);
                gradingResults.push(evaluation);

                // Update score based on AI evaluation
                if (question.type === "multiple-choice") {
                    if (evaluation.isCorrect === true) {
                        score++;
                    }
                } else if (question.type === "short-answer") {
                    // For short answer, assume score is out of 100 and add to overall score
                    // You might want to weigh this differently or cap it if it's not a pure score sum.
                    score += (evaluation.score / 100); // Normalize score to 0-1 range for sum
                }

            } catch (aiError) {
                console.error(`Ollama grading error for question ${index}:`, aiError);
                gradingResults.push({ questionIndex: index, error: `AI evaluation failed: ${aiError.message}` });
            }
        }

        // Calculate final percentage based on total questions and AI-derived scores
        // For mixed types, you might need a more sophisticated scoring logic
        // This simple sum works if multiple-choice are 1 point and short-answer scores are normalized.
        const finalPercentage = Math.round((score / totalQuestions) * 100); // Adjust this if different weights are needed

        // Determine Proficiency Level (re-using your existing logic)
        let proficiencyLevel = 'Beginner';
        if (finalPercentage >= 80) proficiencyLevel = 'Advanced';
        else if (finalPercentage >= 60) proficiencyLevel = 'Proficient';
        else if (finalPercentage >= 40) proficiencyLevel = 'Developing';

        // Generate overall summary from AI (similar to /tests/grade)
        const summaryPrompt = `
            You are an AI learning coach analyzing a student's test results. The final score is ${finalPercentage}%.
            Based on the results below, generate a helpful and encouraging summary. Return ONLY a valid JSON object.
            Results: ${JSON.stringify(gradingResults, null, 2)}
            JSON Format: {"overallFeedback": "A summary.", "strengths": ["..."], "improvements": ["..."], "recommendations": ["..."]}
        `;
        let summaryData = {};
        try {
            const summaryResponseText = await getOllamaJson(
                [{ role: "user", content: summaryPrompt }],
                true,
                GRADING_MODEL
            );
            const cleanedSummary = summaryResponseText.replace(/```json\s*|\s*```/g, "").trim();
            summaryData = JSON.parse(cleanedSummary);
        } catch (summaryError) {
            console.error("Ollama summary generation error:", summaryError);
            summaryData = { overallFeedback: `Final score is ${finalPercentage}%.`, strengths: [], improvements: [], recommendations: [] };
        }
        // --- NEW: AI GRADING LOGIC END ---

        // 2. Create the test result object to save (your provided structure)
        const testResult = {
            _id: new ObjectId(),
            teacherId: quiz.teacherId, 
            quizId: new ObjectId(req.params.quizId),
            subject: quiz.subject,
            score: finalPercentage,
            date: new Date(),
            totalQuestions: quiz.questions.length,
            proficiencyLevel: proficiencyLevel,
            details: {
                // IMPORTANT: Pass only necessary quiz question data to avoid large redundant storage
                quizQuestions: quiz.questions.map(q => ({
                    question: q.question,
                    type: q.type,
                    options: q.type === 'multiple-choice' ? q.options : undefined // Only include options for MC
                })),
                studentAnswers: studentAnswers, // Store what the student answered
                gradingFeedback: gradingResults, // The per-question AI feedback
                summary: summaryData // The overall AI summary (strengths, improvements, recommendations)
            }
        };

        // 3. Save the result to the student's profile
        await db.collection("students").updateOne(
            { _id: new ObjectId(profileId) },
            { $push: { tests: testResult } }
        );

        // 4. Return the graded results to the student
        res.json({
            message: "Quiz submitted successfully!",
            score: finalPercentage,
            totalQuestions: quiz.questions.length,
            correctAnswers: score, // This `score` here represents correctly answered MCQs + normalized short-answer points
            details: testResult.details // Optionally return the full details to the student
        });

    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ error: "Failed to submit your answers." });
    }
});



apiRouter.get("/quizzes/teacher", authenticateUser, async (req, res) => {
    try {
        // Step 1: Verify the user is a registered teacher. This is a good security check.
        // It uses the ObjectId of the logged-in user to find their profile in the 'teachers' collection.
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) {
            return res.status(403).json({ error: "Access denied. User is not a registered teacher." });
        }

        // Step 2: Get the teacher's ID as a STRING from their login token.
        // This is used to match the string-based 'teacherId' in your 'quizzes' collection.
        const teacherIdString = req.user.id;

        // Step 3: Use an aggregation pipeline to fetch quizzes and count their submissions.
        const quizzesWithCounts = await db.collection("quizzes").aggregate([
            // Stage A: Find all quizzes where the 'teacherId' field (a string) matches the logged-in user's ID string.
            {
                $match: { teacherId: teacherIdString }
            },
            // Stage B: Join with the 'students' collection to find all submissions for each quiz.
            // This works by matching 'quizzes._id' (an ObjectId) with 'students.tests.quizId' (also an ObjectId).
            {
                $lookup: {
                    from: "students",
                    localField: "_id",
                    foreignField: "tests.quizId",
                    as: "submissions"
                }
            },
            // Stage C: Create a new field 'submissionCount' that is the total size of the 'submissions' array.
            {
                $addFields: {
                    submissionCount: { $size: "$submissions" }
                }
            },
            // Stage D: Shape the final data to be sent to the frontend.
            {
                $project: {
                    _id: 0, // Exclude the original _id
                    quizId: "$_id", // Rename _id to quizId to match the frontend
                    title: 1,
                    subject: 1,
                    grade: 1,
                    createdAt: 1,
                    submissionCount: 1 // Include our new count
                }
            },
            // Stage E: Sort the quizzes with the most recently created ones first.
            {
                $sort: { createdAt: -1 }
            }
        ]).toArray();

        // Step 4: Send the final list of quizzes back to the frontend.
        res.json(quizzesWithCounts);

    } catch (error) {
        // Catch and log any errors that occur during the process.
        console.error("Error fetching teacher's quizzes:", error);
        res.status(500).json({ error: "Failed to fetch quizzes." });
    }
});

/**
 * @route   GET /api/v1/quizzes/:quizId
 * @desc    Fetches a quiz for a student to take (omits answers).
 * @access  Private (Student)
 */
apiRouter.get("/quizzes/:quizId", authenticateUser, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.quizId)) {
            return res.status(400).json({ error: "Invalid quiz ID format." });
        }

        // Fetch the quiz but exclude the correct answers to prevent cheating.
        const quiz = await db.collection("quizzes").findOne(
            { _id: new ObjectId(req.params.quizId) },
            { 
                projection: { 
                    "questions.correctAnswer": 0 // This line removes the answers
                } 
            }
        );

        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }
        res.json(quiz);

    } catch (error) {
        console.error("Error fetching quiz for student:", error);
        res.status(500).json({ error: "Could not load the quiz." });
    }
});



/**
 * @route   GET /api/v1/quizzes/:quizId/submissions
 * @desc    Get all student submissions for a specific quiz.
 * @access  Private (Teacher)
 */
apiRouter.get("/quizzes/:quizId/submissions", authenticateUser, async (req, res) => {
    try {
        const { quizId } = req.params;
        if (!ObjectId.isValid(quizId)) {
            return res.status(400).json({ error: "Invalid Quiz ID format." });
        }

        const quizObjectId = new ObjectId(quizId);

        // Authorization: Ensure the logged-in user is a teacher and owns this quiz.
        const quiz = await db.collection("quizzes").findOne({ _id: quizObjectId });
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }
        // This check is safe because we know teacherId is a string in your collection.
        if (quiz.teacherId !== req.user.id) {
            return res.status(403).json({ error: "Forbidden. You do not own this quiz." });
        }

        // Use a robust aggregation pipeline to safely fetch and format submission data.
        const submissions = await db.collection("students").aggregate([
            // Stage 1: Find only the students who have a test matching this quiz's ID.
            { $match: { "tests.quizId": quizObjectId } },

            // Stage 2: Deconstruct the 'tests' array to process each test document individually.
            { $unwind: "$tests" },

            // Stage 3: Filter again to isolate only the single test submission we care about for this quiz.
            { $match: { "tests.quizId": quizObjectId } },

            // Stage 4: Reshape the data into the exact format needed by the frontend.
            {
                $project: {
                    _id: 0, // Exclude the default student _id
                    submissionId: "$tests._id",
                    studentName: "$name",
                    score: "$tests.score",
                    submittedAt: "$tests.date",
                    // Safely provide default AI feedback if it's missing from the record
                    aiFeedback: {
                        $ifNull: [
                            "$tests.details.summary",
                            {
                                overallFeedback: "This submission has not yet been processed by the AI grader.",
                                strengths: [],
                                areasForImprovement: []
                            }
                        ]
                    }
                }
            },
            // Stage 5: Sort the results by score from highest to lowest.
            { $sort: { score: -1 } }
        ]).toArray();

        // Assemble the final report object.
        const report = {
            quizTitle: quiz.title,
            subject: quiz.subject,
            submissions: submissions
        };

        res.json(report);

    } catch (error) {
        // The most important step for you: check the backend console for this error message!
        console.error("Error fetching quiz submissions:", error);
        res.status(500).json({ error: "Failed to fetch quiz submissions." });
    }
});

apiRouter.get("/quizzes/:quizId/results", authenticateUser, async (req, res) => {
    try {
        // Ensure the user is a teacher
        const teacher = await db.collection("teachers").findOne({ _id: new ObjectId(req.user.id) });
        if (!teacher) {
            return res.status(403).json({ error: "Access denied. Only teachers can view quiz results." });
        }

        const { quizId } = req.params;
        const quizObjectId = new ObjectId(quizId);
        const teacherObjectId = new ObjectId(req.user.id);

        // Optional: Verify that the teacher owns this quiz (security check)
        const quiz = await db.collection("quizzes").findOne({ 
            _id: quizObjectId, 
            teacherId: teacherObjectId 
        });
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found or you do not have permission to view its results." });
        }

        // Aggregate to find all students who have submitted this quiz
        // and retrieve their relevant test results for this quiz.
        const studentResults = await db.collection("students").aggregate([
            // Match students who have taken this specific quiz
            { $match: { "tests.quizId": quizObjectId } },
            // Unwind the 'tests' array to process each test separately
            { $unwind: "$tests" },
            // Match only the test results for the specific quizId
            { $match: { "tests.quizId": quizObjectId } },
            // Project the necessary student and test result information
            {
                $project: {
                    _id: 0, // Exclude student's _id
                    profileId: "$_id", // Rename student's _id
                    studentName: student.name, // Assuming student documents have a 'username' or 'name' field
                    score: "$tests.score",
                    totalQuestions: "$tests.totalQuestions",
                    percentageScore: "$tests.percentageScore",
                    submittedAt: "$tests.submittedAt"
                    // Add other fields you might have stored in testResult, e.g., detailedResults
                }
            },
            // Sort results, e.g., by submission time or student name
            { $sort: { submittedAt: -1 } }
        ]).toArray();

        res.json(studentResults);

    } catch (error) {
        console.error("Error fetching quiz results:", error);
        res.status(500).json({ error: "Failed to fetch quiz results." });
    }
});


// apiRouter.post("/payments/webhook", async (req, res) => {
//   console.log("Webhook received a notification!");
//   console.log("Received data:", req.body); // VERY IMPORTANT FOR DEBUGGING!

//   try {
//     // 1. Verify that the request is genuinely from Paynow
//     const isValid = verifyPaynowHash(req.body, process.env.PAYNOW_INTEGRATION_KEY);
//     if (!isValid) {
//       console.error("Webhook Error: Invalid hash. Request might be fraudulent.");
//       // Respond with a 400 Bad Request, but don't give the attacker any info.
//       return res.status(400).send("Invalid Hash");
//     }

//     // 2. Process the notification based on the status
//     const { reference, status, paynowreference } = req.body;

//     // The 'reference' is your original invoice ID (e.g., "ChikoroSub-profileId-timestamp")
//     // Let's extract the profileId from it.
//     const profileId = reference.split('-')[1];

//     if (!profileId) {
//         console.error("Webhook Error: Could not parse profileId from reference:", reference);
//         return res.status(400).send("Invalid Reference");
//     }

//     if (status.toLowerCase() === 'paid') {
//       console.log(`Payment Succeeded for student ${profileId}. Updating subscription.`);

//       // This is the SAME logic from your old /payments/status endpoint
//       const expirationDate = new Date(new Date().getTime() + THIRTY_DAYS_MS);

//       await db.collection("students").updateOne(
//         { _id: new ObjectId(profileId) },
//         {
//           $set: {
//             "subscription.status": "paid",
//             "subscription.paynowReference": paynowreference, // Good idea to store this
//             "subscription.expirationDate": expirationDate,
//             "subscription.updatedAt": new Date(),
//             "subscription.paymentPollUrl": null, // Clear the poll URL
//             is_trial_expired: true,
//           },
//         }
//       );
//     } else {
//         // Handle other statuses like 'cancelled', 'failed', etc.
//         console.log(`Payment for student ${profileId} has status: ${status}. Updating record.`);
//         await db.collection("students").updateOne(
//             { _id: new ObjectId(profileId) },
//             {
//                 $set: {
//                     "subscription.status": status.toLowerCase(), // e.g., 'cancelled'
//                     "subscription.updatedAt": new Date(),
//                 }
//             }
//         );
//     }

//     // 3. Acknowledge receipt to Paynow
//     // It's critical to send a 200 OK status back, otherwise Paynow will assume
//     // the notification failed and will try to send it again.
//     res.status(200).send("OK");

//   } catch (error) {
//     console.error("Error processing Paynow webhook:", error);
//     // Send a 500 status to indicate a server error. Paynow might retry.
//     res.status(500).send("Internal Server Error");
//   }
// });


// /**
//  * SECURITY HELPER FUNCTION
//  * Verifies the hash from Paynow to ensure the request is authentic.
//  * @param {object} receivedData - The req.body from the webhook.
//  * @param {string} integrationKey - Your Paynow Integration Key from your .env file.
//  * @returns {boolean} - True if the hash is valid, false otherwise.
//  */
// function verifyPaynowHash(receivedData, integrationKey) {
//     const hashToVerify = receivedData.hash;
//     delete receivedData.hash; // The hash field itself is not part of the calculation

//     // Concatenate all fields from the POST data
//     let stringToHash = "";
//     for (const key in receivedData) {
//         if (receivedData.hasOwnProperty(key)) {
//             stringToHash += receivedData[key];
//         }
//     }

//     // Append your integration key
//     stringToHash += integrationKey;

//     // Create the SHA512 hash
//     const generatedHash = crypto.createHash('sha512').update(stringToHash).digest('hex').toUpperCase();

//     console.log(`Comparing Hashes: [Received: ${hashToVerify}] vs [Generated: ${generatedHash}]`);

//     return generatedHash === hashToVerify;
// }

// Mount the v1 router
app.use("/api/v1", apiRouter);

// --- START SERVER ---
app.listen(port, async () => {
  console.log(`Chikoro AI backend running at http://localhost:${port}`);
  try {
    db = await connectToDatabase();
  } catch (dbError) {
    console.error(
      "Server startup failed due to MongoDB connection error:",
      dbError
    );
    process.exit(1);
  }
});
