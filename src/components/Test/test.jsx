import { useState, useEffect } from 'react';
import { generateTestQuestions, gradeStudentResponses } from '../../config/image_understand';
import './test.css';
import { useNavigate, Link } from 'react-router-dom';
import Greeting from '../Enrol/Greeting';
import { useTheme } from '../../context/ThemeContext';

const Test = () => {
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [setGradeLevel] = useState(''); // Added gradeLevel state
  const [menuVisible, setMenuVisible] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const toggleMenu = () => setMenuVisible(prev => !prev);
  const closeMenu = () => setMenuVisible(false);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  // Test structure validation
  const validateTestStructure = (test) => {
    if (!test?.questions?.length) throw new Error('Invalid test structure');
    test.questions.forEach(question => {
      if (!question.type || !question.question) throw new Error('Missing question fields');
      if (question.type === 'multiple-choice' && !question.options?.length) {
        throw new Error('Missing options for multiple-choice question');
      }
    });
    return true;
  };

  // Load saved test from localStorage
  useEffect(() => {
    const savedTest = localStorage.getItem('currentTest');
    if (savedTest) {
      try {
        const parsedTest = JSON.parse(savedTest);
        setTest(parsedTest.test);
        setAnswers(parsedTest.answers);
        setSubject(parsedTest.subject);
        setGradeLevel(parsedTest.gradeLevel || '5'); 
      } catch (error) {
        localStorage.removeItem('currentTest');
      }
    }
  }, []);

  // Generate new test using grade from localStorage
  const generateNewTest = async () => {
    setIsLoading(true);
    try {
      const studentGrade = localStorage.getItem('studentGrade');
      if (!studentGrade) {
        throw new Error('Student grade not found in context');
      }

      const newTest = await generateTestQuestions({
        subject,
        gradeLevel: studentGrade,
        questionTypes: ["multiple-choice", "short-answer"],
        numQuestions: 25
      });
      validateTestStructure(newTest);
      
      setTest(newTest);
      setAnswers(new Array(newTest.questions.length).fill(''));
      setResults(null);
      setError('');
      
      localStorage.setItem('currentTest', JSON.stringify({
        test: newTest,
        answers: new Array(newTest.questions.length).fill(''),
        subject
      }));
    } catch (err) {
      setError(err.message || 'Failed to generate test. Please try again.');
    }
    setIsLoading(false);
  };

  // Handle answer changes
  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    
    localStorage.setItem('currentTest', JSON.stringify({
      test,
      answers: newAnswers,
      subject
    }));
  };

  const handleSubmit = async () => {
    if (answers.some(answer => answer.trim() === '')) {
      setError('Please answer all questions before submitting');
      return;
    }

    setIsLoading(true);
    try {
      const gradingResults = await gradeStudentResponses(test, answers);
      setResults(gradingResults);
      
      // Get student ID from localStorage
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        throw new Error('Student ID not found');
      }
      
      const testData = {
        subject: subject, 
        score: gradingResults.summary.overallScore,
        totalQuestions: test.questions.length,
        date: new Date().toISOString(),
        details: gradingResults
      };
      
      console.log('Saving test results:', testData);
      
      
      const serverUrl = 'https://chikoro-ai.com'; 
      const saveResponse = await fetch(`${serverUrl}/students/${studentId}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('Failed to save test results:', errorText);
        setError(`Failed to save test results: ${saveResponse.status} ${saveResponse.statusText}`);
        // Don't return - show the results anyway
      } else {
        setError('');
        localStorage.removeItem('currentTest');
      }
    } catch (err) {
      console.error('Error in test submission:', err);
      setError('Error grading test. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="home">
        <header className={`l-header ${darkMode ? 'dark' : ''}`}>
          <nav className="nav bd-grid">
          <Link to="/subjectselect" className="nav__logo">
            <Greeting />
          </Link>

  
               <div className={`nav__menu ${menuVisible ? 'show' : ''}`} id="nav-menu">
            <ul className="nav__list">
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/discover')}>Discover</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/test')}>Test</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/papers')}>Exam Papers</a> {/* Use navigate */}
              </li>
              <li className="nav__item">
                <a className="nav__link" onClick={() => navigate('/reports')}>Reports</a> {/* Use navigate */}
              </li>
            </ul>
          </div>
            <link href='https://cdn.jsdelivr.net/npm/boxicons@2.0.5/css/boxicons.min.css' rel='stylesheet' />
            <div className="nav__toggle" id="nav-toggle"onClick={toggleMenu}>
              <i className='bx bx-menu'></i>
            </div>
          </nav>
        </header>

      <main className="test-container">
        <div className="test-controls">
        <select
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  className="test-select"
  disabled={isLoading}
>
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
          <button
            onClick={generateNewTest}
            className="test-button"
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner /> : 'New Test'}
          </button>
        </div>


        {error && <div className="test-error">{error}</div>}

        {test && (
          <div className="test-card">
            <div className="test-card-header">
              <h2 className="test-card-title">
                {test.subject} Test  {test.gradeLevel}
              </h2>
            </div>
            <div className="test-card-content">
              {test.questions.map((question, index) => (
                <div key={index} className="test-question">
                  <h3>Question {index + 1}: {question.question}</h3>
                  
                  {question.type === 'multiple-choice' ? (
                    <div className="test-options">
                      {question.options.map((option, optionIndex) => (
                        <label key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            checked={answers[index] === option}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            className="form-radio"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="w-full p-2 border rounded-md"
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                    />
                  )}
                </div>
              ))}

              {!results && (
                <button
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? <LoadingSpinner /> : 'Submit Test'}
                </button>
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="test-results">
            <div className="results-header">
              <h2 className="results-title">Test Results</h2>
            </div>
            <div className="results-content">
               <div className="results-summary">
              <h3>Overall Score: {results.summary.overallScore}%</h3>
              <p>{results.summary.feedback}</p>
            </div>

              <div className="results-details">
                {results.results.map((result, index) => (
                  <div key={index} className="question-result">
                    <h4>Question {index + 1} Feedback</h4>
                    <p className="result-feedback">{result.feedback}</p>
                    
                    {result.strengths && (
                      <div className="strengths">
                        <strong>Strengths:</strong>
                        <ul>
                          {result.strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.improvements && (
                      <div className="improvements">
                        <strong>Areas for Improvement:</strong>
                        <ul>
                          {result.improvements.map((improvement, i) => (
                            <li key={i}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Test;