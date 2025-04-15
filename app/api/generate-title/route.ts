'use server'

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone, SearchRecordsResponse } from "@pinecone-database/pinecone";
import { ChatCompletion } from "openai/resources/index.mjs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const INDEX_NAME = "ai-knowledge-graph-explorer";
const NAMESPACE_NAME = INDEX_NAME;
const namespace = pinecone.Index(INDEX_NAME).namespace(NAMESPACE_NAME);

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();

    const results: SearchRecordsResponse = await namespace.searchRecords({
      query: {
        inputs: { text: "Summarize the main ideas of the document in a short title." },
        topK: 3,
        filter: { documentId },
      },
    });

    const prompt: string = `Generate a title based on the provided documents, it should be short and descriptive:\n"""${JSON.stringify(results, null, 2)}"""`;
    
    const completion: ChatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
    });

    const sanitizedTitle: string = (completion.choices[0]?.message?.content || "").replace(/```/g, "").trim();
    return NextResponse.json({ title: sanitizedTitle }, { status: 200 });
  
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: "Error generating title" }, { status: 500 });
  }
}
