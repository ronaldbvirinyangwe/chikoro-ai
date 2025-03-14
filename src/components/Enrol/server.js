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

// Utility function to connect with retry logic
const connectToDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = 2000; // 2 seconds delay between retries

  while (attempts < maxAttempts) {
    try {
      await client.connect();
      return client.db("studentDB");
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
  const { name, age, academicLevel, grade } = req.body;

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    // Initialize chatHistory as an empty object to store dynamic subjects
    const newStudent = { 
      name, 
      age, 
      academicLevel, 
      grade, 
      chatHistory: {} // Empty object to store subject-specific chat histories
    };

    const result = await collection.insertOne(newStudent);
    res.status(201).json({
      _id: result.insertedId,
      ...newStudent
    });
    
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      res.status(409).json({
        error: 'Student name exists. Add a number or middle initial (e.g., "John2" or "John Smith")'
      });
    } else {
      console.error("Error saving student:", error);
      res.status(500).json({ error: 'Failed to save student' });
    }
  } finally {
    await client.close();
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
  try {
    const database = await connectToDatabase();
    const collection = database.collection("students");
    
    const student = await collection.findOne({ 
      _id: new ObjectId(req.params.id) // PROPER OBJECTID CONVERSION
    });

    if (student) {
      res.json(student);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
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



// Save test results
app.post('/students/:id/tests', async (req, res) => {
  const studentId = req.params.id;
  const { subject, score, totalQuestions } = req.body;

  try {
    await client.connect();
    const database = client.db("studentDB");
    const collection = database.collection("students");

    const newTest = {
      _id: new ObjectId(),
      subject,
      score,
      totalQuestions,
      date: new Date(),
      performanceMetrics: calculatePerformanceMetrics(score, totalQuestions)
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(studentId) },
      { $push: { tests: newTest } }
    );

    res.status(201).json(newTest);
  } catch (error) {
    console.error("Error saving test:", error);
    res.status(500).json({ error: 'Failed to save test results' });
  } finally {
    await client.close();
  }
});

// Get progress dashboard data
app.get('/students/:id/progress', async (req, res) => {
  const studentId = req.params.id;

  try {
    await client.connect();
    const database = client.db("studentDB");
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

    // Calculate metrics
    const progressData = {
      subjectsStudied: Object.keys(student.chatHistory || {}).length,
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
  } finally {
    await client.close();
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

function calculateTotalStudyTime(chatHistory) {
  if (!chatHistory) return 0;
  return Object.values(chatHistory).reduce((total, sessions) => {
    return total + sessions.length * 10; // 10 minutes per session
  }, 0);
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



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

