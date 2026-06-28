import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limits for base64 image payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Metadata Generator Endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const {
      image,       // Base64 encoded string (no prefix, or with prefix)
      mimeType,    // e.g. "image/jpeg", "image/png"
      provider = "gemini",
      apiKey,      // Optional override key
      model,       // Optional model override
      baseUrl,     // Optional for custom API
      customFormat = "openai", // "openai" | "simple"
      preset = "balanced", // "fast" | "balanced" | "quality"
      marketplace = "shutterstock",
      customPrompt, // Optional custom user template/prompt modifier
    } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    // Clean base64 string if it contains data:image/png;base64, prefix
    let cleanBase64 = image;
    let cleanMimeType = mimeType || "image/jpeg";
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        cleanMimeType = match[1];
        cleanBase64 = match[2];
      }
    }

    // Determine API keys and model
    const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
    const resolvedModel = model || "gemini-3.5-flash";

    const marketplacesArray = Array.isArray(marketplace) ? marketplace : [marketplace];
    const marketplacesStr = marketplacesArray.map((m) => String(m).toUpperCase()).join(", ");

    if (provider === "gemini") {
      if (!resolvedApiKey) {
        res.status(400).json({
          error: "Gemini API Key is not configured. Please set it in your Settings or contact the administrator.",
        });
        return;
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({
        apiKey: resolvedApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Construct a general, rich JSON schema to generate comprehensive metadata
      const prompt = `
        Analyze this microstock image and generate high-quality metadata optimized for microstock contributors.
        The target marketplaces requested are: ${marketplacesStr}.
        Ensure you extract and generate information matching guidelines for Shutterstock, Adobe Stock, Getty/iStock, Freepik, and general platforms.

        Guidelines for generation:
        1. Title: Create a descriptive, search-friendly title (5-15 words). For Pond5/Editorial, make it conceptual.
        2. Description: Detailed, keyword-rich explanation of the image.
        3. Keywords: Create exactly 49 highly relevant keywords. Order them from most important to least important. Avoid spam, trademarks, or duplicate words.
        4. Category: Suggest the 2 most applicable microstock categories (e.g., Technology, Nature, Travel, People, Food, Abstract).
        5. Warnings/Warnings Detection: Check for brand logos, trademark watermarks, or text that could lead to copyright rejections. Also check for image artifacts like noise, extreme blur, or potential NSFW content.
        6. AI Disclosure: Check if the image appears to be AI-generated and provide a prompt template if applicable.
        7. Copy Space: Detect if there is empty area (negative space) for adding text.
        8. Getty Specifics: Provide location context, journalistic style concept, and release reminders.
        9. People details: Count of people, general gender, and age brackets if present.
      `;

      // Define structured response schema
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Descriptive SEO-friendly title of the image (5-15 words)" },
          description: { type: Type.STRING, description: "Detailed description of the scene" },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 49 highly relevant keywords sorted by absolute importance.",
          },
          categories: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Up to 2 standard microstock categories",
          },
          peopleCount: { type: Type.INTEGER, description: "Number of people visible, 0 if none" },
          peopleDetails: { type: Type.STRING, description: "Gender and age breakdown of people, or 'None'" },
          copySpace: { type: Type.STRING, description: "Description of empty space for text, or 'None'" },
          editorialCaption: { type: Type.STRING, description: "Journalistic style caption with date/location placeholder if relevant" },
          location: { type: Type.STRING, description: "Suggested geographical context or location feeling" },
          concept: { type: Type.STRING, description: "Underlying abstract concept or emotion (e.g., 'Teamwork', 'Isolation')" },
          brandWarning: { type: Type.STRING, description: "Warning if any recognizable brand logo or trademark is spotted, or 'None'" },
          qualityScore: { type: Type.INTEGER, description: "AI Quality Score (0 to 100) based on composition and commercial viability" },
          aiGeneratedDisclosure: { type: Type.BOOLEAN, description: "Whether this looks like AI generated art" },
          aiPromptSuggestion: { type: Type.STRING, description: "Suggested text prompt to reproduce this style of image" },
          moodTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 emotional mood keywords (e.g., 'peaceful', 'vibrant')" },
        },
        required: ["title", "description", "keywords", "categories", "qualityScore"],
      };

      const imagePart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64,
        },
      };

      const textPart = {
        text: customPrompt ? `${prompt}\n\nUser custom prompt request: ${customPrompt}` : prompt,
      };

      const response = await ai.models.generateContent({
        model: resolvedModel,
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: preset === "fast" ? 0.2 : preset === "quality" ? 0.8 : 0.5,
        },
      });

      const textResult = response.text;
      if (!textResult) {
        throw new Error("Empty response from Gemini API");
      }

      res.json(JSON.parse(textResult));

    } else if (provider === "openai" || provider === "custom") {
      // Direct call to OpenAI or any Custom/Free API
      let url = "";
      if (provider === "openai") {
        url = "https://api.openai.com/v1/chat/completions";
      } else {
        if (!baseUrl) {
          res.status(400).json({
            error: "Custom API Base URL / Endpoint is required. Please configure it in Settings.",
          });
          return;
        }
        url = baseUrl;
      }

      const openaiKey = apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : "");

      if (provider === "openai" && !openaiKey) {
        res.status(400).json({
          error: "OpenAI API Key is not configured. Please provide it in Settings.",
        });
        return;
      }

      const modelName = model || (provider === "openai" ? "gpt-4o-mini" : "custom-model");

      const systemPrompt = `
        You are a highly professional Microstock Metadata Generator.
        Analyze the provided image and generate metadata in strict JSON format.
        JSON schema expected:
        {
          "title": "Descriptive title (5-15 words)",
          "description": "Rich detailed description",
          "keywords": ["exactly", "49", "keywords", "sorted", "by", "relevance"],
          "categories": ["Category 1", "Category 2"],
          "peopleCount": 0,
          "peopleDetails": "None",
          "copySpace": "None",
          "editorialCaption": "None",
          "location": "None",
          "concept": "Abstract concept",
          "brandWarning": "None",
          "qualityScore": 85,
          "aiGeneratedDisclosure": false,
          "aiPromptSuggestion": "",
          "moodTags": ["vibrant", "energetic"]
        }
      `;

      const userContent = customPrompt
        ? `Analyze this image. Custom guidelines: ${customPrompt}`
        : "Analyze this image and return the requested JSON metadata.";

      // Hybrid payload: construct based on desired format
      let bodyPayload: any = {};

      if (provider === "openai" || (provider === "custom" && customFormat === "openai")) {
        // STRICT standard OpenAI format - NO extra top-level fields to prevent 400 bad requests
        bodyPayload = {
          model: modelName,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userContent },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${cleanMimeType};base64,${cleanBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: preset === "fast" ? 0.2 : preset === "quality" ? 0.8 : 0.5,
        };
      } else {
        // Custom simple/flat format for free or custom-built APIs
        bodyPayload = {
          model: modelName,
          image: `data:${cleanMimeType};base64,${cleanBase64}`,
          imageBase64: cleanBase64,
          mimeType: cleanMimeType,
          prompt: userContent,
          systemPrompt: systemPrompt,
          preset: preset,
          temperature: preset === "fast" ? 0.2 : preset === "quality" ? 0.8 : 0.5,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userContent },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${cleanMimeType};base64,${cleanBase64}`,
                  },
                },
              ],
            },
          ],
        };
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (openaiKey) {
        headers["Authorization"] = `Bearer ${openaiKey}`;
      }

      const openAiRes = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!openAiRes.ok) {
        const errorText = await openAiRes.text();
        throw new Error(`API provider returned error status ${openAiRes.status}: ${errorText}`);
      }

      const responseData = await openAiRes.json();
      
      let contentString = "";
      if (responseData.choices?.[0]?.message?.content) {
        contentString = responseData.choices[0].message.content;
      } else if (responseData.title || responseData.description || responseData.keywords) {
        // Direct metadata object returned!
        res.json(responseData);
        return;
      } else if (typeof responseData === "string") {
        contentString = responseData;
      } else if (responseData.text) {
        contentString = responseData.text;
      } else if (responseData.result) {
        if (typeof responseData.result === "string") {
          contentString = responseData.result;
        } else {
          res.json(responseData.result);
          return;
        }
      } else {
        throw new Error("Unable to parse custom API response. Ensure it returns either an OpenAI-compatible JSON structure or the metadata object directly.");
      }

      let cleanContent = contentString.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?|```$/g, "").trim();
      }
      
      try {
        res.json(JSON.parse(cleanContent));
      } catch (jsonErr) {
        throw new Error(`Failed to parse metadata JSON from custom API response. Response was: ${cleanContent.slice(0, 300)}`);
      }
    } else {
      res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate metadata using AI" });
  }
});

// Configure Vite or Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server in dev mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
