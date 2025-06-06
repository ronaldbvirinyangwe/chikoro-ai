import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import fetch from 'node-fetch'; // Keep fetch if used for external APIs like Google Search
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken'; // Import jwt for token verification
 import { generateStudentSummary } from '../../config/image_understand.js'; // Uncomment if this path is correct
 import dotenv from 'dotenv'; // Import the dotenv module

dotenv.config();

const app = express();
const port = 4173;

const GOAL_CATEGORIES = ['Daily', 'Weekly', 'Monthly', 'Subject-Specific'];

// Use bodyParser with a higher limit if needed for large requests (e.g., image uploads)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection URI
const uri = "mongodb+srv://ronaldbvirinyangwe:Ia4zlauEbL6S5uYh@authentication.mzuydgr.mongodb.net/?retryWrites=true&w=majority&appName=authentication";
const client = new MongoClient(uri);

// Use the correct database name
const DB_NAME = "mydatabase"; // Ensure this matches your database name

app.use(cors()); // Enable CORS
// express.json and urlencoded are handled by bodyParser above, so no need for app.use(express.json());


let db; // Global variable for the database connection

// Utility function to connect with retry logic
const connectToDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = 5000; // Increased delay to 5 seconds

  while (attempts < maxAttempts) {
    try {
      console.log(`Attempting to connect to MongoDB (Attempt ${attempts + 1}/${maxAttempts})...`);
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// --- Authentication Middleware Placeholder ---
// You need to implement the actual JWT verification logic here.
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
      console.warn("Authentication failed: No token provided.");
      return res.sendStatus(401); // No token
  }

  const JWT_SECRET = process.env.JWTPRIVATEKEY; // Ensure this env var is set

  if (!JWT_SECRET) {
      console.error("SERVER CONFIG ERROR: JWTPRIVATEKEY environment variable not set in reports backend!");
      return res.status(500).send({ message: "Server configuration error: JWT secret not configured." });
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
      if (err) {
          console.error("JWT Verification Error:", err.name, err.message);
          // Handle specific JWT errors (expired, invalid signature, etc.)
          let statusCode = 403; // Forbidden by default
          let errorMessage = "Authentication failed.";
          if (err.name === 'TokenExpiredError') {
               statusCode = 401; // Unauthorized (session expired)
               errorMessage = "Your session has expired. Please log in again.";
          } else if (err.name === 'JsonWebTokenError') {
               statusCode = 403; // Forbidden
               errorMessage = "Invalid authentication token. Please log in again.";
          }

          // Added logging for verification errors
          console.warn(`JWT Verification Failed. Error Type: ${err.name}, Message: ${err.message}`);

          return res.status(statusCode).send({
              error: err.name,
              message: errorMessage,
              expiredAt: err.expiredAt // Only for TokenExpiredError
          });
      }

      // Attach the user payload to the request object
      // Assuming user ID is stored in _id field of the payload
      if (!userPayload || !userPayload._id) {
           console.error("JWT payload missing user ID (_id). Payload:", userPayload);
           // Added specific log for missing ID in payload
           console.warn("Authentication Failed: JWT payload does not contain user ID (_id).");
           return res.status(403).send({ message: "Invalid token payload." });
      }

      // Attach user ID to the request object
      req.user = { id: userPayload._id };
      // Added logging for successful authentication
      console.log(`Authentication Successful. User ID from Token (req.user.id): ${req.user.id}`);
      next(); // Proceed to the next middleware or route handler
  });
};
// --- End Authentication Middleware ---


