// src/components/TestTimer.jsx (New Component for the test's own timer)
import { useState, useEffect, useRef } from 'react';
import './test.css'; // Assuming you'll enhance this CSS

export default function TestTimer({ durationSeconds, onTimeUp, isTestActive }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Reset timer if duration changes (e.g. new test with different time limit)
    // or if the test becomes inactive and then active again (e.g. resuming a test)
    setTimeLeft(durationSeconds);
  }, [durationSeconds, isTestActive]);


  useEffect(() => {
    if (!isTestActive) { // If test is not active (e.g. submitted, or not started)
        clearInterval(intervalRef.current);
        return;
    }

    if (timeLeft <= 0) {
      clearInterval(intervalRef.current);
      onTimeUp();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timeLeft, onTimeUp, isTestActive]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="test-timer-display">
      Time Remaining: <strong>{formatTime(timeLeft)}</strong>
      {timeLeft <= 60 && timeLeft > 0 && <span style={{color: 'red', marginLeft: '10px'}}>Low time!</span>}
    </div>
  );
}