import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = "ai-knowledge-graph-explorer";
const NAMESPACE_NAME = INDEX_NAME;

const namespace = pinecone.Index(INDEX_NAME).namespace(NAMESPACE_NAME);

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();

    const genericQuery = "Summarize the main ideas of the document in a short title.";

    const results = await namespace.searchRecords({
      query: {
        inputs: { text: genericQuery },
        topK: 3,
        filter: { documentId: documentId },
      },
    });

    const dataStr = JSON.stringify(results, null, 2);

    const prompt = `Generate a title based on the provided documents, it should be short and descriptive:\n"""${dataStr}"""`;

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
