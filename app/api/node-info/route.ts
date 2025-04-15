'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const index = pinecone.Index(process.env.PINECONE_INDEX!);

export async function POST(req: Request) {
  try {
    const { concept, documentId } = await req.json();

    if (!concept) return NextResponse.json({ error: 'No concept provided' }, { status: 400 });
    if (!documentId) return NextResponse.json({ error: 'No documentId provided' }, { status: 400 });

    const searchResults = await index.searchRecords({
      query: { inputs: { text: concept }, topK: 10, filter: { documentId } }
    });

    const prompt = `
You are an expert on the subject of "${concept}".
Using the following document excerpts obtained via semantic search:
"""${JSON.stringify(searchResults, null, 2)}"""
Generate a JSON object with:
- "summary": a markdown‑formatted, detailed summary that relates the concept to the user's document (use headings, bold, emojis, blank lines).
- "youtubeLinks": up to 3 objects { url, title, thumbnail }.
- "articleLinks": up to 3 objects { url, title, thumbnail }.
Return only the JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1_000,
      temperature: 0.7,
    });

    const raw = completion.choices[0].message?.content ?? '';
    const jsonLike = raw.replace(/```json/gi, '').replace(/```/g, '');
    const result = JSON.parse(jsonLike);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error generating node info' }, { status: 500 });
  }
}
