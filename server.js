const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini 
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/deconstruct', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ error: "Topic is required." });

        console.log(`[Pipeline] Deconstructing: ${topic}`);

        const prompt = `
        You are an expert computer science tutor. Break down the topic: "${topic}".
        Return the response strictly as a JSON object. You MUST use Markdown inside the string values for bolding, italics, or bullet points.
        Structure:
        {
          "simple_analogy": "A highly relatable real-world scenario.",
          "core_concept": "A technical definition suitable for GATE + College Concepts. Use markdown for emphasis.",
          "quiz": [
            {
              "difficulty": "Easy",
              "question": "A fundamental, simple recall question.",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "The exact string of the correct option"
            },
            {
              "difficulty": "Medium",
              "question": "An application-based question.",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "The exact string of the correct option"
            },
            {
              "difficulty": "Hard",
              "question": "A complex conceptual question testing deep understanding.",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "The exact string of the correct option"
            }
          ]
        }
        Do not wrap the final output in markdown code blocks. Return raw JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        // Mitigation: Safely clean the string on a single line
        let cleanText = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        let parsedData;
        try {
            parsedData = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("JSON Parse Error:", cleanText);
            return res.status(500).json({ error: "AI pipeline returned malformed data. Please try again." });
        }

        res.json(parsedData);

    } catch (error) {
        console.error("AI Error:", error.message || error);
        res.status(500).json({ error: "Intelligence pipeline failed. Please check server logs." });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Agent Pipeline running on http://localhost:${PORT}`));