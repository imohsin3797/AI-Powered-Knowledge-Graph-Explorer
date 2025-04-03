import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX!;
const index = pinecone.Index(indexName);

function tryFixJson(jsonStr: string): string {
  let fixed = jsonStr.trim();

  if (!fixed.endsWith("}")) {
    fixed += "}";
  }
  return fixed;
}

export async function POST(request: Request) {
  try {
    const { concept, namespace } = await request.json();

    if (!concept) {
      return NextResponse.json({ error: "No concept provided" }, { status: 400 });
    }
    if (!namespace) {
      return NextResponse.json({ error: "No namespace provided" }, { status: 400 });
    }

    const namespacedIndex = index.namespace(namespace);

    const searchResults = await namespacedIndex.searchRecords({
      query: {
        inputs: { text: concept },
        topK: 10,
      },
    });
    const dataStr = JSON.stringify(searchResults, null, 2);
    console.log("Semantic search results:", dataStr);

    const prompt = `
You are an expert on the subject of "${concept}".
Using the following document excerpts obtained via semantic search:
"""${dataStr}"""
Generate a JSON object with the following keys:
- "summary": A detailed, markdown-formatted summary explaining the concept. Beyond just explaining the concept, also explain how that concept relates to the reading the user uploaded and make it clear when you are doing that. Use clear dividers (e.g. horizontal rules), **bold text**, headings, emojis, and other markdown features to enhance readability. Additionally, between relevant sections, add line breaks to enhance readability. THERE SHOULD BE NO CONSECUTIVE PARAGRAHPS WITHOUT A BLANK LINE BETWEEN THEM FOR READABILITY. 
- "youtubeLinks": An array (up to 3) of objects representing YouTube videos, where each object has:
    - "url": The video URL.
    - "title": The video title.
    - "thumbnail": A URL to the video thumbnail.
- "articleLinks": An array (up to 3) of objects representing articles for further reading, where each object has:
    - "url": The article URL.
    - "title": The article title.
    - "thumbnail": A URL to a representative thumbnail image (if available).
Return only the JSON object.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const completionText = completion.choices[0]?.message?.content || "";

    const sanitizedText = completionText.replace(/```json/gi, "").replace(/```/g, "");

    let resultJson;
    try {
      resultJson = JSON.parse(sanitizedText);
    } catch (parseErr) {
      console.error("Failed to parse JSON initially. Raw output:", completionText, parseErr);

      try {
        const fixedText = tryFixJson(sanitizedText);
        resultJson = JSON.parse(fixedText);
      } catch (fixErr) {
        console.error("Failed to fix JSON:", fixErr);
        return NextResponse.json(
          { error: "Failed to parse node info" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(resultJson, { status: 200 });
  } catch (err) {
    console.error("Error generating node info:", err);
    return NextResponse.json(
      { error: "Error generating node info" },
      { status: 500 }
    );
  }
}
