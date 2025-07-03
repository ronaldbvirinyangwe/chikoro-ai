import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { create } from 'zustand';
import { useAuth } from '../../context/AuthContext';
import './SchemeCreator.css'; 

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- A Simple Markdown Renderer ---
// const MarkdownRenderer = ({ text }) => {
//     // A more robust library like 'react-markdown' would be better in a real app
//     const html = text
//         .replace(/### (.*)/g, '<h3>$1</h3>') // Process headings
//         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Process bold text
//         // Process lists:
//         // 1. First, convert all list lines to <li> elements.
//         .replace(/^- (.*)/gm, '<li>$1</li>') 
//         // 2. Then, wrap any sequence of <li> elements into a single <ul>.
//         .replace(/(<li>(?:.|\n)*?<\/li>)/g, '<ul>$&</ul>');
        

//     return <div className="generated-scheme" dangerouslySetInnerHTML={{ __html: html }} />;
// };

// --- Zustand Store for the Scheme of Work Creator ---
const useSchemeCreatorStore = create((set, get) => ({
    // --- State ---
    formData: {
        subject: '',
        grade: '',
        term: '1',
        weeks: '13'
    },
    schemeOfWork: '', // Will hold the streaming markdown text
    isLoading: false,
    error: '',

    // --- Actions ---
    setFormField: (field, value) => {
        set(state => ({
            formData: { ...state.formData, [field]: value }
        }));
    },

    // This action handles the streaming response
   generateScheme: async (accessToken) => {
    const { formData } = get();
    if (!formData.subject || !formData.grade || !formData.term || !formData.weeks) {
        set({ error: 'All fields are required.' });
        return;
    }

    set({ isLoading: true, error: '', schemeOfWork: '' });

    try {
        const response = await fetch('/api/v1/teacher-tools/generate-scheme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            // It's good practice to try and parse the error message from the server
            const errData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
            throw new Error(errData.error);
        }

        // --- THIS IS THE CRUCIAL CHANGE ---
        // 1. The response is now a single JSON object, not a stream.
        const data = await response.json();

        // 2. Set the entire scheme of work in one go from the response object.
        //    Your backend sends it as { schemeOfWork: "..." }, so we access data.schemeOfWork
        set({ schemeOfWork: data.schemeOfWork });

    } catch (err) {
        console.error("Error generating scheme:", err);
        set({ error: err.message || "An error occurred while generating the scheme." });
    } finally {
        set({ isLoading: false });
    }
},
    
    reset: () => {
        set({
            formData: { subject: '', grade: '', term: '1', weeks: '13' },
            schemeOfWork: '',
            isLoading: false,
            error: ''
        });
    }
}));


// --- React Component ---
const SchemeOfWorkCreator = () => {
    const { 
        formData, 
        schemeOfWork, 
        isLoading, 
        error, 
        setFormField, 
        generateScheme,
        reset
    } = useSchemeCreatorStore();
    
    const { accessToken } = useAuth();

    useEffect(() => {
        return () => {
            reset(); // Reset state when the component unmounts
        }
    }, [reset]);

    const handleSubmit = (e) => {
        e.preventDefault();
        generateScheme(accessToken);
    };

    return (
        <div className="tool-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>AI Scheme of Work Creator</h1>
                <p>Plan your entire term by generating a week-by-week scheme of work.</p>
            </header>
            
            <div className="scheme-creator-content">
                <div className="scheme-form-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input type="text" id="subject" value={formData.subject} onChange={(e) => setFormField('subject', e.target.value)} placeholder="e.g., Integrated Science" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="grade">Grade / Form</label>
                            <input type="text" id="grade" value={formData.grade} onChange={(e) => setFormField('grade', e.target.value)} placeholder="e.g., Form 1" required />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="term">Term</label>
                                <select id="term" value={formData.term} onChange={(e) => setFormField('term', e.target.value)}>
                                    <option value="1">Term 1</option>
                                    <option value="2">Term 2</option>
                                    <option value="3">Term 3</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="weeks">Weeks in Term</label>
                                <input type="number" id="weeks" min="8" max="15" value={formData.weeks} onChange={(e) => setFormField('weeks', e.target.value)} />
                            </div>
                        </div>
                        <button type="submit" className="generate-btn" disabled={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate Scheme of Work'}
                        </button>
                    </form>
                </div>

               <div className="scheme-output-section">
                    {isLoading && !schemeOfWork && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Building your scheme of work...</p>
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}
                    
                    {/* The new ReactMarkdown component replaces your old renderer */}
                    <div className="generated-scheme">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {schemeOfWork}
                        </ReactMarkdown>
                    </div>

                    {!schemeOfWork && !isLoading && !error && (
                         <div className="placeholder-text">Your generated scheme of work will appear here in real-time.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchemeOfWorkCreator;
