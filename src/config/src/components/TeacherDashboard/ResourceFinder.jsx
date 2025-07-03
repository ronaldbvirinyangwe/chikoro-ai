import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { create } from 'zustand';
import { useAuth } from '../../context/AuthContext';
import './ResourceFinder.css'; // This will be the corresponding CSS file

// --- SVG Icon for the links ---
const FaExternalLinkAlt = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z"></path></svg>;


// --- Zustand Store for the Resource Finder ---
const useResourceFinderStore = create((set, get) => ({
    // --- State ---
    formData: {
        topic: '',
        grade: ''
    },
    resources: [], // Will hold the array of resource objects
    isLoading: false,
    error: '',

    // --- Actions ---
    setFormField: (field, value) => {
        set(state => ({
            formData: { ...state.formData, [field]: value }
        }));
    },

    findResources: async (accessToken) => {
        const { formData } = get();
        if (!formData.topic || !formData.grade) {
            set({ error: 'Topic and Grade are required fields.' });
            return;
        }

        set({ isLoading: true, error: '', resources: [] });

        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.post('/api/v1/teacher-tools/find-resources', formData, { headers });
            
            if (response.data?.resources) {
                set({ resources: response.data.resources, isLoading: false });
            } else {
                throw new Error("Received an invalid response format from the server.");
            }

        } catch (err) {
            console.error("Error finding resources:", err);
            const errorMessage = err.response?.data?.error || "An error occurred while finding resources.";
            set({ error: errorMessage, isLoading: false });
        }
    },
    
    reset: () => {
        set({
            formData: { topic: '', grade: '' },
            resources: [],
            isLoading: false,
            error: ''
        });
    }
}));


// --- React Component ---
const ResourceFinder = () => {
    const { 
        formData, 
        resources, 
        isLoading, 
        error, 
        setFormField, 
        findResources,
        reset
    } = useResourceFinderStore();
    
    const { accessToken } = useAuth();

    useEffect(() => {
        return () => {
            reset(); // Reset state when the component unmounts
        }
    }, [reset]);

    const handleSubmit = (e) => {
        e.preventDefault();
        findResources(accessToken);
    };

    return (
        <div className="tool-container">
            <nav className="tool-nav">
                <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
            </nav>
            <header className="tool-header">
                <h1>AI Resource Finder</h1>
                <p>Describe a topic, and let the AI find relevant teaching materials from across the web.</p>
            </header>
            
            <div className="resource-finder-content">
                <div className="finder-form-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="topic">Topic</label>
                            <input type="text" id="topic" value={formData.topic} onChange={(e) => setFormField('topic', e.target.value)} placeholder="e.g., The Great Zimbabwe State" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="grade">Grade / Form</label>
                            <input type="text" id="grade" value={formData.grade} onChange={(e) => setFormField('grade', e.target.value)} placeholder="e.g., Form 1" required />
                        </div>
                        <button type="submit" className="generate-btn" disabled={isLoading}>
                            {isLoading ? 'Searching...' : 'Find Resources'}
                        </button>
                    </form>
                </div>

                <div className="finder-output-section">
                    {isLoading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Searching the web and analyzing results...</p>
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}
                    
                    {resources.length > 0 && !isLoading && (
                        <div className="resources-list">
                            {resources.map((resource, index) => (
                                <div key={index} className="resource-card">
                                    <h3 className="resource-title">{resource.title}</h3>
                                    <p className="resource-description">{resource.description}</p>
                                    <a href={resource.link} target="_blank" rel="noopener noreferrer" className="resource-link">
                                        Visit Resource <FaExternalLinkAlt />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}

                    {!resources.length && !isLoading && !error && (
                         <div className="placeholder-text">Found resources will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceFinder;
