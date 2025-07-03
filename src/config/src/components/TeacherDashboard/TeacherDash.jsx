import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './teacherdash.css';

// --- SVG Icons ---
// Using a map to dynamically render icons is an excellent practice.
// For a larger project, you might consider a library like `react-icons` if the
// names (e.g., "FaClipboardList") directly match the library's export names.
// Your current approach with inline SVGs is perfectly fine and self-contained.
const icons = {
    FaClipboardList: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M336 64h-80c0-35.3-28.7-64-64-64s-64 28.7-64 64H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM192 40c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24zm128 392c0 4.4-3.6 8-8 8H72c-4.4 0-8-3.6-8-8v-16c0-4.4 3.6-8 8-8h240c4.4 0 8 3.6 8 8v16zm0-64c0 4.4-3.6 8-8 8H72c-4.4 0-8-3.6-8-8v-16c0-4.4 3.6-8 8-8h240c4.4 0 8 3.6 8 8v16zm0-64c0 4.4-3.6 8-8 8H72c-4.4 0-8-3.6-8-8v-16c0-4.4 3.6-8 8-8h240c4.4 0 8 3.6 8 8v16z"></path></svg>,
    FaPencilRuler: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M64 32C46.3 32 32 46.3 32 64v384c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32H64zM240 160c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48s21.5-48 48-48zm-48 96c0 26.5 21.5 48 48 48s48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48z"></path></svg>,
    FaComments: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M576 240c0 115-129 208-288 208-48.3 0-93.9-8.6-133.4-25.1-14.9-6.2-31.4-2.5-42.6 7.6L64 464c-8.9 8-22.1 7.2-30.1-1.7s-7.2-22.1 1.7-30.1l36.9-35.8c6.9-6.7 9.8-16.1 8.2-25.4C71.3 344.1 64 317.4 64 288 64 128.2 192.2 0 352 0s224 128.2 224 288zM352 128c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-128 0c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"></path></svg>,
    FaSearch: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path></svg>,
    FaSitemap: () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 224c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96zM384 128c0 53-43 96-96 96s-96-43-96-96s43-96 96-96s96 43 96 96zM224 320c-79.5 0-144 64.5-144 144v16c0 17.7 14.3 32 32 32h224c17.7 0 32-14.3 32-32v-16c0-79.5-64.5-144-144-144zM544 320H416c-17.7 0-32 14.3-32 32v144c0 17.7 14.3 32 32 32h128c17.7 0 32-14.3 32-32V352c0-17.7-14.3-32-32-32z"></path></svg>,
};


const BASE_API_URL = "/api/v1";

const TeacherDashboard = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    
    const [teacherName, setTeacherName] = useState('');
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!accessToken) {
            navigate('/login');
            return;
        }

        const fetchDashboardData = async () => {
            setLoading(true);
            setError('');
            const headers = { Authorization: `Bearer ${accessToken}` };
            
            try {
                const [profileResponse, toolsResponse] = await Promise.all([
                    axios.get(`${BASE_API_URL}/teachers/me`, { headers }),
                    axios.get(`${BASE_API_URL}/teachers/dashboard`, { headers })
                ]);

                if (profileResponse.data?.name) {
                    setTeacherName(profileResponse.data.name);
                }

                if (toolsResponse.data) {
                    setTools(toolsResponse.data);
                }

            } catch (err) {
                console.error("Error fetching teacher dashboard data:", err);
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setError("Authentication failed. Please log in again.");
                    navigate('/login');
                } else {
                    setError("Could not load your dashboard. Please try refreshing the page.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [accessToken, navigate]);

    const handleCardClick = (path) => {
        if (path) {
            navigate(path);
        }
    };
    
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    // Using a wrapper 'teacher-dashboard' for overall layout and background
    return (
        <div className="teacher-dashboard">
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <h1>Welcome back, {teacherName || 'Teacher'}!</h1>
                    <p>Here are your AI-powered tools to assist you today.</p>
                </header>

                {error && <div className="dashboard-error">{error}</div>}
                
                <main className="tools-grid">
                    {tools.map((tool) => {
                        // Fallback icon provides robustness if an icon name from the API is missing
                        const IconComponent = icons[tool.icon] || icons.FaClipboardList; 
                        return (
                            <div key={tool.id} className="tool-card" onClick={() => handleCardClick(tool.path)} tabIndex="0">
                                <div className="tool-icon-wrapper">
                                    <IconComponent />
                                </div>
                                <div className="tool-card-content">
                                    <h2 className="tool-title">{tool.title}</h2>
                                    <p className="tool-description">{tool.description}</p>
                                </div>
                                <div className="tool-card-footer">
                                    <span>Open Tool &rarr;</span>
                                </div>
                            </div>
                        );
                    })}
                </main>
            </div>
        </div>
    );
};

export default TeacherDashboard;