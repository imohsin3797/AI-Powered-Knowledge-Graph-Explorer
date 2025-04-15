'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

type UUID = string;

interface RequestPayload {
  question?: string;
  documentId: UUID;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const INDEX_NAME = 'ai-knowledge-graph-explorer';
const NAMESPACE_NAME = INDEX_NAME;

const namespace = pinecone.Index(INDEX_NAME).namespace(NAMESPACE_NAME);

async function parseRequest(req: Request): Promise<RequestPayload> {
  return req.json();
}

async function searchDocument(queryText: string, documentId: UUID) {
  return namespace.searchRecords({
    query: {
      inputs: { text: queryText },
      topK: 10,
      filter: { documentId: { $eq: documentId } },
    },
  });
}

function buildPrompt(searchResults: unknown, question?: string): string {
  const context = JSON.stringify(searchResults, null, 2);

  return question
    ? `You are a helpful assistant. Using the excerpts below, answer: "${question}"
"""${context}"""
Return only the plain‑text answer.`
    : `You are a friendly assistant. Using the excerpts below, greet the user, give a brief summary, and invite questions.
"""${context}"""
Return only the plain‑text greeting.`;
}

async function runLLM(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.7,
  });

  return (completion.choices[0]?.message?.content ?? '').replace(/```/g, '');
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  const payload = await parseRequest(req);

  const queryText = payload.question || 'Document summary';
  const searchResults = await searchDocument(queryText, payload.documentId);

  const prompt = buildPrompt(searchResults, payload.question);
  const message = await runLLM(prompt);

  return jsonResponse({ message });
}
