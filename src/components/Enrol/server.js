import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import fetch from 'node-fetch';
import { generateStudentSummary } from '../../config/image_understand.js';
import bodyParser from 'body-parser';

const app = express();
const port = 3001;

const GOAL_CATEGORIES = ['Daily', 'Weekly', 'Monthly', 'Subject-Specific'];

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection URI
const uri = "mongodb+srv://ronaldbvirinyangwe:Ia4zlauEbL6S5uYh@authentication.mzuydgr.mongodb.net/?retryWrites=true&w=majority&appName=authentication";
const client = new MongoClient(uri);

app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

let db;


// Utility function to connect with retry logic
const connectToDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = 2000; // 2 seconds delay between retries

  while (attempts < maxAttempts) {
    try {
      await client.connect();
      return client.db("mydatabase");
    } catch (error) {
      console.error("MongoDB connection error: ", error);
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Failed to connect to MongoDB after several attempts");
      }
      console.log(`Retrying MongoDB connection in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Route to save student info

app.post('/students', async (req, res) => {
  console.log("Request Body:", req.body);
  const { email, name, age, academicLevel, grade } = req.body;

  try {
    const database = db; 
    

    const usersCollection = database.collection("users");
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!existingUser) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }
    
    const studentsCollection = database.collection("students");
    const newStudent = { 
      email: email.toLowerCase(),
      name, 
      age, 
      academicLevel, 
      grade, 
      chatHistory: {} 
    };

    const result = await studentsCollection.insertOne(newStudent);
    res.status(201).json({
      _id: result.insertedId,
      ...newStudent
    });
    
  } catch (error) {
    console.error("Error saving student:", error);
    res.status(500).json({ error: 'Failed to save student' });
  } 
});

app.post('/updateConversation', async (req, res) => {
  const { studentId, subject, userMessage, modelResponse } = req.body;
  
  if (!studentId || !subject || !userMessage || !modelResponse) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  
  try {
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: "Invalid studentId format" });
    }
    
    const database = await connectToDatabase();
    const studentsCollection = database.collection("students");
    const studentObjectId = new ObjectId(studentId);
    
    // Format the user message
    const userEntry = {
      type: 'user',
      subject: subject,
      message: userMessage,
      timestamp: new Date()
    };
    
    // Format the model response
    const modelEntry = {
      type: 'model',
      subject: subject,
      message: modelResponse,
      timestamp: new Date()
    };
    
    // Update the student's chat history with both messages
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $push: {
          [`chatHistory.${subject}`]: {
            $each: [userEntry, modelEntry]
          }
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to update student with payment token
app.post('/students/:id/update-payment', async (req, res) => {
  const studentId = req.params.id;
  const { paymentToken } = req.body;

  if (!paymentToken) {
    return res.status(400).json({ error: "Payment token is required" });
  }

  try {
    const database = db; 
    const collection = database.collection("students");
    
    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { 
        $set: {
          subscription: {
            ...paymentToken,
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

// Get payment status from database
app.get('/payment-status/:id', async (req, res) => {
  const studentId = req.params.id;
  
  try {
    const database = db;
    const studentsCollection = database.collection("students");
    
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

// Route to get student by emai
app.get('/students/by-email/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();
  
  console.log("Looking up student with email:", email);
  
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

// Route to get all students
app.get('/students', async (req, res) => {
  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const students = await collection.find({}).toArray();
    res.json(students); // Send all student records as a response
  } catch (error) {
    console.error("Error retrieving students:", error);
    res.status(500).json({ error: 'Failed to retrieve students' });
  } finally {
    await client.close();
  }
});

app.post('/generate-report', async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId in request' });
    }

    // Connect to database
    const database = await connectToDatabase();
    const collection = database.collection("students");

    // Find student directly from database
    const student = await collection.findOne({ 
      _id: new ObjectId(studentId) 
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Generate summary for single student
    const studentSummary = await generateStudentSummary(student);

    res.json({ report: studentSummary });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Route to get student information by ID (for login)
// Verify your backend has this route (server.js)
app.get('/students/:id', async (req, res) => {
  const studentId = req.params.id;
  console.log("Received request for student ID:", studentId);
  
  if (!ObjectId.isValid(studentId)) {
    console.log("Invalid ObjectId format:", studentId);
    return res.status(400).json({ error: "Invalid student ID format" });
  }
  
  try {
    console.log("Connecting to database...");
    const database = await connectToDatabase();
    const collection = database.collection("students");
    
    console.log("Looking up student with ID:", studentId);
    const student = await collection.findOne({ 
      _id: new ObjectId(studentId)
    });

    console.log("Student found:", student ? "Yes" : "No");
    
    if (student) {
      res.json(student);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error retrieving student:", error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});


// Route to save a new chat message for a student
app.post('/students/:id/chat', async (req, res) => {
  const studentId = req.params.id;
  const { message, subject } = req.body;

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const updatedStudent = await collection.findOneAndUpdate(
      { _id: new ObjectId(studentId) },
      {
        $push: {
          chatHistory: {
            subject,
            message,
            timestamp: new Date(),
          },
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
    await client.close();
  }
});

// Route to check if student exists by name (for login)
app.get('/students/authenticate/:name', async (req, res) => {
  const studentName = req.params.name;

  try {
    await client.connect();
    const database = client.db("studentDB");
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
    await client.close();
  }
});



// Route to get a student's chat history
app.get('/students/:id/chat-history', async (req, res) => {
  const studentId = req.params.id;
  const { subject } = req.query;

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const student = await collection.findOne({ _id: new ObjectId(studentId) });

    if (student) {
      // Filter chat history by subject
      const filteredChatHistory = student.chatHistory.filter(chat => chat.subject === subject);
      res.json(filteredChatHistory);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  } finally {
    await client.close();
  }
});


// Route to search and directly save results in MongoDB under the student's chatHistory
app.post('/search', async (req, res) => {
  const { query, studentId, subject } = req.body;

  if (!query || !studentId || !subject) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: "Invalid studentId format" });
    }

    const database = await connectToDatabase();
    const studentsCollection = database.collection("students");
    const studentObjectId = new ObjectId(studentId);

    // Retrieve the student from the database
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if the search has been already performed for this query and subject
    const existingSearch = student.chatHistory[subject]?.find(entry => entry.message === `Search: ${query}`);

    if (existingSearch) {
      console.log('Serving cached search results from chat history');
      return res.json({ results: existingSearch.results });
    }

    // Google Custom Search API settings
    const customSearchApiKey = "AIzaSyCnvM9marRKHXOh7TJBCXRuSypwJWq4wpM";
    const cx = "122c61a18e46b44f5";
    const url = `https://www.googleapis.com/customsearch/v1?key=${customSearchApiKey}&cx=${cx}&q=${query}&num=10`;  

    const searchResponse = await fetch(url);
    if (!searchResponse.ok) {
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
      subject: subject,
      message: `Search: ${query}`,
      timestamp: new Date(),
      results: formattedResults
    };

    // Update the student's chat history with the search results
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $push: {
          [`chatHistory.${subject}`]: chatEntry
        }
      },
      { upsert: true }
    );

    res.json({ results: formattedResults });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});