// Route to save student info (Might need auth depending on your app flow)
// Assuming this is for initial student creation linked to a user
app.post('/students', async (req, res) => {
  console.log("POST /students Request Body:", req.body);
  const { email, name, age, academicLevel, curriculum, grade } = req.body; // Added curriculum based on frontend form

  // Basic validation for required fields
  if (!email || !name || !age || !academicLevel || !curriculum || !grade) {
      console.warn("Missing required fields in POST /students request.");
      return res.status(400).json({ error: "Missing required student fields (email, name, age, academicLevel, curriculum, grade)" });
  }


  if (!db) {
      console.error("Database not connected in POST /students route.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection

    const usersCollection = database.collection("users");
    // Find the user by email (assuming email is unique in users collection)
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!existingUser) {
      console.warn(`User not found for email: ${email}`);
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    const studentsCollection = database.collection("students");
    // Check if a student record already exists for this user ID (using the user's _id)
    const existingStudent = await studentsCollection.findOne({ _id: existingUser._id });
    if (existingStudent) {
         console.warn(`Student record already exists for user ID: ${existingUser._id}`);
         // Return the existing student record to the frontend
         return res.status(409).json({
             error: "Student record already exists for this user.",
             student: existingStudent, // Return the existing student data
             message: "You already have a student profile. Redirecting..." // Optional message for frontend
         }); // 409 Conflict
    }


    // Create the new student document
    const newStudent = {
      _id: existingUser._id, // CRITICAL: Use the same ID as the user record
      email: email.toLowerCase(),
      name,
      age: parseInt(age, 10), // Ensure age is stored as a number
      academicLevel,
      curriculum, // Store curriculum
      grade,
      chatHistory: {}, // Initialize empty chat history
      tests: [], // Initialize empty tests array
      goals: [], // Initialize empty goals array
      studySessions: [], // Initialize empty study sessions array
      gamification: { // Initialize gamification fields
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          level: 1,
          badges: []
      },
      subscription: { // Initialize subscription fields
          status: 'none',
          expirationDate: null,
          plan: null,
          updatedAt: null
      },
      trial_messages_used: 0, // Initialize trial fields
      trial_start_date: new Date(), // Set trial start date on creation
      is_trial_expired: false,
      createdAt: new Date() // Add creation timestamp
    };

    // Insert the new student document into the collection
    const result = await studentsCollection.insertOne(newStudent);
    console.log("New student record inserted with ID:", result.insertedId);

    // Fetch the newly created student object to return a complete document
    const createdStudent = await studentsCollection.findOne({ _id: result.insertedId });

    // Respond with the newly created student object and 201 Created status
    res.status(201).json(createdStudent);

  } catch (error) {
    console.error("Error saving student in POST /students route:", error);
    // Check for specific MongoDB errors if needed (e.g., duplicate key, though handled by findOne)
    res.status(500).json({ error: 'Failed to save student', details: error.message });
  }
});


// Route to update conversation history (chat messages)
// Apply authentication middleware
app.post('/updateConversation', authenticateUser, async (req, res) => {
  // Use the authenticated user's ID from req.user
  const studentId = req.user.id;
  const { subject, userMessage, modelResponse } = req.body;

  if (!subject || !userMessage || !modelResponse) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    if (!ObjectId.isValid(studentId)) {
      console.error("Invalid studentId format from authenticated user ID:", studentId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const database = db; // Use the global db connection
    const studentsCollection = database.collection("students");
    const studentObjectId = new ObjectId(studentId);

    // Format the user message
    const userEntry = {
      type: 'user',
      // subject: subject, // Subject is already part of the chatHistory key
      message: userMessage,
      timestamp: new Date()
    };

    // Format the model response
    const modelEntry = {
      type: 'model',
      // subject: subject, // Subject is already part of the chatHistory key
      message: modelResponse,
      timestamp: new Date()
    };

    // Update the student's chat history with both messages
    // Ensure the student exists before pushing
    const result = await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $push: {
          [`chatHistory.${subject}`]: {
            $each: [userEntry, modelEntry]
          }
        }
      }
      // No upsert: true here if you want to ensure the student record exists first
    );

    if (result.matchedCount === 0) {
         return res.status(404).json({ error: "Student not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to update student with payment token (This should likely be handled by your payment backend)
// Keeping it here for now but note it might be redundant/conflicting with the payment backend
app.post('/students/:id/update-payment', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // Consider if you should use req.user.id instead of param
  const { paymentToken } = req.body;

  if (!paymentToken) {
    return res.status(400).json({ error: "Payment token is required" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    // Optional: Verify studentId param matches authenticated user ID for security
    if (req.user.id !== studentId) {
         console.warn(`Authenticated user ${req.user.id} attempted to update payment for student ID ${studentId}. Forbidden.`);
         return res.status(403).json({ error: "Forbidden" });
    }


    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      {
        $set: {
          subscription: {
            ...paymentToken, // Assuming paymentToken is an object like { status, expirationDate, plan }
            updatedAt: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ success: true, message: "Payment information updated" });
  } catch (error) {
    console.error("Error updating student payment info:", error);
    res.status(500).json({ error: "Failed to update payment information" });
  }
});

// Get payment status from database (This should likely be handled by your payment backend)
// Keeping it here for now but note it might be redundant/conflicting with the payment backend
app.get('/payment-status/:id', authenticateUser, async (req, res) => {
  const studentId = req.params.id;

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const studentsCollection = database.collection("students");

    // Optional: Verify studentId param matches authenticated user ID for security
    if (req.user.id !== studentId) {
         console.warn(`Authenticated user ${req.user.id} attempted to get payment status for student ID ${studentId}. Forbidden.`);
         return res.status(403).json({ error: "Forbidden" });
    }


    // Find student by ID
    const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Return null if no subscription exists
    if (!student.subscription) {
      return res.json({ paymentToken: null });
    }

    // Return the subscription information
    res.json({
      paymentToken: {
        status: student.subscription.status,
        expirationDate: student.subscription.expirationDate,
        plan: student.subscription.plan
      }
    });

    console.log("Payment status retrieved for student ID:", studentId);
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Route to get student by email (Might need auth depending on your app flow)
// If this is used internally or for admin, auth might differ
app.get('/students/by-email/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();

  console.log("Looking up student with email:", email);

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the existing database connection
    const collection = database.collection("students");

    const student = await collection.findOne({ email: email });

    if (student) {
      console.log("Student found:", student.name);
      res.json(student);
    } else {
      console.log("No student found with email:", email);
      res.status(404).json({ error: "Student not found with this email" });
    }
  } catch (error) {
    console.error("Error finding student by email:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to get all students (Likely needs authentication and authorization check)
// Only admins or specific roles should probably access this
app.get('/students', async (req, res) => {
  // Add authentication and authorization checks here
  // if (!req.user || !req.user.isAdmin) { return res.status(403).json({ error: "Forbidden" }); }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const students = await collection.find({}).toArray();
    res.json(students); // Send all student records as a response
  } catch (error) {
    console.error("Error retrieving students:", error);
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

// Route to generate report
// Apply authentication middleware
app.post('/generate-report', authenticateUser, async (req, res) => {
  // Use the authenticated user's ID from req.user
  const studentId = req.user.id;
  // The frontend might still send studentId in body, but prioritize req.user.id
  // const { studentId: bodyStudentId } = req.body;
  // const studentId = req.user.id || bodyStudentId; // Prioritize authenticated user ID

  if (!studentId) {
      console.error("Authenticated user ID is missing for report generation.");
      return res.status(400).json({ error: 'Authenticated user ID is missing' });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    // Connect to database (already connected globally)
    const database = db;
    const collection = database.collection("students");

    // Find student directly from database using the authenticated user ID
    if (!ObjectId.isValid(studentId)) {
        console.error("Invalid studentId format from authenticated user ID:", studentId);
        return res.status(400).json({ error: "Invalid user ID format" });
    }
    const student = await collection.findOne({
      _id: new ObjectId(studentId)
    });

    if (!student) {
      console.warn(`Student not found for report generation for user ID: ${studentId}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    // Assuming generateStudentSummary is correctly imported and works with the student object
    // You might need to ensure generateStudentSummary is accessible or include its logic here
    //  const studentSummary = await generateStudentSummary(student); // Uncomment if generateStudentSummary is available

    // --- Placeholder for Report Generation Logic ---
    // If generateStudentSummary is not available or needs reimplementation
    const studentSummary = {
        studentName: student.name || 'Student',
        reportDate: new Date(),
        // Populate with data from the student object
        learningOverview: {
            subjectsStudied: calculateSubjectsStudiedLast24Hours(student.chatHistory),
            totalStudyTimeMinutes: calculateTotalStudyTime(student.chatHistory),
            completedTestsCount: student.tests?.length || 0,
            recentActivities: getRecentActivities(student),
        },
        testPerformance: {
            overallProficiency: calculateOverallProficiency(student.tests), // Need to implement this helper
            weeklyPerformanceChange: calculateWeeklyPerformanceChange(student.tests), // Need to implement this helper
            subjectProficiency: calculateSubjectProficiency(student.tests),
        },
        goalProgress: {
            totalGoals: student.goals?.length || 0,
            completedGoals: student.goals?.filter(g => g.completed).length || 0,
            goalCompletionPercentage: student.goals?.length > 0 ? Math.round((student.goals.filter(g => g.completed).length / student.goals.length) * 100) : 0,
        },
        gamificationSummary: {
            totalPoints: student.gamification?.totalPoints || 0,
            level: student.gamification?.level || 1,
            currentStreak: student.gamification?.currentStreak || 0,
            longestStreak: student.gamification?.longestStreak || 0,
            earnedBadgesCount: student.gamification?.badges?.length || 0,
            // Assuming totalPossibleBadges is a constant or fetched elsewhere
            totalPossibleBadges: 10, // Placeholder
            badgeCompletionPercentage: student.gamification?.badges?.length && 10 > 0 ? Math.round((student.gamification.badges.length / 10) * 100) : 0,
        },
        // Add other relevant data points
    };
    // --- End Placeholder ---


    res.json({ report: studentSummary });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Route to get student information by ID (for login/authentication check)
// Apply authentication middleware
app.get('/students/:id', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // This is the ID from the URL parameter

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to access student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  console.log("Received authenticated request for student ID:", studentId);

  if (!ObjectId.isValid(studentId)) {
    console.log("Invalid ObjectId format:", studentId);
    return res.status(400).json({ error: "Invalid student ID format" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    console.log("Looking up student with ID:", studentId);
    // Find the student using the ID from the URL (which we've verified matches the authenticated user)
    const student = await collection.findOne({
      _id: new ObjectId(studentId)
    });

    console.log("Student found:", student ? "Yes" : "No");

    if (student) {
      // Return the student object (excluding sensitive data if any)
      res.json(student);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error retrieving student:", error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});


// Route to save a new chat message for a student (This is redundant with /updateConversation)
// Consider removing this endpoint and using /updateConversation instead.
/*
app.post('/students/:id/chat', async (req, res) => {
  const studentId = req.params.id;
  const { message, subject } = req.body;

  try {
    await client.connect(); // Avoid connecting/closing per request
    const database = client.db("studentDB"); // Ensure correct DB name
    const collection = database.collection("students");

    const chatEntry = {
      subject,
      message,
      timestamp: new Date(),
    };

    const updatedStudent = await collection.findOneAndUpdate(
      { _id: new ObjectId(studentId) },
      {
        $push: {
          chatHistory: chatEntry, // This pushes to a single array 'chatHistory'
        },
      },
      { returnDocument: 'after' }
    );

    if (updatedStudent && updatedStudent.value) {
      res.json(updatedStudent.value.chatHistory);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ error: 'Failed to save chat message' });
  } finally {
    await client.close(); // Avoid connecting/closing per request
  }
});
*/

// Route to check if student exists by name (for login) (This should be handled by your auth service)
// Consider removing this endpoint as authentication is handled separately.
/*
app.get('/students/authenticate/:name', async (req, res) => {
  const studentName = req.params.name;

  try {
    await client.connect(); // Avoid connecting/closing per request
    const database = client.db("studentDB"); // Ensure correct DB name
    const collection = database.collection("students");

    const student = await collection.findOne({ name: studentName });
    if (student) {
      res.json({ _id: student._id, name: student.name }); // Return student info if found
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error logging in student:", error);
    res.status(500).json({ error: 'Failed to log in student' });
  } finally {
    await client.close(); // Avoid connecting/closing per request
  }
});
*/


// Route to get a student's chat history (This is redundant with /students/:id/chat-history/:subject)
// Consider removing this endpoint and using the subject-specific one.
/*
app.get('/students/:id/chat-history', async (req, res) => {
  const studentId = req.params.id;
  const { subject } = req.query; // Query parameter for subject

  try {
    await client.connect(); // Avoid connecting/closing per request
    const database = client.db("studentDB"); // Ensure correct DB name
    const collection = database.collection("students");

    const student = await collection.findOne({ _id: new ObjectId(studentId) });

    if (student) {
      // Assuming chatHistory is an array of messages with a 'subject' field
      if (subject) {
         const filteredChatHistory = student.chatHistory?.filter(chat => chat.subject === subject) || [];
         res.json(filteredChatHistory);
      } else {
         // If no subject query param, return all chat history (if chatHistory is an array)
         res.json(student.chatHistory || []);
      }
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  } finally {
    await client.close(); // Avoid connecting/closing per request
  }
});
*/


// Route to search and directly save results in MongoDB under the student's chatHistory
// Apply authentication middleware
app.post('/search', authenticateUser, async (req, res) => {
  // Use the authenticated user's ID from req.user
  const studentId = req.user.id;
  const { query, subject } = req.body; // Get query and subject from body

  if (!query || !subject) {
    return res.status(400).json({ error: "Missing required parameters (query, subject)" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    if (!ObjectId.isValid(studentId)) {
      console.error("Invalid studentId format from authenticated user ID:", studentId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const database = db; // Use the global db connection
    const studentsCollection = database.collection("students");
    const studentObjectId = new ObjectId(studentId);

    // Retrieve the student from the database to check for existing search results
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!student) {
      console.warn(`Student not found for search for user ID: ${studentId}`);
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if the search has been already performed for this query and subject
    // Assuming chatHistory is an object with subjects as keys
    const existingSearchEntry = student.chatHistory?.[subject]?.find(entry => 
        entry.type === 'search' && entry.message === `Search: ${query}`
    );

    if (existingSearchEntry && existingSearchEntry.results) {
      console.log('Serving cached search results from chat history');
      return res.json({ results: existingSearchEntry.results });
    }

    // Google Custom Search API settings
    // IMPORTANT: Securely manage your API key! Avoid hardcoding in production.
    const customSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY; // Use environment variable
    const cx = process.env.GOOGLE_SEARCH_CX; // Use environment variable

    if (!customSearchApiKey || !cx) {
         console.error("Google Search API Key or CX not set in environment variables.");
         return res.status(500).json({ error: "Search service not configured." });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${customSearchApiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`; // Encode query

    const searchResponse = await fetch(url);
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error(`Search API error: ${searchResponse.status} - ${searchResponse.statusText}`, errorBody);
      // Check for specific API errors like daily limit exceeded
      if (searchResponse.status === 429 || errorBody.includes('dailyLimitExceeded')) {
          return res.status(429).json({ error: 'Search API daily limit exceeded. Please try again tomorrow.' });
      }
      throw new Error(`Search API error: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    // Format the search results
    const formattedResults = searchData.items?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || [];

    // Store the search result in the student's chat history
    const chatEntry = {
      type: 'search',
      // subject: subject, // Subject is part of the chatHistory key
      message: `Search: ${query}`, // Store the query itself
      timestamp: new Date(),
      results: formattedResults // Store the formatted results
    };

    // Update the student's chat history with the search results
    // Ensure the student exists before pushing (checked above)
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $push: {
          [`chatHistory.${subject}`]: chatEntry
        }
      }
    );

    res.json({ results: formattedResults });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message || 'An error occurred during search.' });
  }
});


// chat message endpoint (This is redundant with /updateConversation)
// Consider removing this endpoint and using /updateConversation instead.
/*
app.post('/students/:id/chat/:subject', async (req, res) => {
  const studentId = req.params.id;
  const subject = req.params.subject;
  const { message } = req.body;

  if (!message || !subject) {
    return res.status(400).json({ error: "Message and subject are required" });
  }

  try {
    await client.connect(); // Avoid connecting/closing per request
    const database = client.db("studentDB"); // Ensure correct DB name
    const collection = database.collection("students");

    const chatEntry = {
      type: 'user',
      message: message,
      timestamp: new Date(),
      subject: subject // This subject field seems redundant if subject is the chatHistory key
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(studentId) },
      {
        $push: {
          [`chatHistory.${subject}`]: chatEntry
        }
      },
      {
        returnDocument: 'after',
        upsert: true // Upsert might create a student if not found - check desired behavior
      }
    );

    if (result.value) {
      // Return only the chat history for the specific subject
      const subjectHistory = result.value.chatHistory[subject] || [];
      res.json(subjectHistory);
    } else {
      // If upsert is false and student not found
      res.status(404).json({ error: "Student not found" });
    }

  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ error: 'Failed to save chat message' });
  } finally {
    await client.close(); // Avoid connecting/closing per request
  }
});
*/

//chat history retrieval endpoint
// Apply authentication middleware
app.get('/students/:id/chat-history/:subject', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param
  const subject = req.params.subject;

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to access chat history for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    if (!ObjectId.isValid(studentId)) {
        console.error("Invalid studentId format from authenticated user ID:", studentId);
        return res.status(400).json({ error: "Invalid user ID format" });
    }

    const student = await collection.findOne(
        { _id: new ObjectId(studentId) },
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
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Get all goals for a student
// Apply authentication middleware
app.get('/students/:id/goals', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to access goals for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  // Validate studentId format
  if (!ObjectId.isValid(studentId)) {
    console.error("Invalid student ID format from authenticated user ID:", studentId);
    return res.status(400).json({ error: "Invalid user ID format" });
  }

   if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { projection: { goals: 1 } } // Only fetch goals field
    );

    res.json(student?.goals || []); // Return goals array or empty array if student/goals not found
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create a new goal
// Apply authentication middleware
app.post('/students/:id/goals', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param
  const { text, category, targetDate } = req.body;

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to create goal for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!ObjectId.isValid(studentId)) {
    console.error("Invalid student ID format from authenticated user ID:", studentId);
    return res.status(400).json({ error: "Invalid user ID format" });
  }

   if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const newGoal = {
      _id: new ObjectId(), // Generate a new ObjectId for the goal itself
      text,
      category, // Ensure category is one of GOAL_CATEGORIES if needed
      targetDate: targetDate ? new Date(targetDate) : null, // Convert targetDate to Date object
      completed: false,
      createdAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { goals: newGoal } }
    );

    if (result.matchedCount === 0) {
      // Student not found
      return res.status(404).json({ error: "Student not found" });
    }
     // If matchedCount is > 0, modifiedCount might be 0 if the goal array didn't exist before
     // or if the update didn't actually change anything (though $push always changes).

    res.status(201).json(newGoal); // Return the newly created goal object
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update goal status
// Apply authentication middleware
app.patch('/students/:id/goals/:goalId', authenticateUser, async (req, res) => {
  const { id: studentId, goalId } = req.params; // ID from URL params
  const { completed } = req.body;

  // Security Check: Ensure the requested student ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to update goal for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!ObjectId.isValid(studentId) || !ObjectId.isValid(goalId)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

   if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const result = await collection.updateOne(
      {
        _id: new ObjectId(studentId),
        "goals._id": new ObjectId(goalId) // Match the specific goal by its ID
      },
      { $set: { "goals.$.completed": completed } } // Update the 'completed' field of the matched goal
    );

    if (result.matchedCount === 0) {
      // Student or Goal not found
      return res.status(404).json({ error: "Goal not found for this student" });
    }

    // modifiedCount === 0 means the 'completed' status was already the requested value
    if (result.modifiedCount === 0) {
        console.log(`Goal ${goalId} for student ${studentId} was already set to completed: ${completed}.`);
    }


    res.json({ success: true, message: "Goal updated successfully" });
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete a goal
// Apply authentication middleware
app.delete('/students/:id/goals/:goalId', authenticateUser, async (req, res) => {
  const { id: studentId, goalId } = req.params; // ID from URL params

  // Security Check: Ensure the requested student ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to delete goal for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!ObjectId.isValid(studentId) || !ObjectId.isValid(goalId)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

   if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $pull: { goals: { _id: new ObjectId(goalId) } } } // Pull the goal with the matching ID
    );

    if (result.modifiedCount === 0) {
      // Student found, but goal with goalId not found in the goals array
      return res.status(404).json({ error: "Goal not found for this student" });
    }

    res.json({ success: true, message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});


// Get gamification data for a student
// Apply authentication middleware
app.get('/students/:id/gamification', authenticateUser, async (req, res) => { // <-- Middleware applied here
  // --- Added log at the very beginning of the route handler ---
  console.log(`Entering /students/:id/gamification route handler.`);
  console.log(`  State of req.user upon entry: ${JSON.stringify(req.user)}`);
  // --- End Added log ---

  const studentId = req.params.id; // ID from URL param

  // Added logging to see IDs side-by-side
  console.log(`Accessing /students/${studentId}/gamification`);
  console.log(`  ID from Token (req.user.id): ${req.user.id}`);
  console.log(`  ID from URL (req.params.id): ${studentId}`);


  // --- SECURITY NOTE: Reinstated the authorization check below ---
  // This now requires the authenticated user ID to match the student ID in the URL.
  if (req.user.id !== studentId) {
      console.warn(`AUTHORIZATION FAILED: Authenticated user ${req.user.id} attempted to access gamification for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }
  // --- End Security Note ---


  if (!ObjectId.isValid(studentId)) {
    console.error("Invalid student ID format from authenticated user ID:", studentId);
    return res.status(400).json({ error: "Invalid user ID format" });
  }

   if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { projection: { gamification: 1 } } // Only fetch gamification field
    );

    // Return gamification data or default empty structure
    res.json(student?.gamification || {
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        level: 1,
        badges: []
    });
  } catch (error) {
    console.error("Error fetching gamification data:", error);
    res.status(500).json({ error: 'Failed to fetch gamification data' });
  }
});



// Save a new test result for a student
// Apply authentication middleware
app.post('/students/:id/tests', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param
  const { subject, score, totalQuestions, details } = req.body; // Added 'details'

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to save test for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }


  try {
    // Validate required fields
    if (!subject || score === undefined || totalQuestions === undefined || !details) {
      return res.status(400).json({ error: "Subject, score, totalQuestions, and details are required" });
    }

    // Validate the student ID
    if (!ObjectId.isValid(studentId)) {
      console.error("Invalid student ID format from authenticated user ID:", studentId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
    }

    const database = db; // Use the global db connection
    const collection = database.collection("students");

    // --- Check Last Test Timestamp ---
    // Fetch the student to check the last test date
    const student = await collection.findOne(
        { _id: new ObjectId(studentId) },
        { projection: { tests: { $slice: -1 } } } // Fetch only the last test
    );

    if (!student) {
        console.warn(`Student not found for test save for user ID: ${studentId}`);
        return res.status(404).json({ error: "Student not found" });
    }

    const lastTest = student.tests && student.tests.length > 0 ? student.tests[0] : null;
    const now = new Date();
    const fiveHoursInMillis = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

    if (lastTest && (now.getTime() - new Date(lastTest.date).getTime()) < fiveHoursInMillis) {
        // Calculate remaining time
        const timeSinceLastTest = now.getTime() - new Date(lastTest.date).getTime();
        const remainingTimeMillis = fiveHoursInMillis - timeSinceLastTest;
        const remainingHours = Math.floor(remainingTimeMillis / (1000 * 60 * 60));
        const remainingMinutes = Math.ceil((remainingTimeMillis % (1000 * 60 * 60)) / (1000 * 60));

        console.warn(`Test limit exceeded for student ${studentId}. Remaining time: ${remainingHours}h ${remainingMinutes}m`);
        return res.status(429).json({ // 429 Too Many Requests is appropriate
            error: `You can only take one test every 5 hours. Please wait ${remainingHours} hours and ${remainingMinutes} minutes before taking another test.`,
            code: 'TEST_LIMIT_EXCEEDED', // Custom code for frontend to identify
            remainingTime: remainingTimeMillis // Provide remaining time in milliseconds
        });
    }
    // --- End Check Last Test Timestamp ---


    const newTest = {
      _id: new ObjectId(), // Generate a new ObjectId for the test itself
      subject,
      score: Number(score), // Ensure score is a number
      totalQuestions: Number(totalQuestions), // Ensure totalQuestions is a number
      date: now, // Use the current timestamp
      performanceMetrics: calculatePerformanceMetrics(Number(score), Number(totalQuestions)), // Recalculate or use provided details
      details: details // Store the full grading details
    };

    console.log("Saving test:", newTest);

    // Push the new test to the student's tests array
    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { tests: newTest } }
    );

    console.log("Test save result:", result);

    if (result.matchedCount === 0) {
      // This case should ideally not happen if student was found above, but good defensive check
      console.error(`Student not found for test save update query for user ID: ${studentId}`);
      return res.status(404).json({ error: "Student not found after initial check" });
    }

    // --- Badge Awarding Logic (Ensure checkAndAwardBadges and updateStreak are defined elsewhere) ---
    // You would typically call these helper functions here after a successful test save.
    // await checkAndAwardBadges(studentId, newTest, 'test'); // Example
    // await updateStreak(studentId); // Example
    // --- End Badge Logic ---


    res.status(201).json(newTest); // Return the newly created test object
  } catch (error) {
    console.error("Error saving test:", error);
    // Check if it's a known error from the limit check
    if (error.code === 'TEST_LIMIT_EXCEEDED') {
         return res.status(429).json(error); // Re-throw the specific error response
    }
    res.status(500).json({ error: 'Failed to save test results', details: error.message });
  }
});

// Get tests for a student
// Apply authentication middleware
app.get('/students/:id/tests', authenticateUser, async (req, res) => { // <-- Middleware applied here
  const studentId = req.params.id; // ID from URL param

  // Added logging to see IDs side-by-side
  console.log(`Accessing /students/${studentId}/tests`);
  console.log(`  ID from Token (req.user.id): ${req.user.id}`);
  console.log(`  ID from URL (req.params.id): ${studentId}`);


  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`AUTHORIZATION FAILED: Authenticated user ${req.user.id} attempted to access tests for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  try {
    // Validate the student ID
    if (!ObjectId.isValid(studentId)) {
      console.error("Invalid student ID format from authenticated user ID:", studentId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
    }

    const database = db; // Use the global db connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { projection: { tests: 1 } } // Only fetch tests field
    );

    if (!student) {
      console.warn(`Student not found for tests retrieval for user ID: ${studentId}`);
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student.tests || []); // Return tests array or empty array
  } catch (error) {
    console.error("Error retrieving tests:", error);
    res.status(500).json({ error: 'Failed to retrieve test results' });
  }
});

// Get progress dashboard data
// Apply authentication middleware
app.get('/students/:id/progress', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to access progress for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!ObjectId.isValid(studentId)) {
    console.error("Invalid student ID format from authenticated user ID:", studentId);
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    // Use the global database connection
    const database = db;
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      {
        projection: {
          chatHistory: 1,
          goals: 1,
          tests: 1,
          studySessions: 1, // Include studySessions if needed for progress calculation
          gamification: 1 // Include gamification if needed for progress calculation (e.g., streak)
        }
      }
    );

    if (!student) {
        console.warn(`Student not found for progress retrieval for user ID: ${studentId}`);
        return res.status(404).json({ error: "Student not found" });
    }

    // Calculate metrics with the helper functions
    const progressData = {
      subjectsStudied: calculateSubjectsStudiedLast24Hours(student.chatHistory),
      totalStudyTime: calculateTotalStudyTime(student.chatHistory), // Assuming this calculates time from chatHistory
      completedTests: student.tests?.length || 0,
      activeGoals: student.goals?.filter(g => !g.completed).length || 0,
      recentActivities: getRecentActivities(student),
      subjectProficiency: calculateSubjectProficiency(student.tests),
      // Include other relevant progress metrics derived from student object
      // e.g., student.gamification?.currentStreak, student.gamification?.totalPoints
    };

    res.json(progressData);
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// Log a study session
// Apply authentication middleware
app.post('/students/:id/study-session', authenticateUser, async (req, res) => {
  const studentId = req.params.id; // ID from URL param
  const { subject, startTime, endTime } = req.body;

  // Security Check: Ensure the requested ID matches the authenticated user's ID
  if (req.user.id !== studentId) {
      console.warn(`Authenticated user ${req.user.id} attempted to log study session for student ID ${studentId}. Forbidden.`);
      return res.status(403).json({ error: "Forbidden" });
  }

  if (!subject || !startTime || !endTime) {
    return res.status(400).json({ error: "Subject, startTime, and endTime are required" });
  }

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    // Validate student ID format
     if (!ObjectId.isValid(studentId)) {
        console.error("Invalid student ID format from authenticated user ID:", studentId);
        return res.status(400).json({ error: "Invalid user ID format" });
     }

    const session = {
      _id: new ObjectId(), // Generate ID for the session
      subject,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: (new Date(endTime) - new Date(startTime)) / (60 * 1000) // duration in minutes
    };

    // Ensure dates are valid
    if (isNaN(session.startTime.getTime()) || isNaN(session.endTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format for startTime or endTime" });
    }

    // Ensure end time is not before start time
    if (session.endTime < session.startTime) {
        return res.status(400).json({ error: "End time cannot be before start time" });
    }


    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { studySessions: session } }
    );

    if (result.matchedCount === 0) {
      // Student not found
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(201).json(session); // Return the newly created session object
  } catch (error) {
    console.error("Error logging study session:", error);
    res.status(500).json({ error: 'Failed to log study session' });
  }
});

// Get leaderboard data (This might be public, adjust auth middleware as needed)
app.get('/leaderboard', async (req, res) => {
  // You might add optional authentication here if you only show leaderboard to logged-in users
  // If it's public, no auth middleware is needed.

  if (!db) {
      console.error("Database not connected.");
      return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const database = db; // Use the global db connection
    const collection = database.collection("students");

    // Fetch students, sort by totalPoints in descending order, limit to top N
    const leaderboardData = await collection.find(
        {},
        { projection: { name: 1, gamification: 1 } } // Only fetch name and gamification fields
    )
    .sort({ 'gamification.totalPoints': -1 }) // Sort by totalPoints descending
    .limit(10) // Limit to top 10 (adjust as needed)
    .toArray();

    res.json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});


// ======================
// HELPER FUNCTIONS (Ensure these are correctly implemented and cover edge cases)
// ======================

// Keep your existing helper functions here, ensuring they use the data structure
// from the student document correctly.

function calculateTotalStudyTime(chatHistory) {
  if (!chatHistory) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Extract timestamps from chat history
  let studySessions = [];
  Object.entries(chatHistory || {}).forEach(([subject, chats]) => {
    // Group consecutive messages within 5 minutes of each other as a session
    let currentSession = null;

    chats.forEach(chat => {
      const messageTime = new Date(chat.timestamp);

      // Skip messages from previous days
      if (messageTime < today) {
        // End any active session if we cross into a new day
        currentSession = null;
        return;
      }

      if (!currentSession) {
        // Start a new session
        currentSession = {
          startTime: messageTime,
          endTime: messageTime,
          subject: subject
        };
        studySessions.push(currentSession);
      } else if ((messageTime - currentSession.endTime) <= 5 * 60 * 1000) {
        // If message is within 5 minutes of the last one, extend the current session
        currentSession.endTime = messageTime;
      } else {
        // Start a new session if more than 5 minutes have passed
        currentSession = {
          startTime: messageTime,
          endTime: messageTime,
          subject: subject
        };
        studySessions.push(currentSession);
      }
    });
  });

 // Calculate total minutes spent today
  const totalMinutes = studySessions.reduce((total, session) => {
    const durationMinutes = (session.endTime - session.startTime) / (60 * 1000);
    // Add at least 1 minute per session, even for very quick interactions
    return total + Math.max(durationMinutes, 1); // Count at least 1 minute per interaction block
  }, 0);

  return Math.round(totalMinutes);
}


function getRecentActivities(student) {
  const activities = [];

  // Add chat sessions
  Object.entries(student.chatHistory || {}).forEach(([subject, chats]) => {
    chats.forEach(chat => {
      activities.push({
        type: chat.type || 'chat', // Use chat entry type if available
        subject,
        date: chat.timestamp,
        content: chat.message?.substring(0, 100) || 'No content' // Limit content length
      });
    });
  });

  // Add tests
  student.tests?.forEach(test => {
    activities.push({
      type: 'test',
      subject: test.subject,
      date: test.date,
      content: `Scored ${test.score !== undefined ? test.score : 'N/A'}/${test.totalQuestions !== undefined ? test.totalQuestions : 'N/A'}`
    });
  });

  // Add goal completions
  student.goals?.forEach(goal => {
    if (goal.completed) {
      activities.push({
        type: 'goal',
        subject: goal.category === 'Subject-Specific' ? goal.subject : 'General', // Assuming subject might be in goal object
        date: goal.completedAt || goal.createdAt, // Use completedAt if available, otherwise createdAt
        content: `Completed goal: ${goal.text?.substring(0, 100) || 'No text'}` // Limit content length
      });
    }
  });

   // Add study sessions (optional, depending on how you want to represent them)
   student.studySessions?.forEach(session => {
       activities.push({
           type: 'study session',
           subject: session.subject,
           date: session.endTime || session.startTime, // Use end time as activity time
           content: `Studied ${session.subject} for ${Math.round(session.duration || 0)} minutes`
       });
   });


  return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10); // Limit to 10 recent activities
}

function calculateSubjectProficiency(tests = []) {
  const subjectMap = {};

  tests.forEach(test => {
    // Ensure test and score are valid before using
    if (test && test.subject && test.score !== undefined && !isNaN(test.score)) {
      if (!subjectMap[test.subject]) {
        subjectMap[test.subject] = {
          totalScore: 0,
          totalTests: 0
        };
      }
      subjectMap[test.subject].totalScore += test.score;
      subjectMap[test.subject].totalTests++;
    }
  });

  return Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    // Calculate average score, handle division by zero
    averageScore: data.totalTests > 0 ? Math.round((data.totalScore / data.totalTests) * 10) / 10 : 0
  }));
}

// Helper to calculate overall proficiency from tests
function calculateOverallProficiency(tests = []) {
    if (tests.length === 0) return 'N/A';

    const totalScore = tests.reduce((sum, test) => sum + (test.score !== undefined && !isNaN(test.score) ? test.score : 0), 0);
    const averagePercentage = totalScore / tests.length;

    if (averagePercentage >= 90) {
        return 'Advanced';
    } else if (averagePercentage >= 75) {
        return 'Proficient';
    } else if (averagePercentage >= 60) {
        return 'Developing';
    } else {
        return 'Needs Improvement';
    }
}

// Placeholder helper to calculate weekly performance change
// This would require fetching tests from the last two weeks and comparing averages
function calculateWeeklyPerformanceChange(tests = []) {
    // This is a complex calculation requiring date filtering and comparison
    // Placeholder implementation returning a fixed value or N/A
    if (tests.length < 2) return 0; // Need at least two tests to show change

    // Example: Calculate average of last 7 days vs previous 7 days
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const lastWeekTests = tests.filter(test => new Date(test.date) >= lastWeek && new Date(test.date) < now);
    const previousWeekTests = tests.filter(test => new Date(test.date) >= twoWeeksAgo && new Date(test.date) < lastWeek);

    const calculateAverage = (testArray) => {
        if (testArray.length === 0) return 0;
        const totalScore = testArray.reduce((sum, test) => sum + (test.score !== undefined && !isNaN(test.score) ? test.score : 0), 0);
        return totalScore / testArray.length;
    };

    const lastWeekAvg = calculateAverage(lastWeekTests);
    const previousWeekAvg = calculateAverage(previousWeekTests);

    if (previousWeekAvg === 0) {
        // Avoid division by zero, if there were no tests last week, change is based on current week avg
        return lastWeekAvg > 0 ? 100 : 0; // If current week avg > 0, 100% increase, else 0%
    }

    const change = ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;
    return Math.round(change); // Return rounded percentage change
}


function calculatePerformanceMetrics(score, totalQuestions) {
  const percentage = score; // Assuming score is already a percentage 0-100
  let proficiencyLevel = '';

  // Determine proficiency level based on percentage
  if (percentage >= 90) {
    proficiencyLevel = 'Advanced';
  } else if (percentage >= 75) {
    proficiencyLevel = 'Proficient';
  } else if (percentage >= 60) {
    proficiencyLevel = 'Developing';
  } else {
    proficiencyLevel = 'Needs Improvement';
  }

  return {
    percentage: Math.round(percentage),
    proficiencyLevel,
    strengths: [],
    areasToImprove: []
  };
}

function calculateSubjectsStudiedLast24Hours(chatHistory) {
  if (!chatHistory) return 0;

  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);

  // Create a Set to store unique subjects studied in the last 24 hours
  const recentSubjects = new Set();

  Object.entries(chatHistory).forEach(([subject, chats]) => {
    // Check if any chat in this subject occurred in the last 24 hours
    // Ensure chats is an array before using some
    if (Array.isArray(chats)) {
        const hasRecentActivity = chats.some(chat => {
          // Ensure chat and timestamp exist and are valid
          if (chat && chat.timestamp) {
            const chatTime = new Date(chat.timestamp);
            return chatTime instanceof Date && !isNaN(chatTime) && chatTime >= last24Hours;
          }
          return false;
        });

        if (hasRecentActivity) {
          recentSubjects.add(subject);
        }
    }
  });

  return recentSubjects.size;
}

app.post('/user/increment-trial', authenticateUser, async (req, res) => {
    // The authenticated user's ID is available from the `authenticateUser` middleware
    const userId = req.user.id;
    const FREE_TRIAL_LIMIT = 5; // Define your trial limit on the backend

    if (!userId) {
        console.error("Authenticated user ID is missing for trial increment.");
        return res.status(400).json({ error: 'Authenticated user ID is missing' });
    }

    if (!db) {
        console.error("Database not connected in /api/user/increment-trial route.");
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const studentsCollection = db.collection("students");

        if (!ObjectId.isValid(userId)) {
            console.error("Invalid userId format for trial increment:", userId);
            return res.status(400).json({ error: "Invalid user ID format" });
        }

        const studentObjectId = new ObjectId(userId);

        // Fetch the student to check their current trial status and subscription
        const student = await studentsCollection.findOne({ _id: studentObjectId });

        if (!student) {
            console.warn(`Student not found for trial increment for user ID: ${userId}`);
            return res.status(404).json({ error: 'Student record not found.' });
        }

        // Backend validation: Don't increment if subscribed or trial expired
        if (student.subscription && student.subscription.status === 'active') {
            console.log(`Trial increment skipped for user ${userId}: User has an active subscription.`);
            return res.status(200).json({
                message: "User is subscribed, trial limit check skipped.",
                newTrialCount: student.trial_messages_used // Return current count
            });
        }

        if (student.is_trial_expired) {
            console.log(`Trial increment skipped for user ${userId}: Trial already expired.`);
            return res.status(403).json({
                error: "Your free trial has expired.",
                newTrialCount: student.trial_messages_used // Return current count
            });
        }

        // Check if the trial limit has been reached on the backend
        if (student.trial_messages_used >= FREE_TRIAL_LIMIT) {
            console.log(`Trial limit reached for user ${userId}: ${student.trial_messages_used}/${FREE_TRIAL_LIMIT}.`);
            // Optionally update `is_trial_expired` if not already set
            await studentsCollection.updateOne(
                { _id: studentObjectId },
                { $set: { is_trial_expired: true } }
            );
            return res.status(403).json({
                error: "You have reached your free trial message limit. Please subscribe to continue.",
                newTrialCount: student.trial_messages_used // Return current count
            });
        }

        // Increment the trial message count
        const result = await studentsCollection.updateOne(
            { _id: studentObjectId },
            { $inc: { trial_messages_used: 1 } }
        );

        if (result.matchedCount === 0) {
            console.warn(`Failed to find student for trial increment for user ID: ${userId}`);
            return res.status(404).json({ error: "Student not found for update." });
        }

        // Fetch the updated student record to get the new count
        const updatedStudent = await studentsCollection.findOne({ _id: studentObjectId });
        const newTrialCount = updatedStudent.trial_messages_used;

        // If the new count reaches the limit, mark the trial as expired
        if (newTrialCount >= FREE_TRIAL_LIMIT) {
             await studentsCollection.updateOne(
                 { _id: studentObjectId },
                 { $set: { is_trial_expired: true } }
             );
             console.log(`Trial for user ${userId} has now expired at ${newTrialCount} messages.`);
             return res.status(200).json({
                 message: "Trial incremented. Trial limit reached.",
                 newTrialCount: newTrialCount,
                 trialExpired: true
             });
        }

        console.log(`Trial message count incremented for user ${userId}. New count: ${newTrialCount}`);
        res.status(200).json({ newTrialCount: newTrialCount });

    } catch (error) {
        console.error("Error incrementing trial message count:", error);
        res.status(500).json({ error: 'Failed to increment trial message count', details: error.message });
    }
});


// --- Start Server ---
app.listen(port, async () => {
  console.log(`Reports backend running at http://localhost:${port}`);
  try {
    db = await connectToDatabase(); // Establish the global database connection on startup
    // No need to log success here, it's logged inside connectToDatabase
  } catch (dbError) {
    console.error("Server startup failed due to MongoDB connection error:", dbError);
    process.exit(1); // Exit the process if unable to connect to DB on startup
  }
});
