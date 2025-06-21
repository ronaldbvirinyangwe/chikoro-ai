import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // Don't forget to import axios!

const BASE_API_URL = '/api/v1';

const Greeting = () => {
    const { user, isAuthenticated, accessToken, loading: authLoading, logout } = useAuth();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true); // Added loading state for the fetch
    const [error, setError] = useState(null);     // Added error state for the fetch


    useEffect(() => {
        const fetchUserProfile = async () => {
            if (authLoading) return; // Wait until auth loading is complete

            if (!isAuthenticated || !user?.email) {
                // If not authenticated, or user email is missing, don't try to fetch profile
                setError("You must be logged in to view this profile.");
                setLoading(false);
                setStudent(null); // Ensure student is null if not authenticated
                return;
            }

            const userEmail = user.email.toLowerCase();
            setLoading(true);
            setError(null);

            try {
                console.log(`Greeting.jsx: Attempting to fetch profile for: ${userEmail}`); // Adjusted log message
                const response = await axios.get(`${BASE_API_URL}/students/by-email/${userEmail}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (response.data) {
                    setStudent(response.data);
                } else {
                    setError("No student data found for this user.");
                    setStudent(null);
                }
            } catch (err) {
                console.error("Greeting.jsx: Error fetching student profile:", err); // Adjusted log message
                setStudent(null); // Ensure student is null on error
                if (err.response) {
                    if (err.response.status === 404) {
                        setError("Student profile not found. Have you enrolled yet?");
                        navigate('/enrol'); // Guide user to the enrollment page
                    } else if (err.response.status === 401 || err.response.status === 403) {
                        setError("Session expired or unauthorized. Please log in again.");
                        logout();
                    } else {
                        setError(err.response.data.error || `Server error: ${err.response.status}`);
                    }
                } else {
                    setError("Network error: Could not connect to the server.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [authLoading, isAuthenticated, user, accessToken, navigate, logout]);

    // Handle loading and error states for a better user experience
    if (loading) {
        return <div>...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>; // Or display a more user-friendly error
    }

    return (
        <div>
            {/* Conditional rendering for student name */}
            <h1>{student ? student.name : 'Guest'}</h1>
        </div>
    );
};

export default Greeting;