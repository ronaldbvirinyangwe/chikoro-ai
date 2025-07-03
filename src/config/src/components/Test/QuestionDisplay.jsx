// src/components/QuestionDisplay.jsx (New Component)
import React from 'react';
import './test.css'; // Assuming you'll enhance this CSS

// Basic styling, expand in your CSS file
const questionStyle = { marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' };
const labelStyle = { display: 'block', margin: '5px 0' };

export default function QuestionDisplay({ questions, answers, onAnswerChange, isSubmitting }) {
  return (
    <form className="test-questions-form">
      {questions.map((q, index) => (
        <div key={q.id || `q-${index}`} className="question-item" style={questionStyle}>
          <h4>{index + 1}. {q.question}</h4>
          {q.image && <img src={q.image} alt={`Question ${index + 1} context`} style={{maxWidth: '100%', maxHeight: '200px', marginBottom: '10px'}} />}

          {q.type === 'multiple-choice' && q.options && (
            <div className="options-group">
              {q.options.map((option, optIndex) => (
                <label key={optIndex} style={labelStyle}>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={typeof option === 'object' ? option.value : option} // Handle simple strings or {text, value}
                    checked={(typeof option === 'object' ? option.value : option) === answers[index]}
                    onChange={(e) => onAnswerChange(index, e.target.value)}
                    disabled={isSubmitting}
                  /> {typeof option === 'object' ? option.text : option}
                </label>
              ))}
            </div>
          )}

          {q.type === 'short-answer' && (
            <textarea
              value={answers[index] || ''}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              placeholder="Your answer..."
              rows="3"
              disabled={isSubmitting}
              style={{width: '90%', padding: '8px'}}
            />
          )}
          {/* Add more question types like 'fill-in-the-blank', 'matching' etc. */}
        </div>
      ))}
    </form>
  );
}