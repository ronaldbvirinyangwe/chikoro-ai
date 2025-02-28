import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Greeting from '../Enrol/Greeting';
import './reports.css';

const Reports = ({ studentId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjectMessages, setSubjectMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [completedTests, setCompletedTests] = useState([]);
  const [studyGoals, setStudyGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({
    text: '',
    category: 'General',
    targetDate: '',
    completed: false
  });

  const BASE_API_URL = 'https://chikoro-ai.com';
  const navigate = useNavigate();

  const categories = [
    'General',
    'Grammar',
    'Vocabulary',
    'Speaking',
    'Writing',
    'Reading',
    'Listening'
  ];

  const toggleMenu = () => setMenuVisible(prev => !prev);
  const closeMenu = () => setMenuVisible(false);

  const calculateTotalStudyTime = () => {
    const minutesStudied = subjectMessages.length * 10;
    return Math.round(minutesStudied / 60);
  };

 useEffect(() => {
    localStorage.setItem('studyGoals', JSON.stringify(studyGoals));
  }, [studyGoals]);

 const addStudyGoal = async () => {
  try {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) {
      setError('No student ID found');
      return;
    }

    if (!newGoal.text) {
      setError('Please enter a goal description');
      return;
    }

    const response = await axios.post(
      `/students/${studentId}/goals`,
      {
        text: newGoal.text,
        category: newGoal.category,
        targetDate: newGoal.targetDate
      }
    );

    setStudyGoals(prevGoals => [...prevGoals, response.data]);
    setNewGoal({
      text: '',
      category: 'General',
      targetDate: '',
      completed: false
    });
    setError('');
  } catch (err) {
    console.error('Failed to add goal:', err);
    setError('Failed to add goal: ' + (err.response?.data?.error || err.message));
  }
};

  const toggleGoalCompletion = async (goalId) => {
    try {
      const studentId = localStorage.getItem('studentId');
      const goalToUpdate = studyGoals.find(g => g._id === goalId);
      const updatedGoal = { ...goalToUpdate, completed: !goalToUpdate.completed };

      await axios.put(
        `${BASE_API_URL}/students/${studentId}/goals`,
        updatedGoal
      );

      setStudyGoals(prevGoals =>
        prevGoals.map(goal =>
          goal._id === goalId ? { ...goal, completed: !goal.completed } : goal
        )
      );
    } catch (err) {
      setError('Failed to update goal: ' + err.message);
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const studentId = localStorage.getItem('studentId');
      await axios.delete(
        `${BASE_API_URL}/students/${studentId}/goals`
      );

      setStudyGoals(prevGoals => prevGoals.filter(goal => goal._id !== goalId));
    } catch (err) {
      setError('Failed to delete goal: ' + err.message);
    }
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
      try {
         const studentId = localStorage.getItem('studentId');
        if (!studentId) {
          setError('Please login to view reports');
          return;
        }

        try {
          const studentResponse = await axios.get(`${BASE_API_URL}/students/${studentId}`);
          const studentData = studentResponse.data;
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
        } catch (err) {
          console.error('Failed to fetch student data:', err);
          setError('Failed to load student data');
        }

        try {
          const goalsResponse = await axios.get(`${BASE_API_URL}/goals/${studentId}`);
          let goalsData = [];
          
          if (goalsResponse.data) {
            if (Array.isArray(goalsResponse.data)) {
              goalsData = goalsResponse.data;
            } else if (Array.isArray(goalsResponse.data.goals)) {
              goalsData = goalsResponse.data.goals;
            }
          }
          
          setStudyGoals(goalsData);
        } catch (err) {
          console.error('Failed to fetch goals:', err);
          setStudyGoals([]);
        }

        try {
          const testsResponse = await axios.get(`${BASE_API_URL}/tests/${studentId}`);
          setCompletedTests(Array.isArray(testsResponse.data) ? testsResponse.data : []);
        } catch (err) {
          console.error('Failed to fetch tests:', err);
          setCompletedTests([]);
        }

      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [studentId]);

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
                <a className="nav__link" onClick={() => navigate('/exercise')}>Exercise</a>
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a>
              </li>
            </ul>
          </div>

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
              <h4>📝 Completed Tests</h4>
              <p>{completedTests.length}</p>
            </div>
          </div>
        </div>

        <div className="goal-tracker">
          <h3>Study Goals</h3>
          <div className="goal-input-container">
            <div className="goal-input-group">
              <input
                type="text"
                value={newGoal.text}
                onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
                placeholder="Enter your goal..."
                className="goal-input"
              />
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                className="goal-category"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="goal-input-group">
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                className="goal-date"
              />
              <button onClick={addStudyGoal} className="add-goal-button">
                Add Goal
              </button>
            </div>
          </div>

          <div className="goal-list">
            {studyGoals.map(goal => (
              <div key={goal._id} className="goal-item">
                <div className="goal-checkbox">
                  <input
                    type="checkbox"
                    checked={goal.completed}
                    onChange={() => toggleGoalCompletion(goal._id)}
                  />
                </div>
                <div className="goal-content">
                  <p className={`goal-text ${goal.completed ? 'completed' : ''}`}>
                    {goal.text}
                  </p>
                  <div className="goal-details">
                    <span className="goal-date">
                      {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No date set'}
                    </span>
                    <span className="goal-category">{goal.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteGoal(goal._id)}
                  className="delete-goal-button"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="chat-history-section">
          {subjectMessages.length > 0 ? (
             <>
      <div className="table-header">
        <h3>Recent Learning Activity</h3>
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
