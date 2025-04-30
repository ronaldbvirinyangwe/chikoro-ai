import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import Greeting from '../Enrol/Greeting';
import './reports.css';
import { useTheme } from '../../context/ThemeContext';

const Reports = ({ studentId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjectMessages, setSubjectMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [completedTests, setCompletedTests] = useState([]);
  const { darkMode, setDarkMode } = useTheme();

  const BASE_API_URL = 'https://chikoro-ai.com';
  const navigate = useNavigate();

  const toggleMenu = () => setMenuVisible(prev => !prev);
  const closeMenu = () => setMenuVisible(false);

  const calculateTotalStudyTime = () => {
    const minutesStudied = subjectMessages.length * 10;
    return Math.round(minutesStudied / 60);
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        setError('No authenticated student found.');
        return;
      }

      const response = await axios.post(`${BASE_API_URL}/generate-report`, {
        studentId
      });

      if (response.data.report) {
        setReport(response.data.report);
      } else {
        setError('Failed to generate report.');
      }
    } catch (error) {
      setError('Error generating report.');
      console.error(error);
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      // Get studentId from localStorage
      const studentId = localStorage.getItem('studentId');
      
      if (!studentId) {
        console.log("No student ID found in localStorage");
        setError('Please login to view reports');
        setLoading(false);
        return;
      }
      
      console.log("Fetching data for student ID:", studentId);
      
      try {
        // Fetch student data
        console.log("Fetching student data...");
        const studentResponse = await axios.get(`${BASE_API_URL}/students/${studentId}`);
        const studentData = studentResponse.data;
        
        // Process chat history
        const messagesBySubject = [];
        
        if (studentData.chatHistory) {
          Object.entries(studentData.chatHistory).forEach(([subject, chats]) => {
            chats.forEach(chat => {
              messagesBySubject.push({
                subject: subject,
                message: chat.message,
                timestamp: chat.timestamp
              });
            });
          });
        }
        
        setSubjectMessages(messagesBySubject.reverse());
        setStudents([studentData]);
        console.log("Successfully fetched student data");
        
      } catch (err) {
        console.error('Failed to fetch student data:', err);
        setError('Failed to load student data');
      }
  
      try {
        console.log("Fetching tests data...");
        const testsResponse = await axios.get(`${BASE_API_URL}/students/${studentId}/tests`);
        setCompletedTests(Array.isArray(testsResponse.data) ? testsResponse.data : []);
        console.log("Successfully fetched tests data");
        
      } catch (err) {
        console.error('Failed to fetch tests:', err);
        setCompletedTests([]);
      }
  
      setLoading(false);
    };
  
    fetchAllData();
  }, []);

  // Calculate subject activity distribution for pie chart
  const getSubjectActivityData = () => {
    // Count messages by subject
    const subjectCounts = {};
    subjectMessages.forEach(msg => {
      if (!subjectCounts[msg.subject]) {
        subjectCounts[msg.subject] = 0;
      }
      subjectCounts[msg.subject]++;
    });

    // Convert to array format needed for the pie chart
    return Object.entries(subjectCounts).map(([subject, count]) => ({
      name: subject,
      value: count,
      // Calculate percentage
      percent: Math.round((count / subjectMessages.length) * 100)
    }));
  };

  // Calculate test performance by subject (average scores)
  const calculateTestPerformance = () => {
    const subjectPerformance = {};
    
    completedTests.forEach(test => {
      if (!subjectPerformance[test.subject]) {
        subjectPerformance[test.subject] = {
          total: 0,
          count: 0
        };
      }
      subjectPerformance[test.subject].total += test.score;
      subjectPerformance[test.subject].count++;
    });
    
    return subjectPerformance;
  };

  // Calculate test performance data for pie chart
  const getTestPerformanceData = () => {
    const subjectResults = calculateTestPerformance();
    
    return Object.entries(subjectResults).map(([subject, data]) => ({
      name: subject,
      value: Math.round(data.total / data.count),
      count: data.count
    }));
  };
  
  // Define chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6E67'];
  
  // Decide which data to use based on available information
  const getPieChartData = () => {
    // If we have test data, use that for the pie chart
    if (completedTests.length > 0) {
      return getTestPerformanceData();
    }
    
    // Otherwise, use subject activity distribution
    if (subjectMessages.length > 0) {
      return getSubjectActivityData();
    }
    
    // Default empty data
    return [];
  };
  
  const pieChartData = getPieChartData();
  
  // Determine what the pie chart represents
  const getPieChartTitle = () => {
    if (completedTests.length > 0) {
      return "Test Performance by Subject";
    }
    if (subjectMessages.length > 0) {
      return "Learning Activity Distribution";
    }
    return "Subject Performance";
  };
  
  // Custom label for the pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render very small segments

    return (
      <text 
        x={x} 
        y={y} 
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
      >
        {`${name}: ${completedTests.length > 0 ? value + '%' : percent + '%'}`}
      </text>
    );
  };

  // NEW CODE: Generate progress timeline data
  const getProgressTimelineData = () => {
    // Only proceed if we have completed tests
    if (completedTests.length === 0) return [];
    
    // Sort tests by date
    const sortedTests = [...completedTests].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Create timeline data with running average for each subject
    const subjectScores = {};
    const timelineData = [];
    
    sortedTests.forEach(test => {
      const date = new Date(test.date);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
      
      // Initialize subject in tracking object if not exists
      if (!subjectScores[test.subject]) {
        subjectScores[test.subject] = {
          totalScore: 0,
          count: 0,
          runningAvg: 0
        };
      }
      
      // Update running average
      subjectScores[test.subject].totalScore += test.score;
      subjectScores[test.subject].count += 1;
      subjectScores[test.subject].runningAvg = 
        Math.round(subjectScores[test.subject].totalScore / subjectScores[test.subject].count);
      
      // Create data point with all current subject averages
      const dataPoint = { 
        date: formattedDate,
        dateObj: date // For sorting, will remove later
      };
      
      // Add current average for each subject
      Object.entries(subjectScores).forEach(([subject, data]) => {
        dataPoint[subject] = data.runningAvg;
      });
      
      timelineData.push(dataPoint);
    });
    
    // Get unique dates to avoid duplicates
    const uniqueDates = {};
    const finalTimelineData = timelineData
      .filter(point => {
        const dateStr = point.date;
        if (uniqueDates[dateStr]) return false;
        uniqueDates[dateStr] = true;
        return true;
      })
      .map(point => {
        const { dateObj, ...rest } = point; // Remove the date object
        return rest;
      });
    
    return finalTimelineData;
  };

  const timelineData = getProgressTimelineData();

  // Get all unique subjects for the timeline
  const getTimelineSubjects = () => {
    if (!timelineData.length) return [];
    
    // Get all properties except 'date'
    const firstPoint = timelineData[0];
    return Object.keys(firstPoint).filter(key => key !== 'date');
  };
  
  const timelineSubjects = getTimelineSubjects();

  return (
    <div className="home">
      <header className="l-header">
        <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
            <Greeting />
          </Link>

          <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/discover')}>Discover</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/test')}>Test</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/papers')}>Exam Papers</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a>
              </li>
            </ul>
          </div>
          <link
            href="https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css"
            rel="stylesheet"
          />
          <div className="nav__toggle" id="nav-toggle" onClick={toggleMenu}>
            <i className='bx bx-menu'></i>
          </div>
        </nav>
      </header>

      <div className="reports-container">
        {loading && <p>Loading student data...</p>}
        {error && <p className="error">{error}</p>}

        <div className="progress-metrics">
          <h3>Learning Overview</h3>
          <div className="metric-cards">
            <div className="metric-card">
              <h4>📚 Subjects Studied</h4>
              <p>{new Set(subjectMessages.map(msg => msg.subject)).size}</p>
            </div>
            <div className="metric-card">
              <h4>⏳ Total Study Time</h4>
              <p>{calculateTotalStudyTime()} hours</p>
            </div>
            
            <div className="metric-card">
              <h4>✅ Tests Completed</h4>
              <p>{completedTests.length}</p>
            </div>
          </div>
        </div>

        {timelineData.length > 0 && (
          <div className="progress-timeline-section">
            <h3>Progress Timeline</h3>
            <div className="timeline-chart-container" style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                  <Legend />
                  {timelineSubjects.map((subject, index) => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={subject}
                      stroke={COLORS[index % COLORS.length]}
                      activeDot={{ r: 8 }}
                      name={subject}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="progress-chart-section">
          {pieChartData.length > 0 ? (
            <div className="pie-chart-container" style={{ width: '100%', height: 300 }}>
              <h3 className='pie-header'>{getPieChartTitle()}</h3>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      return completedTests.length > 0 
                        ? [`${value}% average score`, name] 
                        : [`${props.payload.percent}% of activity`, name];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            !loading && <p>No data available to display chart.</p>
          )}
        </div>

        <div className="test-history-section">
          <h3>Test Results</h3>
          {completedTests.length > 0 ? (
            <>
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
                      <td>{test.score}</td>
                      <td>{test.totalQuestions}</td>
                      <td>{test.performanceMetrics?.proficiencyLevel || 'N/A'}</td>
                      <td>{new Date(test.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="test-summary">
                <h4>Test Performance Summary</h4>
                <div className="performance-bars">
                  {Object.entries(calculateTestPerformance()).map(([subject, data]) => {
                    const average = data.total / data.count;
                    return (
                      <div key={subject} className="performance-bar">
                        <span className="subject-name">{subject}</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{width: `${average}%`}}
                          ></div>
                          <span className="bar-text">{Math.round(average)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            !loading && <p>No test results found.</p>
          )}
        </div>

        <div className="chat-history-section">
          {subjectMessages.length > 0 ? (
            <>
              <div className="table-header">
                <h3 className='table-header-text'>Recent Learning Activity</h3>
                {subjectMessages.length > 3 && (
                  <span className="total-entries">
                    Showing 3 of {subjectMessages.length} entries
                  </span>
                )}
              </div>
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectMessages.slice(0, 3).map((message, index) => (
                    <tr key={index}>
                      <td>{message.subject}</td>
                      <td>{message.message}</td>
                      <td>{new Date(message.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            !loading && <p>No chat history found.</p>
          )}
        </div>
        <button
          className="generate-report-button"
          onClick={generateReport}
          disabled={generatingReport}
        >
          {generatingReport ? 'Generating Report...' : 'Generate Report'}
        </button>

        {report && (
          <div className="generated-report">
            <h3>Generated Report:</h3>
            <pre>{report}</pre>
          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;