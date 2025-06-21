import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './StudentQuiz.css'; // Your existing CSS will still work

const StudentQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { accessToken } = useAuth();

    // --- STATE MANAGEMENT ---
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [quizResult, setQuizResult] = useState(null);

    // --- NEW: State for interactive features ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [showReview, setShowReview] = useState(false);

    // --- NEW: Load saved state from localStorage on initial render ---
    useEffect(() => {
        const savedState = localStorage.getItem(`quizState_${quizId}`);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setAnswers(parsed.answers || []);
                setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
                setTimerSeconds(parsed.timerSeconds || 0);
            } catch {
                // If parsing fails, clear the invalid state
                localStorage.removeItem(`quizState_${quizId}`);
            }
        }
    }, [quizId]);


    // --- Fetch Quiz Data ---
    useEffect(() => {
        if (!accessToken || !quizId) {
            setLoading(false);
            setError("Authentication error or invalid quiz link.");
            return;
        }

        const fetchQuiz = async () => {
            setLoading(true);
            try {
                const headers = { Authorization: `Bearer ${accessToken}` };
                const response = await axios.get(`/api/v1/quizzes/${quizId}`, { headers });
                setQuiz(response.data);
                
                // Initialize answers array only if not already loaded from localStorage
                setAnswers(prevAnswers => 
                    prevAnswers.length === response.data.questions.length ? prevAnswers : new Array(response.data.questions.length).fill('')
                );

                setIsTimerRunning(true); // Start the timer once the quiz is loaded
            } catch (err) {
                setError("Could not load the quiz. The link may be invalid or expired.");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [quizId, accessToken]);


    // --- NEW: Timer logic ---
    useEffect(() => {
        let timerInterval = null;
        if (isTimerRunning && !quizResult) {
            timerInterval = setInterval(() => {
                setTimerSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerInterval);
    }, [isTimerRunning, quizResult]);

    // --- NEW: Save progress to localStorage ---
    useEffect(() => {
        // Don't save if the quiz hasn't loaded or is already submitted
        if (!quiz || quizResult) return;

        const stateToSave = {
            answers,
            currentQuestionIndex,
            timerSeconds,
        };
        localStorage.setItem(`quizState_${quizId}`, JSON.stringify(stateToSave));
    }, [answers, currentQuestionIndex, timerSeconds, quizId, quiz, quizResult]);


    const handleAnswerChange = (index, value) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Check if all questions have been answered
        const allAnswered = answers.every(answer => answer?.toString().trim() !== '');
        if (!allAnswered) {
            setError("Please answer all questions before submitting.");
            // Optionally, switch back to the test view
            setShowReview(false);
            return;
        }

        setSubmitting(true);
        setError('');
        setIsTimerRunning(false); // Stop the timer
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.post(`/api/v1/quizzes/${quizId}/submit`, { answers }, { headers });
            setQuizResult(response.data);
            localStorage.removeItem(`quizState_${quizId}`); // Clear saved state on successful submission
        } catch (err) {
            setError("There was an error submitting your quiz. Please try again.");
            setIsTimerRunning(true); // Restart timer if submission fails
        } finally {
            setSubmitting(false);
        }
    };

    // --- NEW: Navigation and review functions ---
    const nextQuestion = () => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1));
    const prevQuestion = () => setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
    const toggleReview = () => {
        setError(''); // Clear any previous errors
        setShowReview(prev => !prev);
    };
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset the quiz? All your answers will be cleared.")) {
            localStorage.removeItem(`quizState_${quizId}`);
            setAnswers(new Array(quiz.questions.length).fill(''));
            setCurrentQuestionIndex(0);
            setTimerSeconds(0);
            setShowReview(false);
            setError('');
        }
    };


    // --- RENDER LOGIC ---

    if (loading) return <div className="loading-container">Loading Quiz...</div>;
    if (error && !quiz) return <div className="error-message">{error}</div>; // Show fatal errors full-screen

    if (quizResult) {
        return (
            <div className="student-quiz-container">
                <div className="quiz-results-container">
                    <h2>Quiz Complete!</h2>
                    <p>Here are your results:</p>
                    <div className="score-display">{quizResult.score}%</div>
                    <p className="score-details">You answered {quizResult.correctAnswers} out of {quizResult.totalQuestions} questions correctly.</p>
                    <Link to="/reports" className="back-to-dash-btn">View My Reports</Link>
                </div>
            </div>
        );
    }
    
    if (!quiz) return <div className="loading-container">Preparing your quiz...</div>;

    const renderQuestion = (q, index) => {
        const isVisible = showReview || index === currentQuestionIndex;
        if (!isVisible) return null; // Don't render non-visible questions

        return (
            <div key={q._id || index} className={`quiz-question-card ${showReview ? 'review-view' : ''}`}>
                <p className="question-text"><strong>{index + 1}.</strong> {q.question}</p>
                {q.type === 'multiple-choice' ? (
                    <div className="options-group">
                        {q.options.map((opt, i) => (
                            <label key={i} className={`option-label ${answers[index] === (opt.text || opt) ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={opt.text || opt}
                                    checked={answers[index] === (opt.text || opt)}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    disabled={submitting}
                                    required
                                />
                                {opt.text || opt}
                            </label>
                        ))}
                    </div>
                ) : (
                    <textarea
                        className="short-answer-input"
                        rows="4"
                        placeholder="Type your answer here..."
                        value={answers[index]}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        disabled={submitting}
                        required
                    />
                )}
            </div>
        );
    };

    return (
        <div className="student-quiz-container">
            <div className="quiz-header-bar">
                <h1>{quiz.title}</h1>
                <div className="quiz-info">
                    <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                    <span className="timer">Time: {formatTime(timerSeconds)}</span>
                </div>
            </div>
            
            {error && <div className="error-message inline-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="questions-wrapper">
                    {quiz.questions.map(renderQuestion)}
                </div>

                {!showReview ? (
                    <div className="quiz-navigation">
                        <button type="button" onClick={prevQuestion} className="test-button primary-button" disabled={submitting || currentQuestionIndex === 0}>Previous</button>
                        {currentQuestionIndex < quiz.questions.length - 1
                            ? <button type="button" onClick={nextQuestion} className="test-button primary-button">Next</button>
                            : <button type="button" onClick={toggleReview} className="test-button primary-button">Review Answers</button>
                        }
                    </div>
                ) : (
                    <div className="review-actions">
                         <h3>Review Your Answers</h3>
                        <p>Please review your answers below. Click "Submit Quiz" when you are finished.</p>
                        <button type="submit" className="submit-quiz-btn" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                        <button type="button" onClick={toggleReview} className="nav-btn" disabled={submitting}>Back to Test</button>
                    </div>
                )}
            </form>

             {/* <button onClick={handleReset} className="reset-quiz-btn" disabled={submitting}>
                Reset Quiz
            </button> */}
        </div>
    );
};

export default StudentQuiz;