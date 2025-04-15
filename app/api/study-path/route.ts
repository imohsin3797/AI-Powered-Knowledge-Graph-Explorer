'use server';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { fetchYouTubeLinks, fetchWebLinks } from '@/lib/externalSearch';

type UUID = string;

interface RequestPayload {
  concept: string;
  documentId: UUID;
}

interface LearningStep {
  title: string;
  summary: string;
  youtubeLinks?: unknown[];
  webLinks?: unknown[];
}

interface PathJson {
  steps?: LearningStep[];
}

const openai: OpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone: Pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const INDEX_NAME = 'ai-knowledge-graph-explorer' as const;
const NAMESPACE_NAME = INDEX_NAME;

const namespace = pinecone.Index(INDEX_NAME).namespace(NAMESPACE_NAME);

async function parseRequest(req: Request): Promise<RequestPayload> {
  return req.json() as Promise<RequestPayload>;
}

async function searchDocument(concept: string, documentId: UUID) {
  return namespace.searchRecords({
    query: {
      inputs: { text: concept },
      topK: 15,
      filter: { documentId: { $eq: documentId } },
    },
  });
}

function buildPathPrompt(concept: string, searchResults: unknown): string {
  const context = JSON.stringify(searchResults, null, 2);
  return `You are a senior educator. Break the complex concept "${concept}" into an ordered learning path of 5–7 concise steps.
Each step should have:
• "title"
• "summary" (≤120 words)
Return ONLY JSON:
{ "steps": [ { "title": "...", "summary": "..." } ] }

Context:
"""${context}"""`;
}

async function runLLM(prompt: string): Promise<PathJson> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.5,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const jsonClean = raw.replace(/```json|```/gi, '').trim();
  return JSON.parse(jsonClean) as PathJson;
}

async function enrichSteps(concept: string, base: PathJson): Promise<LearningStep[]> {
  const steps = base.steps ?? [];
  return Promise.all(
    steps.map(async (s) => {
      const [youtubeLinks, webLinks] = await Promise.all([
        fetchYouTubeLinks(`${s.title} ${concept}`, 3),
        fetchWebLinks(`${s.title} ${concept}`, 3),
      ]);

      console.log(youtubeLinks);

      return { ...s, youtubeLinks, webLinks } as LearningStep;
    }),
  );
}

function jsonResponse(body: unknown, status: number = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const payload = await parseRequest(req);
  const searchResults = await searchDocument(payload.concept, payload.documentId);
  const prompt = buildPathPrompt(payload.concept, searchResults);
  const base = await runLLM(prompt);
  const steps = await enrichSteps(payload.concept, base);
  return jsonResponse({ steps });
}
