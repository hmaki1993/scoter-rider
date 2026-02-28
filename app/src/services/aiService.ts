export interface AIExtractedStudent {
    full_name: string;
    phone: string;
    date_of_birth?: string; // YYYY-MM-DD
    gender?: 'male' | 'female';
}

export const processImageWithGemini = async (base64Image: string): Promise<AIExtractedStudent[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing from your .env file. Please add it to use the AI Scanner.");
    }

    // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `
    You are an AI assistant designed to extract student data from images of printed or handwritten lists.
    Extract the names, phone numbers, birth dates, and gender from the provided image.
    Return ONLY a raw JSON array of objects. Do NOT use markdown code blocks (like \`\`\`json). Just the raw array.
    Each object must have these keys:
    1. "full_name" (string)
    2. "phone" (string)
    3. "date_of_birth" (string in YYYY-MM-DD format if found, otherwise empty string "")
    4. "gender" (string "male" or "female" if found, otherwise empty string "")

    Notes:
    - Many lists have "Birth Date" (تاريخ الميلاد) or "Age" (السن). If only age is listed, calculate the year (Current year is 2026).
    - If gender is implied (e.g., from name or a column), set it to "male" or "female".
    - If a field is missing or illegible, leave it as an empty string "".
    - Please make your best effort to read Arabic and English names and numbers accurately.
    `;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1, // Low temperature for factual extraction
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error details:", errorText);
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("No text returned from Gemini API");
        }

        // Clean up any potential markdown formatting in case Gemini ignored the prompt
        let cleanedText = textResponse.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.substring(7);
        }
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.substring(3);
        }
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }

        const parsedData = JSON.parse(cleanedText) as AIExtractedStudent[];
        return parsedData;

    } catch (error) {
        console.error("Failed to process image with AI:", error);
        throw error;
    }
};
