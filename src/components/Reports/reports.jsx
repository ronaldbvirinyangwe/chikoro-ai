import React, { useState, useEffect,useContext } from "react";
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
import Greeting from "../Enrol/Greeting";
import { useTheme } from "../../context/ThemeContext";
import { useReportsData } from './useReportsData'; 
import Sidebar from '../Sidebar/sidebar'; 
import { Context } from '../../context/Context';
import "./reports.css";

const Reports = () => {
  // ✅ All complex data fetching and state is now managed by the custom hook.
  const { loading, error, gamificationData, completedTests, progressMetrics, leaderboard } = useReportsData();

  // State specific to this component's UI actions
  const [generatingReport, setGeneratingReport] = useState(false);
  const [comprehensiveReport, setComprehensiveReport] = useState(null);
  const [reportError, setReportError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
    const { selectedSubject, setSelectedSubject } = useContext(Context);

  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const API_BASE_URL = '/api/v1';

  const toggleMenu = () => setMenuVisible((prev) => !prev);
  const closeMenu = () => setMenuVisible(false);

  // Function to generate a detailed report via API
  const generateReport = async () => {
    setGeneratingReport(true);
    setComprehensiveReport(null);
    setReportError('');

    const studentId = localStorage.getItem("profileId");
    const token = localStorage.getItem("accessToken");

    if (!studentId || !token) {
        setReportError("Authentication required to generate a report.");
        setGeneratingReport(false);
        return;
    }

    try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.post(`${API_BASE_URL}/generate-report`,
            null,
            { headers }      // Axios config with headers
        );

        if (response.data.report) {
            setComprehensiveReport(response.data.report);
        } else {
            setReportError("Received an invalid report structure from the server.");
        }
    } catch (err) {
        console.error("Error generating report:", err);
        setReportError("An error occurred while generating the report.");
    } finally {
        setGeneratingReport(false);
    }
  };

  const submissionMessages = [
    "Submitting your data...",
    "Finalizing process...",
    "Almost there...",
];
  
    const reportGenerationMessages = [
        "Analyzing your test results...",
        "Compiling performance metrics...",
        "Generating insights and recommendations...",
        "Preparing your comprehensive report...",
    ];
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

      const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
    );

     useEffect(() => {
        const checkSidebarState = () => {
            const collapsedState = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
            setIsSidebarCollapsed(collapsedState);
        };
        const interval = setInterval(checkSidebarState, 500);
        return () => clearInterval(interval);
    }, []);

   useEffect(() => {
        if (generatingReport) {
            const intervalId = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % reportGenerationMessages.length);
            }, 1500); // Change message every 1.5 seconds
            return () => clearInterval(intervalId);
        }
    }, [generatingReport, reportGenerationMessages.length]);

  // --- Data Processing and Charting Functions ---
  // These functions now use the state provided by the useReportsData hook.

  const getSubjectActivityData = () => {
    if (!progressMetrics?.chatHistory) return [];
    const subjectCounts = {};
    let totalMessages = 0;

    Object.values(progressMetrics.chatHistory).flat().forEach(msg => {
        // This assumes the chat history object structure is { subject: [messages] }
        // A direct array of messages would need a different approach.
        // For now, let's assume a placeholder logic if the structure is different.
        // This part might need adjustment based on the actual progressMetrics.chatHistory structure.
    });
    // Placeholder - replace with actual processing logic if needed
    return []; 
  };

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

  const getTestPerformanceData = () => {
    const subjectResults = calculateTestPerformance();
    return Object.entries(subjectResults).map(([subject, averageScore]) => ({
      name: subject,
      value: averageScore,
    }));
  };

  const getPieChartData = () => {
    if (completedTests && completedTests.length > 0) {
      return getTestPerformanceData();
    }
    // Fallback or other data source can be added here
    return [];
  };

  const pieChartData = getPieChartData();
  const pieChartTitle = completedTests.length > 0 ? "Test Performance by Subject" : "Subject Overview";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D",
  "#FF4560", "#00E396", "#775DD0", "#FEB019", "#26A69A", "#D10CE8",
  "#F9A3A4", "#546E7A", "#FD6A6A", "#A300D6", "#3F51B5", "#4CAF50",
  "#E91E63", "#9C27B0", "#673AB7", "#FF9800", "#3D3D3D", "#00D2D3",
  "#6A0572", "#F64B29", "#1E90FF", "#32CD32", "#FF69B4", "#B22222"
];

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    const textColor = darkMode ? "#fff" : "#333";
    return (
      <text x={x} y={y} fill={textColor} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize="12">
        {`${name}: ${value}%`}
      </text>
    );
  };

  const getProgressTimelineData = () => {
    if (!completedTests || completedTests.length === 0) return [];
    const sortedTests = [...completedTests].sort((a, b) => new Date(a.date) - new Date(b.date));
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
  const timelineSubjects = Array.from(new Set(timelineData.flatMap(point => Object.keys(point).filter(key => key !== 'date'))));

  // --- RENDER FUNCTIONS ---
    const renderBadges = () => {
    // ✅ FIX: Use optional chaining (?.) to safely check for gamificationData 
    // and its badges property. This prevents the error if gamificationData is null.
    if (!gamificationData?.badges || gamificationData.badges.length === 0) {
      return <p className="no-data-message">No badges earned yet.</p>;
    }
    return (
      <div className="badges-list">
        {gamificationData.badges.map((badge) => (
          <div key={badge.id} className="badge-item" title={badge.description}>
            <img
              src={badge.icon || "/placeholder-badge-icon.png"}
              alt={badge.name}
              className="badge-icon"
            />
            <span className="badge-name">{badge.name}</span>
          </div>
        ))}
      </div>
    );
  };
 
 const renderComprehensiveReport = () => {
    // This guard clause is still correct.
    if (!comprehensiveReport) return null;

    // We can still alias it for easier access.
    const report = comprehensiveReport;

    // This new JSX structure matches the data your AI backend is actually creating.
    return (
      <div className="generated-report-structured">
        <h3>
          Comprehensive AI Report for {report.studentName}
        </h3>
        <p className="report-date">
          <em>Report Generated on: {new Date(report.reportDate).toLocaleDateString()}</em>
        </p>

        <div className="report-section">
          <h4>Overall Summary</h4>
          <p>{report.overallSummary}</p>
        </div>

        <div className="report-section">
          <h4>✅ Strengths</h4>
          <ul className="report-list">
            {report.strengths && report.strengths.map((strength, index) => (
              <li key={`strength-${index}`}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="report-section">
          <h4>🔍 Areas for Improvement</h4>
          <ul className="report-list">
            {report.areasForImprovement && report.areasForImprovement.map((area, index) => (
              <li key={`improvement-${index}`}>{area}</li>
            ))}
          </ul>
        </div>

        <div className="report-section">
          <h4>🚀 Recommended Next Steps</h4>
          <ul className="report-list">
            {report.recommendedNextSteps && report.recommendedNextSteps.map((step, index) => (
              <li key={`step-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
    );
};
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

  if (isSubmitting) {
        return (
            <div className={`container ${darkMode ? 'dark' : ''}`}>
                <div className="centered-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">{submissionMessages[currentMessageIndex]}</p>
                </div>
            </div>
        );
    }

  if (error) {
    return <div className="error-container"><h2>{error}</h2><p>Please try refreshing the page or log in again.</p></div>;
  }

  return (
    <div className={`reports-home ${darkMode ? "dark" : ""}`}>
         <Sidebar />

         <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="reports-container">
                {gamificationData && (
                    <div className="gamification-metrics">
                        <h3>Achievements</h3>
                        <div className="metric-cards">
                            <div className="metric-card"><h4>✨ Total Points</h4><p>{gamificationData.totalPoints}</p></div>
                            <div className="metric-card"><h4>🏆 Level</h4><p>{gamificationData.level}</p></div>
                            <div className="metric-card"><h4>🔥 Current Streak</h4><p>{gamificationData.currentStreak} days</p></div>
                            <div className="metric-card"><h4>📈 Longest Streak</h4><p>{gamificationData.longestStreak} days</p></div>
                        </div>
                    </div>
                )}

                {progressMetrics && (
                    <div className="progress-metrics">
                        <h3>Learning Overview</h3>
                        <div className="metric-cards">
                            <div className="metric-card"><h4>📚 Subjects Studied (24 Hrs)</h4><p>{progressMetrics.subjectsStudied}</p></div>
                            <div className="metric-card"><h4>⏳ Total Study Time</h4><p>{Math.round((progressMetrics.totalStudyTime || 0) / 60)} hours</p></div>
                            <div className="metric-card"><h4>✅ Tests Completed</h4><p>{progressMetrics.completedTests}</p></div>
                        </div>
                    </div>
                )}

                <div className="badges-section">
                    <h4>🏅 Earned Badges</h4>
                    {renderBadges()}
                </div>
                
                {renderLeaderboard()}

                {timelineData.length > 0 && (
                    <div className="progress-timeline-section">
                        <h3>Progress Timeline (Test Scores)</h3>
                        <div className="timeline-chart-container" style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 100]} label={{ value: "Score (%)", angle: -90, position: "insideLeft" }} />
                                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                                    <Legend />
                                    {timelineSubjects.map((subject, index) => (
                                        <Line key={subject} type="monotone" dataKey={subject} stroke={COLORS[index % COLORS.length]} activeDot={{ r: 8 }} name={subject} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {pieChartData.length > 0 ? (
                    <div className="progress-chart-section">
                        <div className="pie-chart-container" style={{ width: "100%", height: 350 }}>
                            <h3 className="pie-header">{pieChartTitle}</h3>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name, props) => {
                                        return completedTests.length > 0
                                            ? [`${value}% average score`, name]
                                            : [`${props.payload.percent}% of activity`, name];
                                    }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    !loading && <p className="no-data-message"></p>
                )}

                {completedTests.length > 0 ? (
                    <div className="test-history-section">
                        <h3>Test Results</h3>
                        <table className="student-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Score</th>
                                    <th>Total Questions</th>
                                    <th>Proficiency Level</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedTests.map((test, index) => (
                                    <tr key={index}>
                                        <td>{test.subject}</td>
                                        <td>{test.score}%</td>
                                        <td>{test.totalQuestions}</td>
                                        <td>{test.proficiencyLevel|| "N/A"}</td>
                                        <td>{new Date(test.date).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    !loading && <p className="no-data-message"></p>
                )}

                <button className="generate-report-button" onClick={generateReport} disabled={generatingReport || loading}>
                    {generatingReport ? "Generating Report..." : "Generate Comprehensive Report"}
                </button>

                {reportError && <p className="error">{reportError}</p>}
                
                {comprehensiveReport && (
                    <div className="generated-report">
                        {renderComprehensiveReport()}
                    </div>
                )}
            </div>
        </main>
    </div>
  );
};

export default Reports;