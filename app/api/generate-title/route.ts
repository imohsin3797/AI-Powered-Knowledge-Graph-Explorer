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

export async function POST(request: Request) {
  try {
    const { namespace } = await request.json();
    if (!namespace) {
      return NextResponse.json({ error: "No namespace provided" }, { status: 400 });
    }
    const namespacedIndex = index.namespace(namespace);

    const genericQuery = "Summarize the main ideas of the document in a short title.";
    const results = await namespacedIndex.searchRecords({
      query: {
        inputs: { text: genericQuery },
        topK: 5,
      },
    });
    const dataStr = JSON.stringify(results, null, 2);
    console.log("Title generation semantic search results:", dataStr);

    const prompt = `
You are an expert at creating concise and engaging titles for documents.
Based on the following document excerpts obtained via semantic search:
"""${dataStr}"""
Generate a short, catchy title (no more than 8 words) that captures the essence of the document.
Return only the title as plain text.
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
    });
    const titleText = completion.choices[0]?.message?.content || "";
    const sanitizedTitle = titleText.replace(/```/g, "").trim();
    return NextResponse.json({ title: sanitizedTitle }, { status: 200 });
  } catch (err) {
    console.error("Error generating title:", err);
    return NextResponse.json({ error: "Error generating title" }, { status: 500 });
  }
}
