import {
    GoogleGenerativeAI,
  } from "@google/generative-ai";
  
  const apiKey = "AIzaSyD4P_J74Atw1xJuAezcyne1K4b9_BYSpHM" || "AIzaSyDbcUbqLunVJXPPyMl7Y-GQAHOJZdyg460" || "AIzaSyDFtne0AocIQg0SSnXxKQa-HaPScej6HVI" || "AIzaSyDgjfLk1DJFm-rZtA5mkNWjRk4vsIyO_iI";  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const BASE_API_URL = 'https://atqtuew6syxese-4173.proxy.runpod.net';
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
  const MODEL_FALLBACK_ORDER = [
     "gemini-2.0-flash",
     "gemini-2.0-flash-lite",
];
  
  const generationConfig = {
    temperature: 0.3,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };
  
  let conversationHistory = [
    { role: "user", parts: [{ text: "hesi" }] },
    { role: "model", parts: [{ text: "Hesi! 😊 Ndokubatsira nei nhasi? \n" }] },
  ];
  
  
  const encodeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(",")[1]; // Extract base64 data (excluding data URL header)
        resolve(base64Image);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  
  
  async function authenticateStudent(name) {
    try {
       const response = await fetch(`${BASE_API_URL}/students/authenticate/${name}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const studentData = await response.json();
      
      const studentId = studentData._id;
  
      localStorage.setItem('studentId', studentId);
  
      return studentId; 
    } catch (error) {
      console.error("Error authenticating student:", error);
      return null;
    }
  }
  
  // Function to fetch search results 
  async function fetchSearchResults(prompt, subject) { 
   try {
    // Assuming your authentication token is stored in localStorage after login
    const accessToken = localStorage.getItem('accessToken'); 
    const selectedSubject = localStorage.getItem('selectedSubject');

    if (!accessToken) {
      throw new Error("User not authenticated. Please log in.");
    }

    if (!subject && !selectedSubject) {
      throw new Error("No subject selected.");
    }

    const response = await fetch(`${BASE_API_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Include the authentication token here
      },
      body: JSON.stringify({
        query: prompt,
        // Remove studentId from the body, as the server will get it from the authenticated user
        subject: subject || selectedSubject,
      }),
    });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Error fetching search results:", error);
      return [];
    }
  }
  
  // Main function

 
