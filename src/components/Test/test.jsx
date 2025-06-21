import React, { useEffect, useCallback, useState } from 'react';
import { create } from 'zustand';
import { useNavigate, Link } from 'react-router-dom';
import { generateTestQuestions, gradeStudentResponses } from '../../config/image_understand';
import Greeting from '../Enrol/Greeting';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from '../Sidebar/sidebar';
import './test.css';

// --- Zustand Store Definition ---
const useTestStore = create((set, get) => ({
  // --- State ---
  test: null,
  answers: [],
  results: null,
 pointsAwarded: 0,
  isLoading: false,
  error: '',
  subject: '',
  gradeLevel: localStorage.getItem('studentGrade') || '5',
  currentQuestionIndex: 0,
  timerSeconds: 0,
  isTimerRunning: false,
  showReview: false,

  // --- Actions ---
  setSubject: (subject) => set({ subject }),
  setError: (error) => set({ error }),
  
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  incrementTimer: () => set(state => ({ timerSeconds: state.timerSeconds + 1 })),

  loadSavedTest: () => {
    const savedState = localStorage.getItem('currentTestState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.test?.questions) {
          set({ ...parsed });
        }
      } catch {
        localStorage.removeItem('currentTestState');
      }
    }
  },

  saveCurrentTest: () => {
    const state = get();
    if (!state.test) return;
    const stateToSave = {
      test: state.test,
      answers: state.answers,
      subject: state.subject,
      gradeLevel: state.gradeLevel,
      currentQuestionIndex: state.currentQuestionIndex,
      timerSeconds: state.timerSeconds,
      isTimerRunning: state.isTimerRunning,
    };
    localStorage.setItem('currentTestState', JSON.stringify(stateToSave));
  },

  generateNewTest: async () => {
    set({ isLoading: true, error: '', test: null, results: null, answers: [], currentQuestionIndex: 0, timerSeconds: 0, showReview: false });
    localStorage.removeItem('currentTestState');
    try {
      const { subject, gradeLevel } = get();
      if (!subject) throw new Error('Please select a subject first.');
      const newTest = await generateTestQuestions({ subject, gradeLevel, numQuestions: 15 });
      if (!newTest?.questions?.length) throw new Error('Invalid test structure received from the server.');
      set({ test: newTest, answers: new Array(newTest.questions.length).fill(''), isLoading: false });
      get().startTimer();
      get().saveCurrentTest();
    } catch (err) {
      console.error("Generate test error:", err);
      set({ error: err.message || 'Failed to generate a new test.', isLoading: false });
    }
  },

  handleAnswerChange: (index, value) => {
    set(state => {
      const newAnswers = [...state.answers];
      newAnswers[index] = value;
      return { answers: newAnswers };
    });
  },

  nextQuestion: () => set(state => ({ currentQuestionIndex: Math.min(state.test.questions.length - 1, state.currentQuestionIndex + 1) })),
  prevQuestion: () => set(state => ({ currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) })),
  toggleReview: () => set(state => ({ showReview: !state.showReview })),

  submitTest: async () => {
    const state = get();
    if (state.isLoading || state.results) return;
    const allAnswered = state.answers.every(answer => answer?.toString().trim() !== '');
    if (!allAnswered) {
        set({ error: 'Please answer all questions before submitting.' });
        return;
    }
    set({ isLoading: true, error: '', showReview: false });
    state.stopTimer();
    try {
      const finalResults = await gradeStudentResponses(state.test, state.answers);
      set({ results: finalResults, pointsAwarded: finalResults.pointsAwarded || 0, isLoading: false });
      localStorage.removeItem('currentTestState');
    } catch (err) {
      console.error('Error in test submission or grading:', err);
      set({ error: err.message || 'An error occurred while submitting your test.', isLoading: false });
    }
  },
}));

