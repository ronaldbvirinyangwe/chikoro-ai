import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Reports.css'; // We will create this CSS file next

const TeacherReports = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { accessToken } = useAuth(); // This is where the accessToken comes from
    const navigate = useNavigate();

    // ADDED CONSOLE.LOGS FOR DEBUGGING
    console.log("TeacherReports: Component rendering. Current accessToken:", accessToken);

    useEffect(() => {
        console.log("TeacherReports useEffect: Running.");
        console.log("TeacherReports useEffect: Access Token inside effect:", accessToken);

        const fetchQuizzes = async () => {
            console.log("TeacherReports fetchQuizzes: Attempting to fetch...");
            try {
                const headers = { Authorization: `Bearer ${accessToken}` };
                const response = await axios.get('/api/v1/quizzes/teacher', { headers });
                setQuizzes(response.data);
                console.log("TeacherReports fetchQuizzes: Successfully fetched quizzes.");
            } catch (err) {
                console.error("TeacherReports fetchQuizzes: Error fetching quizzes:", err.response || err.message); // Log full error
                setError('Failed to fetch your quizzes. Please try again later.');
                // IMPORTANT: If auth fails, you should redirect.
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    console.log("TeacherReports: Authentication error, redirecting to login.");
                    navigate('/login');
                }
            } finally {
                setLoading(false);
                console.log("TeacherReports fetchQuizzes: Loading set to false.");
            }
        };

        if (accessToken) {
            console.log("TeacherReports useEffect: accessToken IS present, calling fetchQuizzes().");
            fetchQuizzes();
        } else {
            console.log("TeacherReports useEffect: accessToken IS NOT present. NOT calling fetchQuizzes().");
            // If the component renders without a token, and it expects one,
            // it's good practice to redirect or show a specific message.
            // Assuming PrivateRoute handles the initial protection, this is a fallback.
            if (!loading && !error) { // Only navigate if not already loading or showing an error
                navigate('/login'); // Redirect to login if no token found
            }
        }
    }, [accessToken, navigate]); // Add navigate to dependency array

    if (loading) return <div className="loading-container">Loading Reports...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="reports-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>Quiz Reports</h1>
                <p>Select a quiz to view student submissions and results.</p>
            </header>

            <div className="quiz-list">
                {quizzes.length > 0 ? (
                    quizzes.map(quiz => (
                        // Updated path based on our previous discussion:
                        <div key={quiz.quizId} className="quiz-list-item" onClick={() => navigate(`/teacher/quizzes/${quiz.quizId}/submissions`)}>
                            <div className="quiz-info">
                                <h3>{quiz.title}</h3>
                                <p>{quiz.subject} - {quiz.grade}</p>
                            </div>
                            <div className="quiz-stats">
                                <span>{quiz.submissionCount} Submissions</span>
                                <span className="view-report-btn">View Report &rarr;</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-quizzes-message">You have not created any quizzes yet.</p>
                )}
            </div>
        </div>
    );
};

export default TeacherReports;