// chat message endpoint
app.post('/students/:id/chat/:subject', async (req, res) => {
  const studentId = req.params.id;
  const subject = req.params.subject;
  const { message } = req.body;

  if (!message || !subject) {
    return res.status(400).json({ error: "Message and subject are required" });
  }

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const chatEntry = {
      type: 'user',
      message: message,
      timestamp: new Date(),
      subject: subject
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
        upsert: true 
      }
    );

    if (result.value) {
      // Return only the chat history for the specific subject
      const subjectHistory = result.value.chatHistory[subject] || [];
      res.json(subjectHistory);
    } else {
      res.status(404).json({ error: "Student not found" });
    }

  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ error: 'Failed to save chat message' });
  } finally {
    await client.close();
  }
});

//chat history retrieval endpoint
app.get('/students/:id/chat-history/:subject', async (req, res) => {
  const studentId = req.params.id;
  const subject = req.params.subject;

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const student = await collection.findOne({ _id: new ObjectId(studentId) });

    if (student && student.chatHistory && student.chatHistory[subject]) {
      res.json(student.chatHistory[subject]); // Return chat history for specific subject
    } else {
      res.json([]); // Return empty array if no history for subject
    }
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  } finally {
    await client.close();
  }
});

// Get all goals for a student
app.get('/students/:id/goals', async (req, res) => {
  const studentId = req.params.id;

  // Validate studentId format
  if (!ObjectId.isValid(studentId)) {
    return res.status(400).json({ error: "Invalid student ID format" });
  }

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { projection: { goals: 1 } }
    );

    res.json(student?.goals || []);
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  } finally {
    await client.close();
  }
});