// --- React Component ---
const Test = () => {
  const {
    test, answers, results, isLoading, error, subject, setSubject,
    gradeLevel, currentQuestionIndex, timerSeconds, showReview,
    loadSavedTest, pointsAwarded,  saveCurrentTest, generateNewTest, handleAnswerChange,
    submitTest, nextQuestion, prevQuestion, toggleReview, incrementTimer, isTimerRunning, setError
  } = useTestStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => JSON.parse(localStorage.getItem('sidebarCollapsed')) || false
    );


  const toggleMenu = useCallback(() => setMenuVisible(prev => !prev), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const LoadingSpinner = () => ( <div className="loading-spinner" role="status"><div className="spinner"></div></div> );

  useEffect(() => { loadSavedTest(); }, [loadSavedTest]);

  useEffect(() => {
    if (test && !isLoading && !results) {
        const handler = setTimeout(() => saveCurrentTest(), 500);
        return () => clearTimeout(handler);
    }
  }, [answers, currentQuestionIndex, test, isLoading, results, saveCurrentTest]);

  useEffect(() => {
    let timerInterval = null;
    if (isTimerRunning) {
        timerInterval = setInterval(incrementTimer, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isTimerRunning, incrementTimer]);

  // ✅ **FIX:** The problematic useEffect has been moved here to the top level.
  useEffect(() => {
      const checkSidebarState = () => {
          const collapsedState = JSON.parse(localStorage.getItem('sidebarCollapsed')) || false;
          setIsSidebarCollapsed(collapsedState);
      };
      // Note: An interval is inefficient for this. A better solution would be to
      // use a custom hook that listens to 'storage' events. But for a direct fix,
      // this maintains the original logic.
      const interval = setInterval(checkSidebarState, 500);
      return () => clearInterval(interval);
  }, []);

  const handleGenerateClick = useCallback(() => {
    if (!subject) {
        setError('Please select a subject first.');
        return;
    }
    generateNewTest();
  }, [generateNewTest, subject, setError]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // ✅ **FIX:** The renderQuestion function no longer contains any hooks.
  const renderQuestion = (question, index) => {
    const isVisible = showReview || results || index === currentQuestionIndex;
    const visibilityClass = isVisible ? 'is-visible' : '';
    const questionResult = results?.results?.[index];

    return (
      <div key={index} className={`question-result ${showReview || results ? 'show-all-questions' : ''} ${visibilityClass}`}>
        {!showReview && !results && <h3 className="question-number">Question {index + 1}</h3>}
        <h4 id={`question-title-${index}`}>{question.question}</h4>

        {question.type === 'multiple-choice' ? (
          <div className="test-options" role="radiogroup">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className={`option-label ${answers[index] === option ? 'selected' : ''}`}>
                <input type="radio" name={`question-${index}`} value={option} checked={answers[index] === option} onChange={(e) => handleAnswerChange(index, e.target.value)} disabled={isLoading || !!results} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea value={answers[index]} onChange={(e) => handleAnswerChange(index, e.target.value)} placeholder="Type your answer here..." disabled={isLoading || !!results} />
        )}

        {questionResult && (
          <div className="question-feedback-detail">
            <p className="result-feedback">{questionResult.feedback}</p>
            {Array.isArray(questionResult.strengths) && questionResult.strengths.length > 0 && (
              <div className="strengths">
                <strong>Strengths:</strong>
                <ul>
                  {questionResult.strengths.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(questionResult.improvements) && questionResult.improvements.length > 0 && (
              <div className="improvements">
                <strong>Improvements:</strong>
                <ul>
                  {questionResult.improvements.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {question.correctAnswer && (
                <div className="correct-answer">
                    <strong>Correct Answer:</strong> {question.correctAnswer}
                </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`test-home ${darkMode ? 'dark' : ''}`}>
            <Sidebar />

            <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="test-container">
        <div className="test-controls">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="test-select" disabled={isLoading || !!test}>
            <option value="">Select a subject...</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="African History">African History</option>
            <option value="European History">European History</option>
            <option value="Geography">Geography</option>
            <option value="Heritage">Heritage</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Physics">Physics</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Commerce">Commerce</option>
            <option value="Accounting">Accounting</option>
            <option value="Art">Art</option>
            <option value="Music">Music</option>
            <option value="Woodwork">Woodwork</option>
            <option value="Fashion and Fabrics">Fashion and Fabrics</option>
            <option value="Food and Nutrition">Food and Nutrition</option>
            <option value="Family and Religious Studies">Family and Religious Studies</option>
            <option value="Home Economics">Home Economics</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Economics">Economics</option>
            <option value="Business Studies">Business Studies</option>
            <option value="Metal Work">Metal Work</option>
            <option value="Technical Graphics">Technical Graphics</option>
            <option value="Physical Education">Physical Education</option>
          </select>
          <button onClick={handleGenerateClick} className="test-button" disabled={isLoading || !!test || !subject}>
            {isLoading && !test ? <LoadingSpinner /> : 'Generate New Test'}
          </button>
          {test && !isLoading && !results && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset the current test? Your progress will be lost.')) {
                  useTestStore.setState({ test: null, answers: [], results: null, isLoading: false, error: '', currentQuestionIndex: 0, timerSeconds: 0, isTimerRunning: false, showReview: false });
                  localStorage.removeItem('currentTestState');
                }
              }}
              className="test-button reset-button"
              disabled={isLoading}
            >
              Reset Test
            </button>
          )}
        </div>

        {error && <div className="test-error" role="alert">{error}</div>}
        {isLoading && !test && <div className="loading-spinner">Generating test...</div>}

        {test && !results && (
          <div className="test-card slide-in-bottom">
            <div className="test-card-header">
              <h2 className="test-card-title">{test.subject} Test - {gradeLevel}</h2>
              <div className="test-info">
                <span className="time">Time: {formatTime(timerSeconds)}</span>
                <span className="questionno">Question {currentQuestionIndex + 1} of {test.questions.length}</span>
              </div>
            </div>
            <div className="test-card-content">
              {test.questions.map((q, index) => renderQuestion(q, index))}
              {!showReview && (
                <div className="test-navigation">
                  <button onClick={prevQuestion} className="test-button secondary-button" disabled={isLoading || currentQuestionIndex === 0}>Previous</button>
                  {currentQuestionIndex < test.questions.length - 1
                        ? <button onClick={nextQuestion} className="test-button primary-button" disabled={isLoading}>Next</button>
                        : <button onClick={toggleReview} className="test-button primary-button" disabled={isLoading || answers.some(a => !a)}>Review Answers</button>
                    }
                </div>
              )}
              {showReview && (
                <>
                  <button className="test-button submit-button" onClick={submitTest} disabled={isLoading}>Submit Final Answers</button>
                  <button className="test-button secondary-button" onClick={toggleReview} disabled={isLoading}>Back to Test</button>
                </>
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="test-results slide-in-bottom">
            <div className="results-header">
              <h2 className="results-title">Test Results</h2>
            </div>
            <div className="results-content">
              <div className="results-summary">
                <div className="overall-score">Overall Score: {results.summary.overallScore}%</div>
 {pointsAwarded > 0 && (
                  <div className="points-notification">
                      You earned {pointsAwarded} points! ✨
                  </div>
              )}
                <p className="summary-feedback">{results.summary.feedback}</p>
                {Array.isArray(results.summary.strengths) && results.summary.strengths.length > 0 && (
                  <div className="strengths">
                    <strong>Key Strengths:</strong>
                    <ul>{results.summary.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                )}
                 {Array.isArray(results.summary.improvements) && results.summary.improvements.length > 0 && (
                  <div className="improvements">
                    <strong>Areas for Improvement:</strong>
                    <ul>{results.summary.improvements.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                )}
                 {Array.isArray(results.summary.recommendations) && results.summary.recommendations.length > 0 && (
                  <div className="recommendations">
                    <strong>Recommendations:</strong>
                    <ul>{results.summary.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                )}
              </div>
              <h3 className="breakdown-title">Question Breakdown</h3>
              <div className="results-details">
                {test.questions.map((q, index) => renderQuestion(q, index))}
              </div>
            </div>
          </div>
        )}
     </div>
            </main>
        </div>
  );
};

export default Test;