export async function runMulti(prompt, file = null,analysisData = null, currentChatHistory = []) {
    // --- LOG 1: What history did runMulti receive? ---
    console.log("RUN_MULTI: Received 'currentChatHistory':", JSON.stringify(currentChatHistory, null, 2));

    const grade = localStorage.getItem('studentGrade') || 'unknown grade';
    const currentSubject = localStorage.getItem('selectedSubject');

    if (!apiKey) {
        console.error("RUN_MULTI: API key missing.");
        return "Sorry, the AI service is currently unavailable.";
    }

    const safeHistory = Array.isArray(currentChatHistory) ? currentChatHistory : [];
    const geminiHistory = safeHistory
        .filter(msg => msg.rawText && (msg.type === 'user' || msg.type === 'bot'))
        .map(msg => ({
            role: msg.type === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.rawText }]
        }));

    // --- LOG 2: What does the formatted history for Gemini look like? ---
    console.log("RUN_MULTI: Formatted 'geminiHistory' for API:", JSON.stringify(geminiHistory, null, 2));

    for (const modelName of MODEL_FALLBACK_ORDER) {
        console.log(`RUN_MULTI: Trying model: ${modelName}`);
        try {
            const currentModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: `
               You are Chikoro AI, a personalised tutor for Zimbabwean students.
                    Current Student Grade: ${grade}
                    Teaching Guidelines:
                    1. Adapt explanations to ${grade} curriculum
                    2. Use examples relevant to Zimbabwean context
                    3. Break concepts into age-appropriate steps
                    4. Mix English/Shona based on question context
                    5. Never give direct answers - guide through Socratic questioning
                    6. Align with ZIMSEC/Cambridge requirements
                    7.Use adaptive learning, if a student doesn't understand a concept reduce the difficulty of the examples.If the student understands a concept increase the difficulty of the examples.
                `,
            });

            // --- LOG 3: What history is being passed to startChat? ---
            console.log("RUN_MULTI: Initializing chatSession with history:", JSON.stringify(geminiHistory, null, 2));
            const chatSession = currentModel.startChat({
                generationConfig,
                history: geminiHistory,
            });

            let result;

            if (file && file.type.startsWith('image/')) {
                console.log("RUN_MULTI: Processing image input...");
                const imageBase64 = await encodeImage(file);
                const imagePart = {
                    inlineData: { data: imageBase64, mimeType: file.type || "image/png" },
                };
                const textPart = { text: prompt };
                // --- LOG 4 (Image Path): What parts are sent with an image? ---
                console.log("RUN_MULTI (Image Path): Sending to Gemini:", JSON.stringify([imagePart, textPart], null, 2));
                result = await chatSession.sendMessage([imagePart, textPart]);

            } else if (file && file.type === 'application/pdf') {
                console.warn("RUN_MULTI: PDF path - sending prompt only to chatSession. Ensure handlePDFRequest is primary PDF handler.");
                // --- LOG 5 (PDF Path): What prompt is sent if it's a PDF (if not handled by handlePDFRequest)? ---
                console.log("RUN_MULTI (PDF Path): Sending prompt to Gemini:", prompt);
                result = await chatSession.sendMessage(prompt);
                
            } else {
                // Text-Only Input
                console.log("RUN_MULTI: Processing text input...");
                const searchResults = await fetchSearchResults(prompt, currentSubject);
                const searchSummary = searchResults.length > 0
                    ? "Search Context:\n" + searchResults.map((res) => `- ${res.snippet}`).join('\n')
                    : "";

                const contextPrompt = `
                    [Grade Level: ${grade}]
                    [Subject: ${currentSubject}]

                    Student Query: "${prompt}"

                    ${searchSummary} 

                    Required:
                    - You are Chikoro AI
                    - Use ${grade}-appropriate vocabulary
                    - Include local examples
                `;
                // --- LOG 6 (Text Path): What is the final prompt sent for text-only? ---
                console.log("RUN_MULTI (Text Path): Sending final prompt to Gemini:", contextPrompt);
                result = await chatSession.sendMessage(contextPrompt);
            }
            
            const responseText = result.response.text();
            console.log(`RUN_MULTI: Success with model ${modelName}. Response snippet:`, responseText.substring(0, 100) + "...");
            return responseText;

        } catch (error) {
            console.error(`RUN_MULTI: Error with model ${modelName}:`, error);
            if (error.message && (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("rate limit") || error.message.includes("candidate.finishReason") || error.message.includes("Invalid model name"))) {
                console.warn(`RUN_MULTI: Model ${modelName} failed/limited. Trying next model...`);
                continue; 
            } else {
                console.error("RUN_MULTI: Non-fallback error, stopping model attempts.");
                return "Sorry, I encountered an issue processing that. Please try again."; 
            }
        }
    }

    console.error("RUN_MULTI: All models failed.");
    return "Sorry, I am currently unable to process your request. Please try again later.";
}
  
  // Helper function to build the message content
  function buildMessageContent(prompt, searchSummary, imageBase64) {
    let messageContent = `${prompt}\n\nSearch results:\n${searchSummary}`;
  
    // Include the image if it exists
    if (imageBase64) {
      messageContent += `\n\nHere is an image for reference: data:image/png;base64,${imageBase64}`;
    }
  
    return messageContent;
  }
  
 // Update conversation history in the database
