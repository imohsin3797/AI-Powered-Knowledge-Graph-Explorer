'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { fetchYouTubeLinks, fetchWebLinks } from '../../../lib/externalSearch';

const INDEX_NAME      = 'ai-knowledge-graph-explorer';
const NAMESPACE_NAME  = INDEX_NAME;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const index = pinecone.Index(process.env.PINECONE_INDEX!);
const namespace = index.namespace(NAMESPACE_NAME);

export async function POST(req: Request) {
  try {
    const { concept, documentId } = await req.json();
    if (!concept) return NextResponse.json({ error: 'No concept provided' }, { status: 400 });
    if (!documentId) return NextResponse.json({ error: 'No documentId provided' }, { status: 400 });

    const searchResults = await namespace.searchRecords({
      query: { inputs: { text: concept }, topK: 10, filter: { documentId: { $eq: documentId } } },
    });

    const summaryPrompt = `
You are an expert on "${concept}".
Using the excerpts below, write a markdown summary that explains the concept and relates it to the user's document.
Use headings, bold, emojis, horizontal rules and leave a blank line between every paragraph.

"""${JSON.stringify(searchResults, null, 2)}"""

Return ONLY the markdown text.`;

    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    const summary = summaryCompletion.choices[0].message?.content?.trim() || '';

    const queryPrompt = `
Given the concept "${concept}" and the following excerpts, produce a concise search query (max 8 words) that will surface multimedia resources helpful for understanding the concept in the context of the document. Return only the query.

"""${JSON.stringify(searchResults, null, 2)}"""`;

    const queryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: queryPrompt }],
      max_tokens: 30,
      temperature: 0.3,
    });

    const searchQuery = queryCompletion.choices[0].message?.content?.trim() || concept;

    const [youtubeLinks, webLinks] = await Promise.all([
      fetchYouTubeLinks(searchQuery, 3),
      fetchWebLinks(searchQuery, 3),
    ]);

    return NextResponse.json({ summary, youtubeLinks, webLinks });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error generating node info' }, { status: 500 });
  }
}
