'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { fetchYouTubeLinks, fetchWebLinks } from '@/lib/externalSearch';

const INDEX_NAME = 'ai-knowledge-graph-explorer';
const NAMESPACE_NAME = INDEX_NAME;

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const namespace = pinecone
  .Index(INDEX_NAME)
  .namespace(NAMESPACE_NAME);

export async function POST(req: Request) {
  try {
    const { concept, documentId } = await req.json();
    if (!concept || !documentId)
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const searchResults = await namespace.searchRecords({
      query: {
        inputs: { text: concept },
        topK: 15,
        filter: { documentId: documentId },
      },
    });

    const pathPrompt = `
You are a senior educator. Break the complex concept "${concept}" into an ordered learning path of 5–7 concise steps.
Each step should have:
• "title"
• "summary" (≤120 words)
Return ONLY JSON:
{ "steps": [ { "title": "...", "summary": "..." } ] }

Context:
"""${JSON.stringify(searchResults, null, 2)}"""`;

    const pathCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: pathPrompt }],
      max_tokens: 800,
      temperature: 0.5,
    });

    const raw = pathCompletion.choices[0].message?.content ?? '{}';
    const jsonClean = raw.replace(/```json|```/gi, '').trim();
    const base = JSON.parse(jsonClean);

    const steps = await Promise.all(
      (base.steps ?? []).map(async (s: any) => {
        const [youtubeLinks, webLinks] = await Promise.all([
          fetchYouTubeLinks(`${s.title} ${concept}`, 3),
          fetchWebLinks(`${s.title} ${concept}`, 3),
        ]);
        return { ...s, youtubeLinks, webLinks };
      }),
    );

    return NextResponse.json({ steps });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}