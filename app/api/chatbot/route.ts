'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX!);

export async function POST(req: Request) {
  try {
    const { question, documentId } = await req.json();

    if (!documentId) return NextResponse.json({ error: 'No documentId provided' }, { status: 400 });

    const queryText = question || 'Document summary';

    const searchResults = await index.searchRecords({
      query: { inputs: { text: queryText }, topK: 10, filter: { documentId },}
    });

    const prompt = question
      ? `You are a helpful assistant. Using the excerpts below, answer: "${question}"
"""${JSON.stringify(searchResults, null, 2)}"""
Return only the plain‑text answer.`
      : `You are a friendly assistant. Using the excerpts below, greet the user, give a brief summary, and invite questions.
"""${JSON.stringify(searchResults, null, 2)}"""
Return only the plain‑text greeting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const message = (completion.choices[0].message?.content ?? '').replace(/```/g, '');
    return NextResponse.json({ message });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error generating chatbot message' }, { status: 500 });
  }
}