// Create a new goal
app.post('/students/:id/goals', async (req, res) => {
  const studentId = req.params.id;
  const { text, category, targetDate } = req.body;

  if (!ObjectId.isValid(studentId)) {
    return res.status(400).json({ error: "Invalid student ID format" });
  }

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const newGoal = {
      _id: new ObjectId(),
      text,
      category,
      targetDate,
      completed: false,
      createdAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { goals: newGoal } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(201).json(newGoal);
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ error: 'Failed to create goal' });
  } finally {
    await client.close();
  }
});

// Update goal status
app.patch('/students/:id/goals/:goalId', async (req, res) => {
  const { id: studentId, goalId } = req.params;
  const { completed } = req.body;

  if (!ObjectId.isValid(studentId) || !ObjectId.isValid(goalId)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const result = await collection.updateOne(
      { 
        _id: new ObjectId(studentId),
        "goals._id": new ObjectId(goalId)
      },
      { $set: { "goals.$.completed": completed } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ error: 'Failed to update goal' });
  } finally {
    await client.close();
  }
});

// Delete a goal
app.delete('/students/:id/goals/:goalId', async (req, res) => {
  const { id: studentId, goalId } = req.params;

  if (!ObjectId.isValid(studentId) || !ObjectId.isValid(goalId)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $pull: { goals: { _id: new ObjectId(goalId) } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({ error: 'Failed to delete goal' });
  } finally {
    await client.close();
  }
});




app.post('/students/:id/tests', async (req, res) => {
  const studentId = req.params.id;
  const { subject, score, totalQuestions } = req.body;

  try {
    // Validate required fields
    if (!subject || score === undefined || totalQuestions === undefined) {
      return res.status(400).json({ error: "Subject, score, and totalQuestions are required" });
    }

    // Validate the student ID
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    const database = db; // Use the existing database connection
    const collection = database.collection("students");

    const newTest = {
      _id: new ObjectId(),
      subject,
      score: Number(score), // Ensure score is a number
      totalQuestions: Number(totalQuestions), // Ensure totalQuestions is a number
      date: new Date(),
      performanceMetrics: calculatePerformanceMetrics(Number(score), Number(totalQuestions))
    };

    console.log("Saving test:", newTest);

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { tests: newTest } }
    );

    console.log("Update result:", result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(201).json(newTest);
  } catch (error) {
    console.error("Error saving test:", error);
    res.status(500).json({ error: 'Failed to save test results', details: error.message });
  }
});

// Get tests for a student
app.get('/students/:id/tests', async (req, res) => {
  const studentId = req.params.id;

  try {
    // Validate the student ID
    if (!ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    const database = db; // Use the existing database connection
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { projection: { tests: 1 } }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student.tests || []);
  } catch (error) {
    console.error("Error retrieving tests:", error);
    res.status(500).json({ error: 'Failed to retrieve test results' });
  }
});

