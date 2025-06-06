 export async function runMulti(prompt, file = null) {
    const grade = localStorage.getItem('studentGrade') || 'unknown grade';
    const currentSubject = localStorage.getItem('selectedSubject');

    for (const modelName of MODEL_FALLBACK_ORDER) {
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

            const chatSession = currentModel.startChat({ // Use currentModel here
                generationConfig,
                history: conversationHistory,
            });

            if (file) {
                const imageBase64 = await encodeImage(file);
                const imagePart = {
                    inlineData: {
                        data: imageBase64,
                        mimeType: file.type || "image/png",
                    },
                };
                const textPart = { text: prompt };

                // Send both image and text parts through chat session
                const result = await chatSession.sendMessage([imagePart, textPart]);
                const responseText = result.response.text();

                // Update history with both image and text
                updateConversationHistory([imagePart, textPart], responseText);
                return responseText;
            } else {
                // Get the current subject from localStorage
                const currentSubject = localStorage.getItem('selectedSubject');

                // Fetch search results with the subject
                const searchResults = await fetchSearchResults(prompt, currentSubject);
                const searchSummary = searchResults.map((result) => result.snippet).join('\n');


                const contextPrompt = `
                [Grade Level: ${grade}]
                [Subject: ${currentSubject}]
                [Conversation History: ${conversationHistory.map(entry => entry.parts.map(p => p.text).join(" ")).join("\n")}]

                Student Query: "${prompt}"

                Search Context:
                ${searchSummary}

                Required:
                - You are Chikoro AI
                - Use ${grade}-appropriate vocabulary
                - Include local examples
            `;

                const result = await chatSession.sendMessage(contextPrompt);
                updateConversationHistory(prompt, result.response.text());
                return result.response.text();
            }
        } catch (error) {
            console.error(`Error with model ${modelName}:`, error);
            // If the error is due to rate limits or free trial limits,
            // the loop will continue to the next model.
            // You might want to add more specific error checking here if needed.
            if (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("rate limit")) {
                console.warn(`Model ${modelName} likely hit a limit. Trying next model...`);
                continue; // Try the next model in the list
            } else {
                // If it's another type of error, re-throw or handle it
                console.error("Non-fallback error, stopping model attempts.");
                return "Sorry, something went wrong. Please try again.";
            }
        }
    }
    return "Sorry please try again later.";
}