export async function updateConversationHistory(subject, userMessageObject, modelResponse) {
    // 1. Get the authentication token
    const token = localStorage.getItem('accessToken'); 

    // 2. Perform basic checks before sending
    if (!token) {
        console.error("Authentication token not found. Cannot update history.");
        return; // Stop if no token
    }

    if (!subject) {
        console.error("Subject not found. Cannot update history.");
        return; // Stop if no subject
    }

    if (!userMessageObject || typeof userMessageObject.rawText === 'undefined') {
        console.error("Invalid user message object provided. Cannot update history.", userMessageObject);
        return; // Stop if user message is invalid
    }

    if (typeof modelResponse === 'undefined') {
        console.error("Model response is undefined. Cannot update history.");
        return; // Stop if model response is missing
    }

    // 3. Prepare the data payload for the backend
    const payload = {
        subject: subject,
        userMessage: userMessageObject.rawText, // Send the raw text
        modelResponse: modelResponse,
        attachment: userMessageObject.attachment || null // Send metadata or null
    };

    console.log("Sending to /updateConversation:", payload);

    // 4. Make the API call using fetch
    try {
        const response = await fetch(`${BASE_API_URL}/updateConversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include the token for authentication
            },
            body: JSON.stringify(payload) // Send the prepared data
        });

        // 5. Handle the response
        if (!response.ok) {
            let errorDetails = `Failed to update history (Status: ${response.status})`;
            try {
                // Try to get a specific error message from the backend's JSON response
                const errorData = await response.json();
                errorDetails = errorData.error || errorDetails;
            } catch (e) {
                // If the backend didn't send JSON (e.g., server error HTML), log it.
                console.warn("Could not parse error response as JSON. Response was:", await response.text());
            }
            console.error(errorDetails);
            // You might want to throw an error here or use your setError context function
            // throw new Error(errorDetails);
        } else {
            console.log("Conversation history update sent successfully.");
            // You can optionally parse the success response if your backend sends one
            // const successData = await response.json(); 
            // console.log("Backend response:", successData);
        }

    } catch (error) {
        // Handle network errors or other exceptions during fetch
        console.error("Exception caught while updating conversation history:", error);
        // You might want to signal this error back to the UI
    }
}
  
  
  
  export async function fetchDynamicCards(subject) {

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    try {
      const grade = localStorage.getItem('studentGrade') || 'unknown grade';
      const prompt = `
        Generate 4 learning topics for ${subject} appropriate for ${grade} in Zimbabwe.
        Format requirements:
        - Questions a ${grade} student would ask
        - Use simple language
        - No numbering or bullet points
        - Only show the questions, don't say here are topics formatted
        Example format:
        "How do I solve basic fractions?"
        "What causes the seasons to change?"
      `;
  
      const chatSession = model.startChat({ history: [] });
      const result = await chatSession.sendMessage(prompt);
      
      return result.response.text()
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line);
  
    } catch (error) {
      console.error('Error fetching dynamic cards:', error);
      return [];
    }
  }
  
  const generateStudentSummary = async (student) => {
    try {
      if (!student) {
        throw new Error('No student provided');
      }
  
      let studentDataString = '';
      const { name, age, academicLevel, chatHistory } = student;
  
      // Format the student data
      studentDataString += `Student Name: ${name}\nAge: ${age}\nAcademic Level: ${academicLevel}\n\n`;
  
      if (chatHistory) {
        Object.entries(chatHistory).forEach(([subject, chats]) => {
          studentDataString += `Subject: ${subject}\n`;
          studentDataString += `Chat History:\n`;
  
          chats.forEach(chat => {
            const timestamp = new Date(chat.timestamp).toLocaleString();
            studentDataString += `- ${chat.message} (${timestamp})\n`;
          });
          studentDataString += '\n';
        });
      }
  
      const prompt = `Generate a detailed academic report for this student based on their chat history:\n\n${studentDataString}\n\nInclude:\n1. Strengths\n2. Areas for improvement\n3. Recommended study topics\n4. Overall progress assessment`;
  
      const result = await model.generateContent([prompt]);
      return result.response.text();
    } catch (error) {
      console.error("Error generating student summary:", error);
      return "Error generating summary report.";
    }
  };
  
  export async function submitDrawing(imageData, studentId, subject) {
    try {
      const response = await fetch('https://atqtuew6syxese-4173.proxy.runpod.net/api/drawings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          studentId,
          subject,
          timestamp: new Date().toISOString(),
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error submitting drawing:', error);
      return { success: false, message: 'Failed to submit drawing' };
    }
  }
  
  export async function analyzeMathDrawing(imageData) {
    try {
      const fetchResponse = await fetch(imageData);
      const blob = await fetchResponse.blob();
  
      const file = new File([blob], "math-drawing.png", { type: 'image/png' });
   
      const prompt = "Please analyze this math drawing or equation. Provide the solution if it's a problem, explain the concepts involved, and offer feedback or suggestions for improvement.";
      
      const result = await runMulti(prompt, file);
      return result;
    } catch (error) {
      console.error('Error analyzing math drawing:', error);
      return "Sorry, I couldn't analyze the drawing. Please try again.";
    }
  }
  
  
  
  export async function generateTestQuestions({
    subject,
    gradeLevel,
    questionTypes = ["multiple-choice", "short-answer"],
    numQuestions = 25
  }) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create a more structured prompt that enforces the exact format we want
    const generationPrompt = `
      Create ${numQuestions} ${subject} test questions for grade ${gradeLevel} students.
      Include only these question types: ${questionTypes.join(", ")}.
  
      Requirements:
      - For multiple-choice: exactly 4 options
      - For short-answer: include grading criteria
      - All questions must have clear correct answers
      
      Return ONLY valid JSON in this exact format:
      {
        "subject": "${subject}",
        "gradeLevel": "${gradeLevel}",
        "questions": [
          {
            "type": "multiple-choice",
            "question": "What is 2 + 2?",
            "options": ["3", "4", "5", "6"],
            "correctAnswer": "4"
          },
          {
            "type": "short-answer",
            "question": "Explain photosynthesis.",
            "correctAnswer": "Photosynthesis is the process...",
            "gradingRubric": "1. Mentions sunlight 2. Describes chemical process..."
          }
        ]
      }
      
      Ensure each question follows the exact format for its type.
      Do not include any additional text or formatting - just the JSON object.`;
  
    try {
      const result = await model.generateContent(generationPrompt);
      const responseText = await result.response.text();
      
      // Clean the response to ensure valid JSON
      let cleanedResponse = responseText
        .replace(/```json\s*|\s*```/g, '')  // Remove code blocks
        .replace(/\/\/.*/g, '')             // Remove comments
        .trim();
      
      // Try to parse the JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.log("Invalid JSON:", cleanedResponse);
        throw new Error("Failed to parse AI response as JSON");
      }
      
      // Validate the response structure
      if (!parsedResponse.subject || !parsedResponse.gradeLevel || !Array.isArray(parsedResponse.questions)) {
        throw new Error("Invalid response structure from AI");
      }
  
      // Validate each question
      parsedResponse.questions = parsedResponse.questions.map((question, index) => {
        if (!question.type || !question.question || !question.correctAnswer) {
          throw new Error(`Question ${index + 1} is missing required fields`);
        }
  
        if (question.type === "multiple-choice") {
          if (!Array.isArray(question.options) || question.options.length !== 4) {
            throw new Error(`Question ${index + 1} has invalid options`);
          }
        } else if (question.type === "short-answer") {
          if (!question.gradingRubric) {
            question.gradingRubric = "Evaluate based on accuracy and completeness of the answer";
          }
        } else {
          throw new Error(`Question ${index + 1} has invalid type: ${question.type}`);
        }
  
        return question;
      });
  
      // If we made it here, the response is valid
      return parsedResponse;
  
    } catch (error) {
      console.error("Test generation error:", error);
      
      // Provide a more specific error message
      if (error.message.includes("JSON")) {
        throw new Error("Failed to generate properly formatted test questions. Please try again.");
      } else if (error.message.includes("Question")) {
        throw new Error("Generated questions were invalid. Please try again.");
      } else {
        throw new Error(`Failed to generate test questions: ${error.message}`);
      }
    }
  }
  
  // Helper function to validate multiple choice question
  function validateMultipleChoice(question) {
    return {
      ...question,
      options: question.options?.slice(0, 4) || [], // Ensure exactly 4 options
      type: "multiple-choice"
    };
  }
  
  // Helper function to validate short answer question
  function validateShortAnswer(question) {
    return {
      ...question,
      type: "short-answer",
      gradingRubric: question.gradingRubric || "Evaluate based on accuracy and completeness"
    };
  }
  
  // Example usage:
  /* 
  const test = await generateTestQuestions({
    subject: "Mathematics",
    gradeLevel: "5",
    questionTypes: ["multiple-choice", "short-answer"],
    numQuestions: 3
  });
  
  console.log(test);
  */
  
  export async function gradeStudentResponses(test, studentAnswers) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const gradingResults = [];
  
    for (const [index, question] of test.questions.entries()) {
      const studentAnswer = studentAnswers[index];
  
      if (!studentAnswer) {
        gradingResults.push({
          questionIndex: index,
          error: "No answer provided",
        });
        continue;
      }
  
      // Improved prompt to enforce pure JSON
      const gradingPrompt = `
        Grade this student response. Return ONLY valid JSON in the specified format. Do NOT include markdown, comments, or extra text.
  
        Question: ${question.question}
        Type: ${question.type}
        Student Answer: ${studentAnswer}
        ${
          question.type === "multiple-choice"
            ? `
              Options: ${JSON.stringify(question.options)}
              Correct Answer: ${question.correctAnswer}
              Format: {
                "questionIndex": ${index},
                "isCorrect": "boolean",
                "feedback": "brief explanation"
              }
            `
            : `
              Rubric: ${question.gradingRubric || "Accuracy and completeness"}
              Ideal Answer: ${question.correctAnswer}
              Format: {
                "questionIndex": ${index},
                "score": "number 0-100",
                "feedback": "detailed feedback",
                "strengths": "array of strings",
                "improvements": "array of strings"
              }
            `
        }
  
        Return the response as pure JSON matching the specified format.
      `;
  
      try {
        const result = await model.generateContent(gradingPrompt);
        const responseText = await result.response.text();
  
        let cleanedResponse = responseText
          .replace(/```json\s*|\s*```/g, "") // Remove code blocks
          .replace(/\/\/.*$/gm, "")          // Remove single-line comments
          .replace(/\*\*/g, "")              // Remove bold markers
          .replace(/\*/g, "")                // Remove asterisks
          .replace(/\\n/g, "")               // Remove newline escapes
          .trim();                           // Remove leading/trailing whitespace
  
        // Try parsing the JSON with fallback
        let evaluation;
        try {
          evaluation = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error(`JSON Parse Error for question ${index}:`, parseError);
          console.log("Invalid JSON:", cleanedResponse);
  
          // Fallback: Extract JSON from malformed response
          const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
          if (jsonMatch) {
            try {
              evaluation = JSON.parse(jsonMatch[0]);
            } catch (fallbackError) {
              throw new Error("Failed to extract valid JSON from response");
            }
          } else {
            throw new Error("No valid JSON found in response");
          }
        }
  
        gradingResults.push(evaluation);
      } catch (error) {
        console.error(`Grading error for question ${index}:`, error);
        gradingResults.push({
          questionIndex: index,
          error: `Failed to evaluate response: ${error.message}`,
        });
      }
    }
  
    try {
      const summary = await generateTestSummary(gradingResults);
      return {
        testMeta: {
          subject: test.subject,
          gradeLevel: test.gradeLevel,
          totalQuestions: test.questions.length,
        },
        results: gradingResults,
        summary,
      };
    } catch (error) {
      console.error("Error generating summary:", error);
      return {
        testMeta: {
          subject: test.subject,
          gradeLevel: test.gradeLevel,
          totalQuestions: test.questions.length,
        },
        results: gradingResults,
        summary: {
          error: "Could not generate test summary",
          partialResults: gradingResults,
        },
      };
    }
  }
  
  async function generateTestSummary(gradingResults) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
    // Calculate a basic score for fallback purposes
    let correctCount = 0;
    let totalQuestions = gradingResults.length;
    
    gradingResults.forEach(result => {
      if (result.isCorrect === true || (typeof result.score === 'number' && result.score >= 70)) {
        correctCount++;
      }
    });
    
    const fallbackScore = Math.round((correctCount / totalQuestions) * 100);
  
    // Improved prompt to enforce pure JSON
    const summaryPrompt = `
      Analyze these test results and create a summary:
      ${JSON.stringify(gradingResults, null, 2)}
  
      Return ONLY pure JSON (no markdown, comments, or extra text) in this exact structure:
      {
        "overallScore": 75,
        "strengths": ["Good understanding of concept X", "Strong in Y"],
        "improvements": ["Need to work on Z"],
        "recommendations": ["Review chapter on W"],
        "feedback": "Overall good performance with room for improvement in certain areas."
      }
  
      Required elements:
      - Overall percentage score (calculate based on results)
      - List of strengths
      - List of improvements
      - Recommendations for study
      - General feedback
  
      Ensure valid JSON syntax.
    `;
  
    try {
      const result = await model.generateContent(summaryPrompt);
      const responseText = await result.response.text();
  
      let cleanedResponse = responseText
        .replace(/```json\s*|\s*```/g, "") // Remove code blocks
        .replace(/\/\/.*$/gm, "")          // Remove single-line comments
        .replace(/\*\*/g, "")              // Remove bold markers
        .replace(/\*/g, "")                // Remove asterisks
        .replace(/\\n/g, "")               // Remove newline escapes
        .trim();                           // Remove leading/trailing whitespace
  
      // Try parsing with fallback
      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Summary JSON Parse Error:", parseError);
        console.log("Invalid JSON:", cleanedResponse);
  
        // Fallback: Extract JSON from malformed response
        const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (fallbackError) {
            throw new Error("Failed to extract valid JSON from response");
          }
        } else {
          throw new Error("No valid JSON found in response");
        }
      }
  
      // Fix the structure if needed
      const summary = {
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : fallbackScore,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : "Test completed. Review your answers to improve."
      };
  
      return summary;
    } catch (error) {
      console.error("Summary generation error:", error);
      
      // Return a default summary if all else fails
      return {
        overallScore: fallbackScore,
        strengths: ["Some questions answered correctly"],
        improvements: ["Review the questions you missed"],
        recommendations: ["Study the subject material more thoroughly"],
        feedback: `You scored ${fallbackScore}% on this test. Keep practicing!`
      };
    }
  }
  
export async function fetchHistory(subject) { // subject is the one we want to filter for
    const token = localStorage.getItem('accessToken');
    const studentId = localStorage.getItem('studentId'); // Get studentId, just like the Sidebar does

    // console.log(`[fetchHistory - Same Backend Logic] Called for Subject: "${subject}", Student ID: "${studentId}"`);

    if (!token || !subject || !studentId) { // Check for all necessary items
        console.error("[fetchHistory - Same Backend Logic] Token, subject, or studentId is missing.");
        if (!token) console.error("Missing: token");
        if (!subject) console.error("Missing: subject");
        if (!studentId) console.error("Missing: studentId");
        return [];
    }

    // Use the SAME endpoint as your working Sidebar
    const requestUrl = `${BASE_API_URL}/students/${studentId}`;
    // console.log(`[fetchHistory - Same Backend Logic] Requesting URL: ${requestUrl}`);

    try {
        const response = await fetch(requestUrl, { // Using fetch here; Sidebar used axios but the principle is the same
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // console.log(`[fetchHistory - Same Backend Logic] Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            let errorData = { message: `Server responded with ${response.status}` };
            try {
                errorData = await response.json();
            } catch (e) { /* ignore if error response isn't json */ }
            console.error(`[fetchHistory - Same Backend Logic] API call failed for student ${studentId}:`, errorData);
            throw new Error(errorData.error || errorData.message || `Failed to fetch student data for ID ${studentId}`);
        }

        const studentData = await response.json(); // This should be the same studentData object the Sidebar gets
        // console.log(`[fetchHistory - Same Backend Logic] Full studentData received:`, studentData);

        // Now, extract the history for the specific subject, just like the Sidebar would
        // if it were to look for a specific subject's chats.
        if (studentData && studentData.chatHistory && studentData.chatHistory.hasOwnProperty(subject)) {
            if (Array.isArray(studentData.chatHistory[subject])) {
                // console.log(`[fetchHistory - Same Backend Logic] Extracted history for subject "${subject}". Length: ${studentData.chatHistory[subject].length}`);
                return studentData.chatHistory[subject]; // Return the array of chats for the requested subject
            } else {
                console.warn(`[fetchHistory - Same Backend Logic] chatHistory for subject "${subject}" was found but is not an array.`, studentData.chatHistory[subject]);
                return [];
            }
        } else {
            console.warn(`[fetchHistory - Same Backend Logic] No chatHistory found for subject "${subject}" in studentData. Available subjects:`, studentData && studentData.chatHistory ? Object.keys(studentData.chatHistory) : 'chatHistory missing');
            return []; // Subject not found in the chatHistory object, or chatHistory itself is missing
        }

    } catch (error) {
        console.error(`[fetchHistory - Same Backend Logic] CATCH BLOCK - Error:`, error);
        return [];
    }
  }


  
  export { generateStudentSummary };
  export default runMulti;