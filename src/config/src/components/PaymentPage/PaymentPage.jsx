import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // We still need this for the token
import './PaymentPage.css';

// --- CONFIGURATION ---
const API_BASE_URL = '/api/v1'; // Using proxy
const POLLING_INTERVAL_MS = 8000;
const MAX_POLLING_ATTEMPTS = 8;

const PaymentPage = () => {
    const navigate = useNavigate();
    // We only get the token and basic auth status from context.
    // The subscription logic will be handled locally.
    const { token, isAuthenticated } = useAuth();
    
    // --- LOCAL STATE ---
    const [isVerifying, setIsVerifying] = useState(true); // Manages the initial loading spinner
    const [pageError, setPageError] = useState(''); // For page-level errors
    const [formError, setFormError] = useState(''); // For form-specific errors

    // State for the payment initiation and polling
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('premium');
    const [isSubmitting, setIsSubmitting] = useState(false); // For the form submission button
    const [isPolling, setIsPolling] = useState(false);
    const [pollingAttempts, setPollingAttempts] = useState(0);
    const [instructions, setInstructions] = useState('');

    /**
     * This effect runs ONCE when the component loads.
     * It checks the user's subscription status directly.
     */
    useEffect(() => {
        const verifySubscription = async () => {
            if (!isAuthenticated || !token) {
                // If not logged in, just stop verifying and let the form handle it.
                setIsVerifying(false);
                return;
            }

            try {
                // This API call fetches the student profile for the logged-in user.
                // You need to ensure this endpoint exists on your backend.
                console.log("PaymentPage: Verifying subscription status directly...");
                const response = await axios.get(`${API_BASE_URL}/students/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const student = response.data;
                const sub = student?.subscription;

                if (sub && sub.status === 'paid' && new Date(sub.expirationDate) > new Date()) {
                    // If the subscription is active, redirect immediately.
                    console.log("PaymentPage: Active subscription found. Redirecting...");
                    navigate('/subjectselect', { replace: true });
                } else {
                    // If not active, stop the spinner and show the payment form.
                    setIsVerifying(false);
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    // 404 means no student profile exists, so they need to pay. This is not an error.
                    console.log("PaymentPage: No student profile found, showing payment form.");
                    setIsVerifying(false);
                } else {
                    // Handle other errors, like server being down.
                    console.error("PaymentPage: Error verifying subscription", error);
                    setPageError("Could not verify your subscription status. Please try again later.");
                    setIsVerifying(false);
                }
            }
        };

        verifySubscription();
    }, [isAuthenticated, token, navigate]); // This effect runs only once on load

    // Function to initiate a new payment
    const handlePayment = useCallback(async () => {
        if (!isAuthenticated) {
            setFormError('You must be logged in to make a payment.');
            return;
        }
        if (!/^(07[7-8])[0-9]{7}$/.test(phoneNumber)) {
            setFormError('Please enter a valid Zimbabwe Ecocash number (e.g., 0771234567)');
            return;
        }

        setIsSubmitting(true);
        setFormError('');
        try {
            const response = await axios.post(`${API_BASE_URL}/payments/initiate`, {
                phoneNumber,
                plan: selectedPlan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data?.success) {
                setInstructions(response.data.instructions);
                setPollingAttempts(0);
                setIsPolling(true);
            } else {
                setFormError(response.data.error || 'An unknown error occurred.');
            }
        } catch (err) {
            setFormError(err.response?.data?.error || 'An error occurred while processing the payment.');
        } finally {
            setIsSubmitting(false);
        }
    }, [isAuthenticated, token, phoneNumber, selectedPlan]);
    
    // Function that polls the backend for status updates
    const pollPaymentStatus = useCallback(async () => {
        setPollingAttempts(prev => prev + 1);
        try {
            const response = await axios.get(`${API_BASE_URL}/payments/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success && response.data.status === 'paid') {
                // SUCCESS! Payment is complete.
                setIsPolling(false);
                // Instead of calling the context, we can just navigate away.
                // You could show a success message first before redirecting.
                console.log("Payment confirmed! Redirecting...");
                navigate('/subjectselect', { replace: true });
            }
        } catch (error) {
            console.error('Error polling payment status:', error);
            setFormError('Could not confirm payment status.');
            setIsPolling(false);
        }
    }, [token, navigate]);

    // Effect to manage the polling lifecycle and timeout
    useEffect(() => {
        if (!isPolling) return;
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            setIsPolling(false);
            setFormError('The payment request timed out. Please try again.');
            return;
        }
        const intervalId = setInterval(pollPaymentStatus, POLLING_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isPolling, pollingAttempts, pollPaymentStatus]);

    // --- Main Rendering Logic ---
    const renderContent = () => {
        // Show a full-page spinner while we verify the initial subscription status.
        if (isVerifying) {
            return <div className="payment-status-container"><div className="spinner"></div></div>;
        }
        
        // Show a page-level error if verification failed.
        if (pageError) {
            return <div className="payment-status-container"><p className="error-message">{pageError}</p></div>;
        }

        // Show the polling UI if a payment was just initiated
        if (isPolling) {
            return (
                <div className="payment-status-container">
                    <h2>Check Your Phone</h2>
                    <p className="instructions">{instructions}</p>
                    <p>Please approve the transaction on your mobile device.</p>
                    <div className="spinner"></div>
                    <p className="status-text">Waiting for confirmation... ({pollingAttempts}/{MAX_POLLING_ATTEMPTS})</p>
                </div>
            );
        }

        // Otherwise, show the main payment form.
        return (
            <div className="payment-container">
                <h2>Activate Your Subscription</h2>
                <p className="renew">Choose a plan to get started with full access to Chikoro AI.</p>
                <PaymentForm />
            </div>
        );
    };

    // Helper component for the payment form to keep render logic clean
    const PaymentForm = () => (
        <>
             <div className="plan-options">
                <div className={`plan-card ${selectedPlan === 'basic' ? 'selected' : ''}`} onClick={() => setSelectedPlan('basic')}>
                    <h3>Basic Plan</h3>
                    <p className="price">USD $10</p>
                    <p className="duration">per 30 days</p>
                    <ul className="features">
                        <li className="feature-item">Includes holidays</li>
                        <li className="feature-item">Homework & writing help</li>
                        <li className="feature-none">No advanced problem solving</li>
                    </ul>
                </div>
                <div className={`plan-card ${selectedPlan === 'premium' ? 'selected' : ''}`} onClick={() => setSelectedPlan('premium')}>
                    <h3>Premium Plan</h3>
                    <p className="price">USD $15</p>
                    <p className="duration">per 30 days</p>
                    <ul className="features">
                        <li className="feature-item">Includes holidays</li>
                        <li className="feature-item">Advanced problem solving</li>
                        <li className="feature-item">Unlimited image uploads</li>
                    </ul>
                </div>
            </div>
     
            <form className="payment-form" onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
               <div className="form-group">
                    <label htmlFor="phoneNumber">Ecocash Number</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      placeholder="0771234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                <button type="submit" className={`submit-btn ${isSubmitting ? 'loading' : ''}`} disabled={isSubmitting}>
                    <span className="spinner"></span>
                    <span className="btn-text">{isSubmitting ? 'Processing...' : 'Pay and Activate'}</span>
                </button>
            </form>
            {formError && <p className="error-message">{formError}</p>}
        </>
    );

    return (
        <div className="content">
            <div className="payment-page-container">
                {renderContent()}
            </div>
        </div>
    );
};

export default PaymentPage;