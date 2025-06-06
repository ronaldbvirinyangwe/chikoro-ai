import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import Greeting from "../Enrol/Greeting"; // Adjust path as needed
import "./reports.css"; // Ensure this path is correct
import { useTheme } from "../../context/ThemeContext"; // Adjust path as needed

// Assuming you have a default badge icon in your assets
// import { assets } from '../../assets/assets'; // Uncomment and adjust path if needed

const Reports = () => {
  // Removed studentId prop, fetching from localStorage
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gamificationData, setGamificationData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    level: 1,
    badges: [],
  });
  const [completedTests, setCompletedTests] = useState([]);
  const [subjectMessages, setSubjectMessages] = useState([]); // Still useful for activity count for pie chart
  const [comprehensiveReport, setComprehensiveReport] = useState(null); // To store the structured report
  const [generatingReport, setGeneratingReport] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]); // New state for leaderboard data
  const [progressMetrics, setProgressMetrics] = useState(null); // To store data from /students/:id/progress

  const { darkMode } = useTheme(); // Assuming useTheme provides darkMode state

  // Replace with your actual backend API URL
  const BASE_API_URL = "https://atqtuew6syxese-4173.proxy.runpod.net"; // Make sure this is correct

  const navigate = useNavigate();

  const toggleMenu = () => setMenuVisible((prev) => !prev);
  const closeMenu = () => setMenuVisible(false); // Function to close menu, useful for nav links

  // --- Data Fetching Function ---
  const fetchReportsData = async () => {
    setLoading(true);
    setError(""); // Clear previous errors

    // Get studentId and token from localStorage
    const studentId = localStorage.getItem("studentId");

    // --- CORRECTED: Retrieve the access token using the correct key "accessToken" ---
    const token = localStorage.getItem("accessToken"); // Assuming the access token is stored under the key "accessToken"
    // --- Removed old log for "token" ---
    // --- Added log for the refresh token (for comparison if needed) ---
    const refreshToken = localStorage.getItem("refreshToken");
    console.log("Frontend: Retrieved refreshToken (for comparison):", refreshToken ? 'RefreshToken Found' : 'No RefreshToken Found');
    // --- End Correction and Logging ---


    // --- Added Logging for studentId and token from localStorage ---
    console.log("Frontend: Retrieving studentId from localStorage:", studentId);
    console.log("Frontend: Retrieving access token from localStorage (using key 'accessToken'):", token ? 'Access Token Found' : 'No Access Token Found');
    // --- End Logging ---


    if (!studentId) {
      console.log("Frontend: No student ID found in localStorage");
      setError("Please login to view reports");
      setLoading(false);
      // Optionally redirect to login if no studentId
       navigate("/login");
      return;
    }

    if (!token) {
        console.warn("Frontend: No access token found in localStorage. Cannot fetch protected data.");
        setError("Authentication token missing. Please log in again.");
        setLoading(false);
        // Clear potentially stale data and redirect to login
        localStorage.removeItem("studentId");
        localStorage.removeItem("accessToken"); // Clear access token
        localStorage.removeItem("refreshToken"); // Clear refresh token too
        //  navigate("/login"); // Uncomment to auto-redirect
        return;
    }

    // Create headers object with Authorization token
    // --- This is where the access token is added to the request headers ---
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    // --- End Adding Token to Headers ---

    try {
      // Fetch gamification data
      console.log("Frontend: Fetching gamification data...");
      const gamificationResponse = await axios.get(
        `${BASE_API_URL}/students/${studentId}/gamification`,
        { headers } // <-- Pass the headers here
      );
      if (gamificationResponse.data) {
        setGamificationData(gamificationResponse.data);
        console.log("Frontend: Successfully fetched gamification data");
      } else {
        setGamificationData({
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          level: 1,
          badges: [],
        });
      }

      // Fetch tests data
      console.log("Frontend: Fetching tests data...");
      const testsResponse = await axios.get(
        `${BASE_API_URL}/students/${studentId}/tests`,
        { headers } // <-- Pass the headers here
      );
      setCompletedTests(
        Array.isArray(testsResponse.data)
          ? testsResponse.data.sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            )
          : []
      );
      console.log("Frontend: Successfully fetched tests data");

      // Fetch progress metrics (includes total study time, subjects studied, recent activities)
      console.log("Frontend: Fetching progress metrics...");
      const progressResponse = await axios.get(
        `${BASE_API_URL}/students/${studentId}/progress`,
        { headers } // <-- Pass the headers here
      );
      if (progressResponse.data) {
        setProgressMetrics(progressResponse.data);
        // Use chat history from progress data for activity count if needed, or rely on recentActivities
        const messagesBySubject = [];
        // Check if chatHistory exists and is an object before iterating
        if (
          progressResponse.data.chatHistory &&
          typeof progressResponse.data.chatHistory === "object"
        ) {
          Object.entries(progressResponse.data.chatHistory).forEach(
            ([subject, chats]) => {
              if (Array.isArray(chats)) {
                chats.forEach((chat) => {
                  if (chat.message && chat.timestamp) {
                    messagesBySubject.push({
                      subject: subject,
                      message: chat.message,
                      timestamp: chat.timestamp,
                    });
                  }
                });
              }
            }
          );
        }
        setSubjectMessages(
          messagesBySubject.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          )
        );

        console.log("Frontend: Successfully fetched progress metrics");
      } else {
        setProgressMetrics(null);
        setSubjectMessages([]); // Clear messages if progress data is empty
      }

      // Fetch leaderboard data
      console.log("Frontend: Fetching leaderboard data...");
      // Corrected URL to use BASE_API_URL
      // Assuming leaderboard is public and doesn't require auth headers
      const leaderboardResponse = await axios.get(`${BASE_API_URL}/leaderboard`);
      // If leaderboard IS protected and needs the token, uncomment the line below instead:
      // const leaderboardResponse = await axios.get(`${BASE_API_URL}/leaderboard`, { headers });

      if (leaderboardResponse.data) {
        setLeaderboard(leaderboardResponse.data);
        console.log("Frontend: Successfully fetched leaderboard data");
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error("Frontend: Failed to fetch reports data:", err);
      // Check if the error response has a status
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
           setError("Authentication failed. Please log in again.");
           // Clear potentially stale token/ID and redirect to login
           localStorage.removeItem("accessToken"); // Clear access token
           localStorage.removeItem("refreshToken"); // Clear refresh token too
           localStorage.removeItem("studentId");
            navigate("/login"); // Uncomment to auto-redirect
      } else {
          setError("Failed to load reports data");
      }

      // Set empty states on error
      setGamificationData({
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        level: 1,
        badges: [],
      });
      setCompletedTests([]);
      setSubjectMessages([]);
      setProgressMetrics(null);
      setLeaderboard([]);

    } finally { // Use finally to ensure loading is set to false regardless of success or failure
      setLoading(false);
    }
  };
  // --- Data Fetching Effects ---

  // Initial data fetch on component mount and refetch on visibility change
  useEffect(() => {
    fetchReportsData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Document is visible, refetching reports data...");
        fetchReportsData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Function to generate a detailed report via API (now fetches structured data)
  const generateReport = async () => {
    setGeneratingReport(true);
    setComprehensiveReport(null); // Clear previous report
    setError(""); // Clear errors
    try {
      const studentId = localStorage.getItem("studentId");
      // --- FIX: Retrieve the token ---
      const token = localStorage.getItem("accessToken");
  
      // --- FIX: Check for token before proceeding ---
      if (!studentId || !token) {
           setError("Authentication token missing or student ID not found. Please log in.");
           setGeneratingReport(false);
           // Optionally redirect if token is missing
           // navigate("/login");
           return;
      }
  
      // --- FIX: Create headers object ---
      const headers = {
         Authorization: `Bearer ${token}`,
      };
  
      // Call the enhanced report generation endpoint
      const response = await axios.post(`${BASE_API_URL}/generate-report`, {
        studentId, // body payload
      }, { headers }); // <-- FIX: Pass the headers here!
  
      if (response.data.report) {
        setComprehensiveReport(response.data.report); // Store the structured report data
        console.log("Comprehensive report generated:", response.data.report);
      } else {
        setError("Failed to generate report.");
      }
    } catch (error) {
       console.error("Error generating report:", error); // More specific log
        // Check for authentication errors explicitly
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
             setError("Authentication failed. Please log in again.");
             // Optionally clear tokens and redirect
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("studentId");
             // navigate("/login");
        } else {
            setError("Error generating report.");
        }
    } finally {
      setGeneratingReport(false);
    }
  };

  // --- Data Processing Functions ---

  // Calculate subject activity distribution for pie chart
  const getSubjectActivityData = () => {
    const subjectCounts = {};
    // Use subjectMessages state which is populated from progressMetrics.chatHistory
    subjectMessages.forEach((msg) => {
      if (msg.subject) {
        if (!subjectCounts[msg.subject]) {
          subjectCounts[msg.subject] = 0;
        }
        subjectCounts[msg.subject]++;
      }
    });
    const totalMessages = subjectMessages.length;
    return Object.entries(subjectCounts).map(([subject, count]) => ({
      name: subject,
      value: count,
      percent:
        totalMessages > 0 ? Math.round((count / totalMessages) * 100) : 0,
    }));
  };

  // Calculate test performance by subject (average scores)
  const calculateTestPerformance = () => {
    const subjectPerformance = {};
    completedTests.forEach((test) => {
      if (test.subject && test.score !== undefined) {
        if (!subjectPerformance[test.subject]) {
          subjectPerformance[test.subject] = { totalScore: 0, count: 0 };
        }
        subjectPerformance[test.subject].totalScore += test.score;
        subjectPerformance[test.subject].count++;
      }
    });
    const averagePerformance = {};
    Object.entries(subjectPerformance).forEach(([subject, data]) => {
      if (data.count > 0) {
        averagePerformance[subject] = Math.round(data.totalScore / data.count);
      }
    });
    return averagePerformance;
  };

  // Calculate test performance data for pie chart
  const getTestPerformanceData = () => {
    const subjectResults = calculateTestPerformance();
    return Object.entries(subjectResults).map(([subject, averageScore]) => ({
      name: subject,
      value: averageScore,
    }));
  };

  // Define chart colors (reusing existing COLORS array)
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FF6E67",
    "#C06C84",
    "#6C5B7B",
    "#355C7D",
  ];

  // Decide which data to use for the main pie chart
  const getPieChartData = () => {
    // If we have completed tests, use test performance data
    if (completedTests.length > 0) {
      return getTestPerformanceData();
    }
    // Otherwise, use subject activity distribution data
    if (subjectMessages.length > 0) {
      return getSubjectActivityData();
    }
    return [];
  };

  const pieChartData = getPieChartData();

  // Determine what the pie chart represents based on the data used
  const getPieChartTitle = () => {
    if (completedTests.length > 0) {
      return "Test Performance by Subject";
    }
    if (subjectMessages.length > 0) {
      return "Learning Activity Distribution";
    }
    return "Subject Overview";
  };

  // Custom label for the pie chart segments
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    const textColor = darkMode ? "#fff" : "#333";
    return (
      <text
        x={x}
        y={y}
        fill={textColor}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
      >
        {`${name}: ${
          completedTests.length > 0
            ? value + "%"
            : Math.round(percent * 100) + "%"
        }`}
      </text>
    );
  };

  // Generate progress timeline data (running average test scores over time)
  const getProgressTimelineData = () => {
    if (completedTests.length === 0) return [];
    const sortedTests = [...completedTests].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const subjectScores = {};
    const timelineData = [];

    sortedTests.forEach((test) => {
      const date = new Date(test.date);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;

      if (!subjectScores[test.subject]) {
        subjectScores[test.subject] = { totalScore: 0, count: 0 };
      }
      subjectScores[test.subject].totalScore += test.score;
      subjectScores[test.subject].count += 1;

      const dataPoint = { date: formattedDate };
      Object.entries(subjectScores).forEach(([subject, data]) => {
        if (data.count > 0) {
          dataPoint[subject] = Math.round(data.totalScore / data.count);
        }
      });
      timelineData.push(dataPoint);
    });
    return timelineData;
  };

  const timelineData = getProgressTimelineData();

  // Get all unique subjects that appear in the timeline data
  const getTimelineSubjects = () => {
    const subjects = new Set();
    timelineData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== "date") {
          subjects.add(key);
        }
      });
    });
    return Array.from(subjects);
  };

  const timelineSubjects = getTimelineSubjects();

  // --- Render Functions ---

  // Render the list of earned badges
  const renderBadges = () => {
    if (!gamificationData.badges || gamificationData.badges.length === 0) {
      return <p className="no-data-message">No badges earned yet.</p>;
    }
    return (
      <div className="badges-list">
        {gamificationData.badges.map((badge) => (
          <div key={badge.id} className="badge-item" title={badge.description}>
            {" "}
            {/* Add title for description */}
            {/* Use badge.icon if available, otherwise a default or placeholder */}
            {/* Assuming badge.icon is a URL or path */}
            <img
              src={badge.icon || "/placeholder-badge-icon.png"}
              alt={badge.name}
              className="badge-icon"
            />
            <span className="badge-name">{badge.name}</span>
            {/* Optional: Display earned date */}
            {badge.earnedDate && <span className="badge-date">{new Date(badge.earnedDate).toLocaleDateString()}</span>} 
          </div>
        ))}
      </div>
    );
  };

  // Render the comprehensive report data
  const renderComprehensiveReport = () => {
    if (!comprehensiveReport) return null;

    const report = comprehensiveReport;

    return (
      <div className="generated-report-structured">
        <h3>
          Comprehensive Report for {report.studentName} (
          {new Date(report.reportDate).toLocaleDateString()})
        </h3>

        {/* Learning Overview */}
        <div className="report-section">
          <h4>Learning Overview</h4>
          <p>
            <strong>Subjects Studied (Last 24 Hrs):</strong>{" "}
            {report.learningOverview.subjectsStudied}
          </p>
          {/* Use totalStudyTimeMinutes from the report data, convert to hours for display */}
          <p>
            <strong>Total Study Time:</strong>{" "}
            {Math.round(
              (report.learningOverview.totalStudyTimeMinutes || 0) / 60
            )}{" "}
            hours
          </p>
          <p>
            <strong>Tests Completed:</strong>{" "}
            {report.learningOverview.completedTestsCount}
          </p>
          <h5>Recent Activities:</h5>
          <ul>
            {report.learningOverview.recentActivities.map((activity, index) => (
              <li key={index}>
                <strong>{new Date(activity.date).toLocaleString()}:</strong> [
                {activity.type.toUpperCase()}] {activity.subject} -{" "}
                {activity.content}
              </li>
            ))}
          </ul>
        </div>

        {/* Test Performance */}
        <div className="report-section">
          <h4>Test Performance</h4>
          <p>
            <strong>Overall Proficiency:</strong>{" "}
            {report.testPerformance.overallProficiency}
          </p>
          <p>
            <strong>Weekly Performance Change:</strong>{" "}
            {report.testPerformance.weeklyPerformanceChange >= 0 ? "+" : ""}
            {report.testPerformance.weeklyPerformanceChange}%
          </p>
          <h5>Subject Proficiency:</h5>
          <ul>
            {report.testPerformance.subjectProficiency.map((subj, index) => (
              <li key={index}>
                <strong>{subj.subject}:</strong> {subj.averageScore}% Average
                Score
              </li>
            ))}
          </ul>
          {/* Optionally display full test history here again or link to Test History section */}
        </div>

        {/* Goal Progress */}
        <div className="report-section">
          <h4>Goal Progress</h4>
          <p>
            <strong>Total Goals:</strong> {report.goalProgress.totalGoals}
          </p>
          <p>
            <strong>Completed Goals:</strong>{" "}
            {report.goalProgress.completedGoals}
          </p>
          <p>
            <strong>Completion Rate:</strong>{" "}
            {report.goalProgress.goalCompletionPercentage}%
          </p>
          {/* Optionally display goal list */}
        </div>

        {/* Gamification Summary */}
        <div className="report-section">
          <h4>Gamification Summary</h4>
          <p>
            <strong>Total Points:</strong>{" "}
            {report.gamificationSummary.totalPoints}
          </p>
          <p>
            <strong>Level:</strong> {report.gamificationSummary.level}
          </p>
          <p>
            <strong>Current Streak:</strong>{" "}
            {report.gamificationSummary.currentStreak} days
          </p>
          <p>
            <strong>Longest Streak:</strong>{" "}
            {report.gamificationSummary.longestStreak} days
          </p>
          <p>
            <strong>Badges Earned:</strong>{" "}
            {report.gamificationSummary.earnedBadgesCount} /{" "}
            {report.gamificationSummary.totalPossibleBadges} (
            {report.gamificationSummary.badgeCompletionPercentage}%)
          </p>
          {/* Badges list is already rendered separately, no need to duplicate */}
        </div>

        {/* Add other sections from the reportData object */}
      </div>
    );
  };

  // Render the leaderboard
  const renderLeaderboard = () => {
    if (!leaderboard || leaderboard.length === 0) {
      return <p className="no-data-message">Leaderboard data not available.</p>;
    }
    return (
      <div className="leaderboard-section">
        <h3>🏆 Leaderboard</h3>
        <ol className="leaderboard-list">
          {leaderboard.map((student, index) => (
            <li key={student._id} className="leaderboard-item">
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">{student.name}</span>
              <span className="leaderboard-points">
                {student.gamification?.totalPoints || 0} points
              </span>
              <span className="leaderboard-level">
                Level {student.gamification?.level || 1}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div className={`home ${darkMode ? "dark" : ""}`}>
      {" "}
      {/* Apply dark mode class */}
      {/* Header/Navigation */}
      <header className="l-header">
        {" "}
        {/* Ensure this class exists and is styled */}
        <nav className="nav bd-grid">
          {" "}
          {/* Ensure this class exists and is styled */}
          <Link to="/subjectselect" className="nav__logo">
            {" "}
            {/* Ensure this class exists and is styled */}
            <Greeting /> {/* Assuming Greeting component exists */}
          </Link>
          {/* Navigation Menu */}
          <div
            className={`nav__menu ${menuVisible ? "show" : ""}`}
            id="nav-menu"
          >
            <ul className="nav__list">
              {/* Navigation items - close menu on click */}
              {/* <li className="nav__item">
                <a
                  className="nav__link"
                  onClick={() => {
                    navigate("/discover");
                    closeMenu();
                  }}
                >
                  Discover
                </a>
              </li> */}
              <li className="nav__item">
                <a
                  className="nav__link"
                  onClick={() => {
                    navigate("/test");
                    closeMenu();
                  }}
                >
                  Test
                </a>
              </li>
              <li className="nav__item">
                <a
                  className="nav__link"
                  onClick={() => {
                    navigate("/papers");
                    closeMenu();
                  }}
                >
                  Exam Papers
                </a>
              </li>
              <li className="nav__item">
                <a
                  className="nav__link"
                  onClick={() => {
                    navigate("/reports");
                    closeMenu();
                  }}
                >
                  Reports
                </a>
              </li>
            </ul>
          </div>
          {/* Boxicons for menu toggle */}
          <link
            href="https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css"
            rel="stylesheet"
          />
          {/* Menu Toggle Icon */}
          <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu}>
            <i className="bx bx-menu"></i>
          </div>
        </nav>
      </header>
      {/* Main Reports Content Container */}
      <div className="reports-container">
        {/* Loading and Error Messages */}
        {loading && <p>Loading student data...</p>}
        {error && <p className="error">{error}</p>}

        {/* --- Gamification Metrics Section --- */}
        {/* Always render, even if values are 0, to show the section structure */}
        <div className="gamification-metrics">
          <h3>Achievements</h3>
          <div className="metric-cards">
            {/* Points/XP Card */}
            <div className="metric-card">
              <h4>✨ Total Points</h4>
              <p>{gamificationData.totalPoints}</p>
            </div>
            {/* Level Card */}
            <div className="metric-card">
              <h4>🏆 Level</h4>
              <p>{gamificationData.level}</p>
            </div>
            {/* Current Streak Card */}
            <div className="metric-card">
              <h4>🔥 Current Streak</h4>
              <p>{gamificationData.currentStreak} days</p>
            </div>
            {/* Longest Streak Card */}
            <div className="metric-card">
              <h4>📈 Longest Streak</h4>
              <p>{gamificationData.longestStreak} days</p>
            </div>
          </div>
        </div>

        {/* Learning Overview Metrics Section */}
        {/* Only render if progress metrics data is available */}
        {progressMetrics && (
          <div className="progress-metrics">
            <h3>Learning Overview</h3>
            <div className="metric-cards">
              <div className="metric-card">
                <h4>📚 Subjects Studied (24 Hrs)</h4>{" "}
                {/* Clarified time frame */}
                <p>{progressMetrics.subjectsStudied}</p>{" "}
                {/* Use data from progressMetrics */}
              </div>
              <div className="metric-card">
                <h4>⏳ Total Study Time</h4>
                {/* Use totalStudyTime from progressMetrics, convert minutes to hours */}
                <p>
                  {Math.round((progressMetrics.totalStudyTime || 0) / 60)} hours
                </p>
              </div>

              <div className="metric-card">
                <h4>✅ Tests Completed</h4>
                <p>{progressMetrics.completedTests}</p>{" "}
                {/* Use data from progressMetrics */}
              </div>
            </div>
          </div>
        )}

        {/* Goal Tracker Section (Placeholder - assuming this is a separate component or logic) */}
        {/* If Goal Tracker is part of this page, uncomment and place it here */}
        {/*
        <div className="goal-tracker">
            <h3>Set Goals</h3>
            // ... Goal Tracker JSX ...
        </div>
        */}

        {/* Badges Section */}
        {/* Always render, even if no badges, to show the section title */}
        <div className="badges-section">
          <h4>🏅 Earned Badges</h4>
          {renderBadges()}
        </div>

        {/* Leaderboard Section */}
        {renderLeaderboard()}

        {/* Progress Timeline Section (Line Chart) */}
        {/* Only render if there's data for the timeline */}
        {timelineData.length > 0 && (
          <div className="progress-timeline-section">
            <h3>Progress Timeline (Test Scores)</h3> {/* Clarified title */}
            <div
              className="timeline-chart-container"
              style={{ width: "100%", height: 300 }}
            >
              <ResponsiveContainer>
                <LineChart
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* Use date as dataKey for XAxis */}
                  <XAxis dataKey="date" />
                  <YAxis
                    domain={[0, 100]}
                    label={{
                      value: "Score (%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  {/* Tooltip formatter to show Subject and Score */}
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  <Legend />
                  {/* Render a Line for each subject in the timeline data */}
                  {timelineSubjects.map((subject, index) => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={subject} // Data key is the subject name
                      stroke={COLORS[index % COLORS.length]} // Assign color
                      activeDot={{ r: 8 }}
                      name={subject} // Name for the legend and tooltip
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Progress Chart Section (Pie Chart) */}
        {/* Only render if there's data for the pie chart */}
        {pieChartData.length > 0 ? (
          <div className="progress-chart-section">
            <div
              className="pie-chart-container"
              style={{ width: "100%", height: 350 }}
            >
              {" "}
              {/* Adjusted height */}
              <h3 className="pie-header">{getPieChartTitle()}</h3>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8" // Default fill, overridden by Cell colors
                    dataKey="value" // Use 'value' from data (count or average score)
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]} // Assign color from COLORS array
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    // Custom formatter for Tooltip based on chart type
                    formatter={(value, name, props) => {
                      return completedTests.length > 0
                        ? [`${value}% average score`, name] // For test performance
                        : [`${props.payload.percent}% of activity`, name]; // For activity distribution
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          // Show message if no chart data and not loading
          !loading && (
            <p className="no-data-message">
          
            </p>
          )
        )}

        {/* Test History Section */}
        {/* Only render if there are completed tests */}
        {completedTests.length > 0 ? (
          <div className="test-history-section">
            <h3>Test Results</h3>
            <>
              {" "}
              {/* Fragment for multiple elements */}
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Score</th> {/* Assuming score is percentage */}
                    <th>Total Questions</th>
                    <th>Proficiency Level</th>{" "}
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map over completed tests to create table rows */}
                  {completedTests.map((test, index) => (
                    <tr key={index}>
                      <td>{test.subject}</td>
                      <td>{test.score}%</td> {/* Display score as percentage */}
                      <td>{test.totalQuestions}</td>
                      {/* Access proficiency level from nested object if available */}
                      <td>
                        {test.performanceMetrics?.proficiencyLevel || "N/A"}
                      </td>
                      <td>{new Date(test.date).toLocaleString()}</td>{" "}
                      {/* Format date */}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Test Performance Summary (Bars) - Only show if tests exist */}
              <div className="test-summary">
                <h4>Test Performance Summary</h4>
                <div className="performance-bars">
                  {/* Map over calculated average performance per subject */}
                  {Object.entries(calculateTestPerformance()).map(
                    ([subject, average]) => {
                      return (
                        <div key={subject} className="performance-bar">
                          <span className="subject-name">{subject}</span>
                          <div className="bar-container">
                            {/* Bar fill width based on average score */}
                            <div
                              className="bar-fill"
                              style={{ width: `${average}%` }}
                            ></div>
                            {/* Display average score text */}
                            <span className="bar-text">
                              {Math.round(average)}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </>
          </div>
        ) : (
          // Show message if no test results and not loading
          !loading && <p className="no-data-message"></p>
        )}


        {/* Report Generator Button */}
        <button
          className="generate-report-button"
          onClick={generateReport}
          disabled={generatingReport || loading} // Disable while generating or initial loading
        >
          {generatingReport
            ? "Generating Report..."
            : "Generate Comprehensive Report"}{" "}
          {/* Updated text */}
        </button>

        {/* Generated Report Output */}
        {/* Render the structured report if available */}
        {comprehensiveReport && (
          <div className="generated-report">
            {renderComprehensiveReport()}{" "}
            {/* Render the structured report component */}
          </div>
        )}
        {/* Keep the old report display for compatibility if needed, or remove */}
        {/* {report && !comprehensiveReport && (
           <div className="generated-report">
             <h3>Generated Report:</h3>
             <pre>{report}</pre>
           </div>
         )} */}
      </div>{" "}
      {/* End of reports-container */}
    </div> // End of home
  );
};

export default Reports;
