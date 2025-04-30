import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PaymentPage.css';

const PaymentPage = () => {
  const [instructions, setInstructions] = useState('');
  const [pollUrl, setPollUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium'); // Default to premium plan
  const navigate = useNavigate();
  const { token, isAuthenticated, updateSubscriptionStatus, resetTrialMessages } = useAuth();
  const [studentId, setStudentId] = useState(localStorage.getItem('studentId'));

  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
  const THIRTY_DAYS_MS = 150 * ONE_DAY_MS; // 150 days in milliseconds
  const WARNING_THRESHOLD_MS = 7 * ONE_DAY_MS; // 7 days warning threshold

  const getNextMay12Expiration = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Create May 12th of current year
    const may12 = new Date(currentYear, 4, 12); // Months are 0-indexed (4 = May)
    
    // If current date is after May 12th, use next year
    if (now > may12) {
      may12.setFullYear(currentYear + 1);
    }
    
    return may12.getTime();
  };

  const checkPaymentStatus = async () => {
    if (!isAuthenticated || !token) {
      setPaymentStatus('notAuthenticated');
      return { valid: false, message: 'Not authenticated' };
    }

    setPaymentChecking(true);
    
    try {
      const response = await axios.get(`https://chikoro-ai.com/payment-status/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      });
  
      // Reset states when checking payment again
      setError('');
      
      if (response.data && response.data.paymentToken) {
        const { status, expirationDate, plan } = response.data.paymentToken;
        const currentDate = new Date().getTime();
        
        // Update the plan if it exists in the response
        if (plan) {
          setSelectedPlan(plan);
        }
        
        // Check if payment is expired
        if (currentDate >= expirationDate) {
          setPaymentStatus('expired');
          return { valid: false, message: 'Payment expired' };
        }
        
        // Check if payment is about to expire
        if (currentDate > expirationDate - WARNING_THRESHOLD_MS) {
          setPaymentStatus('expiringSoon');
          return { valid: true, message: 'Payment expiring soon', daysLeft: Math.ceil((expirationDate - currentDate) / ONE_DAY_MS) };
        }
        
        // Valid payment
        setPaymentStatus(status);
        return { valid: true, message: 'Payment valid', status };
      } else {
        // No payment token found
        setPaymentStatus('notPaid');
        return { valid: false, message: 'No payment found' };
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      const errorMessage = error.response?.data?.error || 'Unknown error checking payment status';
      setError(errorMessage);
      setPaymentStatus('error');
      return { valid: false, message: errorMessage };
    } finally {
      setPaymentChecking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^(07[7-8])[0-9]{7}$/;
    return phoneRegex.test(number);
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      setError('You are not logged in. Please log in first.');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Zimbabwe mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/bhadhara', { 
        phoneNumber, 
        plan: selectedPlan 
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000, // 30 second timeout
      });

      if (response.data && response.data.instructions) {
        setInstructions(response.data.instructions);
        setPollUrl(response.data.pollUrl);
        setPaymentStatus('initiated');
      } else if (response.data && response.data.error) {
        setError(response.data.error);
      } else {
        setError('Unknown error occurred');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'An error occurred while processing the payment.');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async () => {
    if (!pollUrl || !isAuthenticated) {
      setError('Token or Poll URL missing');
      return;
    }

    try {
      const response = await axios.post('/check-payment-status', { 
        pollUrl,
        plan: selectedPlan 
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.success) {
        setPaymentStatus('paid');
        const expirationDate = getNextMay12Expiration();

        const paymentToken = { 
          status: 'paid', 
          expirationDate,
          plan: selectedPlan,
          studentId 
        };
        
        await savePaymentToStudent(paymentToken); 
        
        updateSubscriptionStatus(expirationDate, selectedPlan);
        resetTrialMessages();
        navigate('/subjectselect');
      } else {
        setPaymentStatus('failed');
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
      setError(error.response?.data?.error || 'Error checking payment status');
    }
  };
  
  const savePaymentToStudent = async (paymentToken) => {
    if (!paymentToken) {
      console.error('No payment token provided to savePaymentToStudent');
      return;
    }
    
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        console.error('No student ID found in localStorage');
        return;
      }
      
      const BASE_API_URL = 'https://chikoro-ai.com'; 
      
      await axios.post(`${BASE_API_URL}/students/${studentId}/update-payment`, {
        paymentToken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Payment information saved to student record');
    } catch (err) {
      console.error('Failed to save payment to student record:', err);
      // Don't set page error as this is a background operation
    }
  };

  // Refresh payment status periodically
  useEffect(() => {
    if (isAuthenticated && paymentStatus !== 'initiated' && paymentStatus !== 'paid') {
      const statusCheck = async () => {
        await checkPaymentStatus();
      };
      
      statusCheck(); // Initial check
      
      // Refresh payment status every 5 minutes
      const interval = setInterval(statusCheck, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, paymentStatus]);

  useEffect(() => {
    // Start polling when payment is initiated and pollUrl is available
    if (pollUrl && paymentStatus === 'initiated') {
      const interval = setInterval(() => {
        pollPaymentStatus(); // Call polling function every 5 seconds
      }, 5000);

      // Cleanup when payment status changes or when the component unmounts
      return () => clearInterval(interval);
    }
  }, [pollUrl, paymentStatus]);

  useEffect(() => {
    if (paymentStatus === 'paid') {
      resetTrialMessages(); // Ensure counter is cleared
      navigate('/subjectselect'); // Redirect to root route
      localStorage.removeItem('freeTrialMessages'); // Remove from storage
    }
  }, [paymentStatus, navigate, resetTrialMessages]);

  return (
    <div className="content">
      <div className="this-container">
        {paymentStatus === 'initiated' ? (
          <div>
            <h2>Payment Instructions</h2>
            <p>{instructions}</p>
            <p>Please complete the payment on your mobile device.</p>
            <p>Status: Waiting for payment confirmation...</p>
          </div>
        ) : paymentStatus === 'paid' ? (
          <div>
            <h2>Payment Successful</h2>
            <p>Your payment has been confirmed!</p>
            <p>Status: Paid</p>
          </div>
        ) : paymentStatus === 'expired' ? (
          <div>
            <h2>Payment Expired</h2>
            <p>Your payment status has expired. Please make a new payment to continue.</p>
          </div>
        ) : paymentStatus === 'expiringSoon' ? (
          <div>
            <h2>Payment Expiring Soon</h2>
            <p>Your subscription will expire soon. Consider renewing to maintain uninterrupted access.</p>
            <div className="payment-container">
              {/* Payment form here - reused from below */}
              <div className="plan-selector">
                <h2>Renew Your Plan</h2>
                {/* Plan selection cards here */}
                {/* ... */}
              </div>
            </div>
          </div>
        ) : paymentStatus === 'error' ? (
          <div>
            <h2>Payment Status Error</h2>
            <p>There was a problem checking your payment status. Please try again.</p>
            <p className="error-message">{error}</p>
            <button 
              className="retry-btn" 
              onClick={checkPaymentStatus} 
              disabled={paymentChecking}
            >
              {paymentChecking ? 'Checking...' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="payment-container">
            <header className="payment-header">
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>
            <div className="plan-selector">
              <h2>Choose Your Plan</h2>
              <div className="plan-options">
                <div 
                  className={`plan-card ${selectedPlan === 'basic' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('basic')}
                >
                  <h3>Basic Plan</h3>
                  <p className="price">USD $10</p>
                  <p className="duration">1 term</p>
                  <div className="features">
                    <p className="feature-item">✔ Includes holidays</p>
                    <p className="feature-item">✔ Assistance with homework and writing</p>
                    <p className="feature-item">✔ Limited image uploads (5 per day)</p>
                    <p className="feature-item">✖ No advanced problem solving</p>
                    <p className="feature-item">✖ Standard features only</p>
                  </div>
                </div>
                
                <div 
                  className={`plan-card ${selectedPlan === 'premium' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('premium')}
                >
                  <h3>Premium Plan</h3>
                  <p className="price">USD $15</p>
                  <p className="duration">1 term</p>
                  <div className="features">
                    <p className="feature-item">✔ Includes holidays</p>
                    <p className="feature-item">✔ Assistance with homework, writing, problem solving</p>
                    <p className="feature-item">✔ Upload and analyze unlimited pictures per day</p>
                    <p className="feature-item">✔ Early access to new features</p>
                    <p className="feature-item">✔ Automatic access to updates</p>
                  </div>
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
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : `Subscribe (USD $${selectedPlan === 'premium' ? '15' : '10'})`}
                </button>
              </form>
            </div>
            {error && <p className="error-message">Error: {error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;