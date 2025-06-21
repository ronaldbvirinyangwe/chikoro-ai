import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Reports.css';

const QuizSubmissions = () => {
    const { quizId } = useParams();
    const { accessToken } = useAuth();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const headers = { Authorization: `Bearer ${accessToken}` };
                const response = await axios.get(`/api/v1/quizzes/${quizId}/submissions`, { headers });
                setReport(response.data);
            } catch (err) {
                setError('Failed to fetch submission data.');
            } finally {
                setLoading(false);
            }
        };

        if (accessToken && quizId) {
            fetchSubmissions();
        }
    }, [accessToken, quizId]);

    if (loading) return <div className="loading-container">Loading Submissions...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!report) return <div className="no-quizzes-message">No report data found.</div>;

    return (
        <div className="reports-container">
            <nav className="tool-nav">
                <Link to="/reports">&larr; Back to All Reports</Link>
            </nav>
            <header className="tool-header">
                <h1>{report.quizTitle}</h1>
                <p>Submissions from your students.</p>
            </header>

            <div className="submissions-table-container">
                <table className="submissions-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Score</th>
                            <th>AI Feedback Summary</th>
                            <th>Submitted On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.submissions.length > 0 ? (
                            report.submissions.map(sub => (
                                <tr key={sub.submissionId}>
                                    <td>{sub.studentName}</td>
                                    <td>
                                        <span className={`score ${sub.score >= 80 ? 'high' : sub.score >= 50 ? 'medium' : 'low'}`}>
                                            {sub.score}%
                                        </span>
                                    </td>
                                    <td className="feedback-cell">
                                        <p><strong>Overall:</strong> {sub.aiFeedback.overallFeedback}</p>
                                        {sub.aiFeedback.strengths?.length > 0 && (
                                            <div><strong>Strengths:</strong> {sub.aiFeedback.strengths.join(', ')}</div>
                                        )}
                                        {sub.aiFeedback.areasForImprovement?.length > 0 && (
                                            <div><strong>To Improve:</strong> {sub.aiFeedback.areasForImprovement.join(', ')}</div>
                                        )}
                                    </td>
                                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No submissions for this quiz yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QuizSubmissions;