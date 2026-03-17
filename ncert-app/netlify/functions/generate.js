exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY not set in Netlify environment variables." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { prompt, fileBase64, mimeType, numQuestions, difficulty, qType, topic, batchIndex, totalBatches } = body;

  const systemInstruction = `You are an expert NCERT educator. Generate exactly ${numQuestions} ${difficulty.toLowerCase()}-difficulty ${qType} questions from the provided educational content.
${topic ? `Topic: ${topic}.` : "Auto-detect the topic from the content."}
${totalBatches > 1 ? `This is batch ${batchIndex + 1} of ${totalBatches}. Generate UNIQUE questions not repeated from other batches.` : ""}

Rules:
- Questions must be strictly based on the provided content
- Make them NCERT-style, curriculum-appropriate, and exam-ready
- Return ONLY a valid JSON array. No markdown, no code fences, no extra text.

JSON format:
${qType === "MCQ"
  ? `[{"question":"...","type":"MCQ","difficulty":"${difficulty}","options":[{"text":"option A","correct":true},{"text":"option B","correct":false},{"text":"option C","correct":false},{"text":"option D","correct":false}],"explanation":"..."}]`
  : `[{"question":"...","type":"${qType}","difficulty":"${difficulty}","answer":"detailed answer here","explanation":"brief explanation"}]`
}
Generate exactly ${numQuestions} questions.`;

  // Build Gemini parts
  const parts = [];

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType,
        data: fileBase64,
      },
    });
  }

  parts.push({ text: `Generate ${numQuestions} ${qType} questions from this NCERT content.` });

  const geminiBody = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Gemini API error: ${errText}` }),
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: clean }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
