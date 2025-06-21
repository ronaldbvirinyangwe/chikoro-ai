import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './QuizGenerator.css';

const QuizGenerator = () => {
    const { accessToken } = useAuth();
    const [formData, setFormData] = useState({
        subject: '',
        topic: '',
        grade: '',
        numQuestions: 10,
        questionTypes: 'Multiple-choice and Short-answer'
    });
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // --- NEW: State for the shareable link ---
    const [shareableLink, setShareableLink] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setQuiz(null);
        setShareableLink(''); // Reset link on new generation

        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.post('/api/v1/teacher-tools/generate-quiz', formData, { headers });
            setQuiz(response.data);
        } catch (err) {
            console.error("Error generating quiz:", err);
            setError(err.response?.data?.error || "An error occurred while generating the quiz.");
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Function to save the quiz and generate the link ---
    const handleSaveAndGetLink = async () => {
        if (!quiz) return;
        setLoading(true); // Reuse the loading state
        setError('');

        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            // Combine quiz data with form metadata for a complete record
            const payload = { 
                ...quiz, 
                subject: formData.subject, 
                grade: formData.grade 
            };
            
            const response = await axios.post('/api/v1/quizzes/save', payload, { headers });
            
            // Construct the full shareable link
            const link = `${window.location.origin}/quiz/${response.data.quizId}`;
            setShareableLink(link);

        } catch (err) {
            console.error("Error saving quiz:", err);
            setError("Could not save the quiz. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="tool-container quiz-generator-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>AI Quiz & Test Generator</h1>
                <p>Create a customized quiz for your students in seconds.</p>
            </header>
            
            <div className="quiz-generator-content">
                <div className="quiz-form-section">
                    <form onSubmit={handleSubmit}>
                        {/* Form inputs remain the same */}
                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="e.g., Combined Science" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="topic">Topic</label>
                            <input type="text" id="topic" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="e.g., Photosynthesis" required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="grade">Grade / Form</label>
                            <input type="text" id="grade" name="grade" value={formData.grade} onChange={handleInputChange} placeholder="e.g., Form 2" required />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="numQuestions">Number of Questions</label>
                                <input type="number" id="numQuestions" name="numQuestions" min="1" max="25" value={formData.numQuestions} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="questionTypes">Question Types</label>
                                <select id="questionTypes" name="questionTypes" value={formData.questionTypes} onChange={handleInputChange}>
                                    <option>Multiple-choice and Short-answer</option>
                                    <option>Multiple-choice only</option>
                                    <option>Short-answer only</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="generate-btn" disabled={loading}>
                            {loading && !quiz ? 'Generating Quiz...' : 'Generate Quiz'}
                        </button>
                    </form>
                </div>

                <div className="quiz-output-section">
                    {loading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Building your quiz...</p>
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}
                    {quiz ? (
                        <div className="generated-quiz printable-content">
                           <div className="quiz-header">
                                <h2>{quiz.title}</h2>
                                <p><strong>Subject:</strong> {formData.subject} | <strong>Grade:</strong> {formData.grade}</p>
                                <hr/>
                           </div>
                           {quiz.questions.map((q, index) => (
                               <div key={index} className="question-block">
                                   <p className="question-text"><strong>{index + 1}.</strong> {q.question}</p>
                                   {q.type === 'multiple-choice' && (
                                       <ul className="options-list">
                                           {q.options.map((opt, i) => (
                                               <li key={i}>{opt}</li>
                                           ))}
                                       </ul>
                                   )}
                                   <p className="answer-reveal"><strong>Answer:</strong> {q.correctAnswer}</p>
                               </div>
                           ))}

                            {/* --- ADDED UI FOR SAVING AND SHARING --- */}
                            {!shareableLink ? (
                                <button onClick={handleSaveAndGetLink} className="save-link-btn" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save & Get Sharable Link'}
                                </button>
                            ) : (
                                <div className="shareable-link-container">
                                    <p>Quiz saved! Share this link with your students:</p>
                                    <input type="text" readOnly value={shareableLink} onClick={(e) => e.target.select()} />
                                    <button className ="save-link-btn" onClick={() => navigator.clipboard.writeText(shareableLink)}>Copy Link</button>
                                </div>
                            )}

                           <button onClick={handlePrint} className="print-btn">Print for Offline Use</button>
                        </div>
                    ) : (
                        !loading && <div className="placeholder-text">Your generated quiz will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizGenerator;