// Get progress dashboard data
app.get('/students/:id/progress', async (req, res) => {
  const studentId = req.params.id;

  try {
    // Switch to using the existing database connection
    const database = db;
    const collection = database.collection("students");

    const student = await collection.findOne(
      { _id: new ObjectId(studentId) },
      { 
        projection: {
          chatHistory: 1,
          goals: 1,
          tests: 1,
          studySessions: 1
        }
      }
    );

    if (!student) return res.status(404).json({ error: "Student not found" });

    // Calculate metrics with the improved function
    const progressData = {
      subjectsStudied: calculateSubjectsStudiedLast24Hours(student.chatHistory),
      totalStudyTime: calculateTotalStudyTime(student.chatHistory),
      completedTests: student.tests?.length || 0,
      activeGoals: student.goals?.filter(g => !g.completed).length || 0,
      recentActivities: getRecentActivities(student),
      subjectProficiency: calculateSubjectProficiency(student.tests)
    };

    res.json(progressData);
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

app.post('/students/:id/study-session', async (req, res) => {
  const studentId = req.params.id;
  const { subject, startTime, endTime } = req.body;
  
  if (!subject || !startTime || !endTime) {
    return res.status(400).json({ error: "Subject, startTime, and endTime are required" });
  }
  
  try {
    const database = db;
    const collection = database.collection("students");
    
    const session = {
      subject,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: (new Date(endTime) - new Date(startTime)) / (60 * 1000) // duration in minutes
    };
    
    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { studySessions: session } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    res.status(201).json(session);
  } catch (error) {
    console.error("Error logging study session:", error);
    res.status(500).json({ error: 'Failed to log study session' });
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

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
    return total + Math.max(durationMinutes, 1);
  }, 0);
  
  return Math.round(totalMinutes);
}


function getRecentActivities(student) {
  const activities = [];
  
  // Add chat sessions
  Object.entries(student.chatHistory || {}).forEach(([subject, chats]) => {
    chats.forEach(chat => {
      activities.push({
        type: 'chat',
        subject,
        date: chat.timestamp,
        content: chat.message.substring(0, 50)
      });
    });
  });

  // Add tests
  student.tests?.forEach(test => {
    activities.push({
      type: 'test',
      subject: test.subject,
      date: test.date,
      content: `Scored ${test.score}/${test.totalQuestions}`
    });
  });

  // Add goal completions
  student.goals?.forEach(goal => {
    if (goal.completed) {
      activities.push({
        type: 'goal',
        subject: goal.category === 'Subject-Specific' ? goal.subject : 'General',
        date: goal.completedAt,
        content: `Completed goal: ${goal.text}`
      });
    }
  });

  return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
}

function calculateSubjectProficiency(tests = []) {
  const subjectMap = {};
  
  tests.forEach(test => {
    if (!subjectMap[test.subject]) {
      subjectMap[test.subject] = {
        totalScore: 0,
        totalTests: 0
      };
    }
    subjectMap[test.subject].totalScore += test.score;
    subjectMap[test.subject].totalTests++;
  });

  return Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    averageScore: Math.round((data.totalScore / data.totalTests) * 10) / 10
  }));
}

function calculatePerformanceMetrics(score, totalQuestions) {
  const percentage = score;
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
    const hasRecentActivity = chats.some(chat => {
      const chatTime = new Date(chat.timestamp);
      return chatTime >= last24Hours;
    });
    
    if (hasRecentActivity) {
      recentSubjects.add(subject);
    }
  });
  
  return recentSubjects.size;
}


app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  try {
    db = await connectToDatabase(); 
    console.log("Connected to MongoDB successfully"); 
  } catch (dbError) {
    console.error("Failed to connect to MongoDB on startup:", dbError); 
    process.exit(1); 
  }
});
