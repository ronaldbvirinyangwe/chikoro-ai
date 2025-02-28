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
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth(); // Use the token and authentication state from context

  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
  const THIRTY_DAYS_MS = 150 * ONE_DAY_MS; // 150 days in milliseconds

  // Check if payment status token exists and is not expired
  const checkPaymentStatus = () => {
    const storedToken = localStorage.getItem('paymentToken');
    if (storedToken) {
      const { status, expirationDate } = JSON.parse(storedToken);
      const currentDate = new Date().getTime();
      if (currentDate < expirationDate) {
        setPaymentStatus(status);
        return;
      } else {
        setPaymentStatus('expired');
      }
    } else {
      setPaymentStatus('notPaid');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const validatePhoneNumber = (number) => {
    // Basic Zimbabwe phone number validation (ecocash)
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
      const response = await axios.post('/bhadhara', { phoneNumber }, {
        headers: { Authorization: `Bearer ${token}` }, // Use the token from context
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
      const response = await axios.post('/check-payment-status', { pollUrl }, {
        headers: { Authorization: `Bearer ${token}` }, // Correct template literal
      });

      if (response.data.success) {
        setPaymentStatus('paid');
        const expirationDate = new Date().getTime() + THIRTY_DAYS_MS;
        const paymentToken = { status: 'paid', expirationDate };
        localStorage.setItem('paymentToken', JSON.stringify(paymentToken));
        navigate('/enrol'); // Redirect to home after payment success
      } else {
        setPaymentStatus('failed');
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
      setError('Error checking payment status');
    }
  };

  const handleSuccessfulPayment = () => {
    // Logic when payment is successful
    console.log('Payment successful!');
    navigate('/enrol'); 
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkPaymentStatus(); // Check payment status if authenticated
    } else {
      navigate('/login'); // Redirect to login if not authenticated
    }
  }, [isAuthenticated]);

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
      navigate('/enrol'); 
    }
  }, [paymentStatus, navigate]);

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
        ) : (
          <div className="payment-container">
            <header className="payment-header">
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>
            <div className="plan-selector">
              <h2>Choose Your Plan</h2>
              <div className="plan-options">
                <div className="plan-card selected">
                  <h3>Term Plan</h3>
                  <p className="price">USD $10</p>
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
                  {loading ? 'Processing...' : 'Subscribe (USD $10)'}
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
