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
    const { question, namespace } = await request.json();
    if (!namespace) {
      return NextResponse.json({ error: "No namespace provided" }, { status: 400 });
    }
    const namespacedIndex = index.namespace(namespace);

    const queryText = question ? question : "Document summary";
    const searchResults = await namespacedIndex.searchRecords({
      query: {
        inputs: { text: queryText },
        topK: 10,
      },
    });
    const dataStr = JSON.stringify(searchResults, null, 2);

    let prompt = "";
    if (!question) {
      prompt = `
You are a friendly chatbot assistant that helps users understand the document they uploaded.
Using the following document excerpts obtained via semantic search:
"""${dataStr}"""
Generate a friendly initial greeting message that includes:
- A short paragraph summarizing the main ideas of the document.
- A greeting that welcomes the user.
- A prompt asking if they have any questions.
Return only the plain text message.
      `;
    } else {
      prompt = `
You are a helpful chatbot assistant that answers questions about a document.
Using the following document excerpts obtained via semantic search:
"""${dataStr}"""
The user asked: "${question}"
Provide a concise, clear, and informative answer using the context of the document.
Return only the plain text answer.
      `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const completionText = completion.choices[0]?.message?.content || "";
    const sanitizedText = completionText.replace(/```/g, "");
    return NextResponse.json({ message: sanitizedText }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error generating chatbot message" }, { status: 500 });
  }
}
