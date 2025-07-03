// src/components/PomodoroTimer.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './pomodoro.css'; // Assuming you'll enhance this CSS

// Mock gamification functions (replace with actual API calls or state management later)
const logPomodoroCompletion = async (task, durationMinutes) => {
  console.log(`Pomodoro for task "${task}" completed in ${durationMinutes} mins.`);
  // In a real app: await api.post('/user/progress', { type: 'pomodoro', task, duration });
  // awardPoints(10); updateStreak(); checkForBadges();
};

export default function PomodoroTimer({
  defaultFocusMinutes = 25,
  defaultShortBreakMinutes = 5,
  defaultLongBreakMinutes = 15,
  cyclesBeforeLongBreak = 4,
  onFocusSessionEnd, // Callback when a focus session ends, passes { task, cycles }
  onBreakSessionEnd,  // Callback when a break session ends
}) {
  // Load saved state or use defaults
  const loadInitialState = () => {
    const saved = JSON.parse(localStorage.getItem('pomodoroState') || '{}');
    return {
      config: {
        focus: (saved.config?.focus || defaultFocusMinutes) * 60,
        shortBreak: (saved.config?.shortBreak || defaultShortBreakMinutes) * 60,
        longBreak: (saved.config?.longBreak || defaultLongBreakMinutes) * 60,
      },
      timeLeft: saved.timeLeft ?? (saved.config?.focus || defaultFocusMinutes) * 60,
      isActive: saved.isActive ?? false,
      cycles: saved.cycles ?? 0,
      isBreak: saved.isBreak ?? false,
      currentTask: saved.currentTask ?? '',
      pomodorosToday: saved.pomodorosToday ?? 0, // For daily streaks/goals
    };
  };

  const [timerState, setTimerState] = useState(loadInitialState);
  const { config, timeLeft, isActive, cycles, isBreak, currentTask, pomodorosToday } = timerState;
  const intervalRef = useRef(null);

  // Persist state
  useEffect(() => {
    localStorage.setItem('pomodoroState', JSON.stringify({
      ...timerState,
      // Store minutes in config for easier display/editing
      config: {
        focus: config.focus / 60,
        shortBreak: config.shortBreak / 60,
        longBreak: config.longBreak / 60,
      }
    }));
  }, [timerState, config]);

  const handleSessionTransition = useCallback(() => {
    clearInterval(intervalRef.current);
    setTimerState(prev => {
      const nextIsBreak = !prev.isBreak;
      let newCycles = prev.cycles;
      let nextTime;

      if (!prev.isBreak) { // Focus session just ended
        newCycles += 1;
        logPomodoroCompletion(prev.currentTask, prev.config.focus / 60);
        onFocusSessionEnd?.({ task: prev.currentTask, cycles: newCycles });

        if (newCycles % cyclesBeforeLongBreak === 0) {
          nextTime = prev.config.longBreak;
        } else {
          nextTime = prev.config.shortBreak;
        }
      } else { // Break session just ended
        nextTime = prev.config.focus;
        onBreakSessionEnd?.();
      }
      return {
        ...prev,
        isActive: false, // Or true if you want auto-start
        isBreak: nextIsBreak,
        cycles: newCycles,
        timeLeft: nextTime,
        pomodorosToday: !prev.isBreak ? prev.pomodorosToday + 1 : prev.pomodorosToday,
      };
    });
  }, [onFocusSessionEnd, onBreakSessionEnd, cyclesBeforeLongBreak]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleSessionTransition();
      // Add sound notification here: playSound(isBreak ? 'break-start.mp3' : 'focus-start.mp3');
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft, handleSessionTransition]);

  const toggleTimer = () => {
    setTimerState(prev => ({ ...prev, isActive: !prev.isActive }));
    if (!isActive && timeLeft === 0) { // Restarting a completed session
        handleSessionTransition(); // Will set the correct next state
    }
  };

  const resetCurrentSession = () => {
    clearInterval(intervalRef.current);
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      timeLeft: prev.isBreak
        ? (prev.cycles % cyclesBeforeLongBreak === 0 ? prev.config.longBreak : prev.config.shortBreak)
        : prev.config.focus,
    }));
  };

  const skipToNextSession = () => {
    handleSessionTransition();
  }

  const handleConfigChange = (type, value) => {
    const newDurationMinutes = parseInt(value, 10);
    if (isNaN(newDurationMinutes) || newDurationMinutes <= 0) return;

    setTimerState(prev => {
      const newConfig = { ...prev.config, [type]: newDurationMinutes * 60 };
      let newTimeLeft = prev.timeLeft;
      // If not active and changing current session type, update timeLeft
      if (!prev.isActive) {
        if (type === 'focus' && !prev.isBreak) newTimeLeft = newConfig.focus;
        else if (type === 'shortBreak' && prev.isBreak && prev.cycles % cyclesBeforeLongBreak !== 0) newTimeLeft = newConfig.shortBreak;
        else if (type === 'longBreak' && prev.isBreak && prev.cycles % cyclesBeforeLongBreak === 0) newTimeLeft = newConfig.longBreak;
      }
      return { ...prev, config: newConfig, timeLeft: newTimeLeft };
    });
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="pomodoro-timer-enhanced">
      <h3>{isBreak ? `Break 🧘 (${cycles % cyclesBeforeLongBreak === 0 && cycles !== 0 ? 'Long' : 'Short'})` : `Focus on: ${currentTask || 'Your Goal'} 🚀`}</h3>
      <div className="pomodoro-time-display">{formatTime(timeLeft)}</div>
      {!isBreak && !isActive && (
        <input
          type="text"
          value={currentTask}
          onChange={(e) => setTimerState(prev => ({ ...prev, currentTask: e.target.value }))}
          placeholder="What are you focusing on?"
          className="pomodoro-task-input"
        />
      )}
      <div className="pomodoro-controls">
        <button onClick={toggleTimer}>{isActive ? 'Pause' : 'Start'}</button>
        <button onClick={resetCurrentSession}>Reset</button>
        <button onClick={skipToNextSession}>Skip</button>
      </div>
      <div className="pomodoro-stats">
        <p>Pomodoros Completed: {cycles}</p>
        <p>Today: {pomodorosToday}</p>
        {/* Add more gamified stats here: streaks, next badge goal, etc. */}
      </div>
      <details className="pomodoro-settings">
        <summary>Timer Settings (minutes)</summary>
        <div><label>Focus: <input type="number" value={config.focus / 60} onChange={e => handleConfigChange('focus', e.target.value)} /></label></div>
        <div><label>Short Break: <input type="number" value={config.shortBreak / 60} onChange={e => handleConfigChange('shortBreak', e.target.value)} /></label></div>
        <div><label>Long Break: <input type="number" value={config.longBreak / 60} onChange={e => handleConfigChange('longBreak', e.target.value)} /></label></div>
      </details>
    </div>
  );
}