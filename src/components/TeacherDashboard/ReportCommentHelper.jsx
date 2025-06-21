import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { create } from 'zustand';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ReportCommentHelper.css';

// --- SVG Icon for the copy button ---
const FaCopy = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M320 448v40c0 13.255-10.745 24-24 24H24c-13.255 0-24-10.745-24-24V120c0-13.255 10.745-24 24-24h72v296c0 30.879 25.121 56 56 56h168zm0-344V0H152c-13.255 0-24 10.745-24 24v368c0 13.255 10.745 24 24 24h272c13.255 0 24-10.745 24-24V128H344c-13.2 0-24-10.8-24-24zm120.97-31.029L375.03 7.029A24 24 0 0 0 358.059 0H352v96h96v-6.059a24 24 0 0 0-7.03-16.97z"></path></svg>;


// --- Zustand Store for the Report Comment Helper ---
const useReportCommentStore = create((set, get) => ({
    formData: {
        studentName: '',
        subject: '',
        overallPerformance: 'Satisfactory',
        strengths: '',
        areasForImprovement: ''
    },
    comments: [],
    isLoading: false,
    error: '',

    setFormField: (field, value) => {
        set(state => ({
            formData: { ...state.formData, [field]: value }
        }));
    },

    generateComments: async (accessToken) => {
        const { formData } = get();
        if (!formData.studentName || !formData.subject || !formData.overallPerformance) {
            set({ error: 'Student Name, Subject, and Overall Performance are required.' });
            return;
        }
        set({ isLoading: true, error: '', comments: [] });
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.post('/api/v1/teacher-tools/generate-report-comments', formData, { headers });
            
            if (response.data?.comments) {
                set({ comments: response.data.comments, isLoading: false });
            } else {
                throw new Error("Received an invalid response format from the server.");
            }
        } catch (err) {
            console.error("Error generating comments:", err);
            const errorMessage = err.response?.data?.error || "An error occurred while generating comments.";
            set({ error: errorMessage, isLoading: false });
        }
    },
    
    reset: () => {
        set({
            formData: { studentName: '', subject: '', overallPerformance: 'Satisfactory', strengths: '', areasForImprovement: '' },
            comments: [],
            isLoading: false,
            error: ''
        });
    }
}));


// --- React Component ---
const ReportCommentHelper = () => {
    const { 
        formData, 
        comments, 
        isLoading, 
        error, 
        setFormField, 
        generateComments,
        reset
    } = useReportCommentStore();
    
    const { accessToken } = useAuth();
    const [copiedIndex, setCopiedIndex] = useState(null);

    useEffect(() => {
        return () => {
            reset();
        }
    }, [reset]);

    const handleSubmit = (e) => {
        e.preventDefault();
        generateComments(accessToken);
    };

    const handleCopy = (commentText, index) => {
        navigator.clipboard.writeText(commentText);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="tool-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>AI Report Comment Helper</h1>
                <p>Generate thoughtful, constructive comments for your student reports.</p>
            </header>
            
            <div className="comment-helper-content">
                <div className="helper-form-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="studentName">Student's Name</label>
                            <input type="text" id="studentName" name="studentName" value={formData.studentName} onChange={(e) => setFormField('studentName', e.target.value)} placeholder="e.g., Jane Doe" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input type="text" id="subject" name="subject" value={formData.subject} onChange={(e) => setFormField('subject', e.target.value)} placeholder="e.g., English" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="overallPerformance">Overall Performance</label>
                            <select id="overallPerformance" name="overallPerformance" value={formData.overallPerformance} onChange={(e) => setFormField('overallPerformance', e.target.value)}>
                                <option>Excellent</option>
                                <option>Good</option>
                                <option>Satisfactory</option>
                                <option>Needs Improvement</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="strengths">Key Strengths (Optional)</label>
                            <textarea id="strengths" name="strengths" value={formData.strengths} onChange={(e) => setFormField('strengths', e.target.value)} rows="3" placeholder="e.g., Strong grasp of literary concepts, participates well in discussions..."></textarea>
                        </div>
                        <div className="form-group">
                            <label htmlFor="areasForImprovement">Areas for Improvement (Optional)</label>
                            <textarea id="areasForImprovement" name="areasForImprovement" value={formData.areasForImprovement} onChange={(e) => setFormField('areasForImprovement', e.target.value)} rows="3" placeholder="e.g., Could improve on grammar and sentence structure in written essays..."></textarea>
                        </div>
                        <button type="submit" className="generate-btn" disabled={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate Comments'}
                        </button>
                    </form>
                </div>

                <div className="helper-output-section">
                    {isLoading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Writing comments...</p>
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}
                    
                    {comments.length > 0 && !isLoading && (
                        <div className="comments-list">
                            <h3 className="output-title">Generated Comment Suggestions</h3>
                            {comments.map((comment, index) => (
                                <div key={index} className="comment-card">
                                    <div className="comment-text">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {comment}
                                        </ReactMarkdown>
                                    </div>
                                    <button onClick={() => handleCopy(comment, index)} className="copy-btn">
                                        <FaCopy /> {copiedIndex === index ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!comments.length && !isLoading && !error && (
                         <div className="placeholder-text">Generated comments will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportCommentHelper;