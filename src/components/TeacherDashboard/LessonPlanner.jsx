import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { create } from 'zustand';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown'; // <-- ADDED
import remarkGfm from 'remark-gfm';           // <-- ADDED
import './LessonPlanner.css';

// --- Zustand Store for the Lesson Planner ---
// No changes are needed here. This logic is solid.
const useLessonPlannerStore = create((set, get) => ({
    // --- State ---
    formData: {
        subject: '',
        topic: '',
        grade: '',
        duration: '40 minutes',
        objectives: ''
    },
    lessonPlan: '',
    isLoading: false,
    error: '',

    // --- Actions ---
    setFormField: (field, value) => {
        set(state => ({
            formData: { ...state.formData, [field]: value }
        }));
    },

    generatePlan: async (accessToken) => {
        const { formData } = get();
        if (!formData.subject || !formData.topic || !formData.grade) {
            set({ error: 'Subject, Topic, and Grade are required fields.' });
            return;
        }

        set({ isLoading: true, error: '', lessonPlan: '' });

        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.post('/api/v1/teacher-tools/generate-lesson-plan', formData, { headers });
            
            if (response.data?.lessonPlan && typeof response.data.lessonPlan === 'string') {
                 set({ lessonPlan: response.data.lessonPlan, isLoading: false });
            } else {
                throw new Error("Received an invalid response format from the server.");
            }

        } catch (err) {
            console.error("Error generating lesson plan:", err);
            const errorMessage = err.response?.data?.error || "An error occurred while generating the plan.";
            set({ error: errorMessage, isLoading: false });
        }
    },

    reset: () => {
        set({
            formData: { subject: '', topic: '', grade: '', duration: '40 minutes', objectives: '' },
            lessonPlan: '',
            isLoading: false,
            error: ''
        });
    }
}));


// --- React Component ---
const LessonPlanner = () => {
    const { 
        formData, 
        lessonPlan, 
        isLoading, 
        error, 
        setFormField, 
        generatePlan,
        reset
    } = useLessonPlannerStore();
    
    const { accessToken } = useAuth();

    useEffect(() => {
        return () => {
            reset();
        }
    }, [reset]);

    const handleSubmit = (e) => {
        e.preventDefault();
        generatePlan(accessToken);
    };

    // The old local MarkdownRenderer function has been completely removed.

    return (
        <div className="tool-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>AI Lesson Planner</h1>
                <p>Fill in the details below and let the AI create a structured lesson plan for you.</p>
            </header>
            
            <div className="lesson-planner-content">
                <div className="planner-form-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="subject">Subject</label>
                                <input type="text" id="subject" value={formData.subject} onChange={(e) => setFormField('subject', e.target.value)} placeholder="e.g., History" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="grade">Grade / Form</label>
                                <input type="text" id="grade" value={formData.grade} onChange={(e) => setFormField('grade', e.target.value)} placeholder="e.g., Form 3" required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="topic">Topic</label>
                            <input type="text" id="topic" value={formData.topic} onChange={(e) => setFormField('topic', e.target.value)} placeholder="e.g., The Mfecane Period" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="duration">Lesson Duration</label>
                            <select id="duration" value={formData.duration} onChange={(e) => setFormField('duration', e.target.value)}>
                                <option>40 minutes</option>
                                <option>60 minutes</option>
                                <option>80 minutes (Double Period)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="objectives">Specific Objectives (Optional)</label>
                            <textarea id="objectives" value={formData.objectives} onChange={(e) => setFormField('objectives', e.target.value)} rows="3" placeholder="e.g., Students should be able to list three causes..."></textarea>
                        </div>
                        <button type="submit" className="generate-btn" disabled={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate Lesson Plan'}
                        </button>
                    </form>
                </div>

                <div className="planner-output-section">
                    {isLoading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Creating your lesson plan...</p>
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}

                    {/* --- UPDATED PART --- */}
                    {lessonPlan && !isLoading ? (
                        <div className="generated-plan"> {/* Wrapper for your CSS styles */}
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {lessonPlan}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        !isLoading && <div className="placeholder-text">Your generated lesson plan will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonPlanner;