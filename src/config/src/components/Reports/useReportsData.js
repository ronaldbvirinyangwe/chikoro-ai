import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api/v1';

// This custom hook manages all data fetching for the Reports page.
export const useReportsData = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [gamificationData, setGamificationData] = useState(null);
    const [completedTests, setCompletedTests] = useState([]);
    const [progressMetrics, setProgressMetrics] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError('');

            const profileId = localStorage.getItem("profileId");
            const token = localStorage.getItem("accessToken");

            if (!profileId || !token) {
                setError("Authentication details are missing. Please log in again.");
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            try {
                // ✅ PERFORMANCE FIX: Run all independent API calls in parallel
                const [
                    gamificationResponse,
                    testsResponse,
                    progressResponse,
                    leaderboardResponse
                ] = await Promise.all([
                    axios.get(`${API_BASE_URL}/students/${profileId}/gamification`, { headers }),
                    axios.get(`${API_BASE_URL}/students/${profileId}/tests`, { headers }),
                    axios.get(`${API_BASE_URL}/students/${profileId}/progress`, { headers }),
                    axios.get(`${API_BASE_URL}/leaderboard`) // Assuming this is a public endpoint
                ]);

                // Set all state with the data from the parallel calls
                setGamificationData(gamificationResponse.data || { badges: [] });
                setCompletedTests(Array.isArray(testsResponse.data) ? testsResponse.data : []);
                setProgressMetrics(progressResponse.data || { chatHistory: {} });
                setLeaderboard(leaderboardResponse.data || []);
                
            } catch (err) {
                console.error("Failed to fetch reports data:", err);
                setError("Failed to load reports data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []); // Empty dependency array means this runs once on mount

    // Return all the state and a function to refetch if needed
    return { loading, error, gamificationData, completedTests, progressMetrics, leaderboard };
};
