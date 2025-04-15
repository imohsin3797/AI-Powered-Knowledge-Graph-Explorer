'use server';

import OpenAI from 'openai';
import { Index, Pinecone, type IntegratedRecord, type RecordMetadata } from '@pinecone-database/pinecone';
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

type UUID = string;

export type ChunkBatch = string[];

export type PineconeRecord = IntegratedRecord<RecordMetadata> & {
  text: string;
  documentId: UUID;
};

export interface GraphConfig {
  mainConcepts?: number;
  nodeCount?: number;
}

export interface KnowledgeNode {
  id: string;
  size: 'large' | 'medium' | 'small';
  ring: 0 | 1 | 2;
  description: string;
}

export interface KnowledgeLink {
  source: string;
  target: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface GraphData {
  graph: KnowledgeGraph;
  documentId: UUID;
}

const CHUNK_SIZE = 2_000;
const BATCH_SIZE = 20;
const INDEX_NAME = 'ai-knowledge-graph-explorer';
const NAMESPACE_NAME = INDEX_NAME;

const openai: OpenAI = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY! 
});

const pinecone: Pinecone = new Pinecone({ 
    apiKey: process.env.PINECONE_API_KEY! 
});

async function extractText(pdfBase64: string): Promise<string> {
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const { text = '' } = await pdf(pdfBuffer);
  return text;
}

function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E\n\r\t]+/g, ' ');
}

function chunk(text: string): ChunkBatch {
  const out: ChunkBatch = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) out.push(text.slice(i, i + CHUNK_SIZE));
  return out;
}

function batch(chunks: ChunkBatch): ChunkBatch[] {
  const groups: ChunkBatch[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) groups.push(chunks.slice(i, i + BATCH_SIZE));
  return groups;
}

function batchToRecords(chunkBatch: ChunkBatch, docId: UUID): PineconeRecord[] {
  return chunkBatch
    .map(c => c.trim())
    .filter((c): c is string => c.length > 0)
    .map(
      (text): PineconeRecord => ({
        id: `${docId}-${uuidv4()}` as UUID,
        text,
        documentId: docId,
      }),
    );
}

async function upsert(batches: ChunkBatch[], docId: UUID){
  const index: Index = pinecone.Index(INDEX_NAME);
  const ns = index.namespace(NAMESPACE_NAME);
  
  for (const batch of batches) {
    const records = batchToRecords(batch, docId);
    if (records.length) await ns.upsertRecords(records as unknown as IntegratedRecord<RecordMetadata>[]);
  }
  
  await new Promise(r => setTimeout(r, 10_000));
}

async function search(documentId: string) {
  const index: Index = pinecone.Index(INDEX_NAME);
  const namespace = index.namespace(NAMESPACE_NAME);

  return namespace.searchRecords({
    query: {
      inputs: { text: 'Key information for building a knowledge graph' },
      topK: 10,
      filter: { documentId },
    },
  });
}

function buildPrompt(results: unknown, cfg: GraphConfig): string {
  const mainConcepts = cfg.mainConcepts ?? 3;
  const nodeCount = cfg.nodeCount ?? 10;
  const payload = JSON.stringify(results, null, 2);
  
  return `You are an expert at extracting structured, factual key topics and relationships from unstructured text.
Below are document excerpts retrieved via semantic search based on the uploaded document:
"""${payload}"""
Using the context of these excerpts, identify the actual topics, entities, and details present in the document. Do not use generic placeholders like "main concepts" or "semantic search." Instead, generate nodes that reflect real topics found in the text.
Generate a JSON object representing a knowledge graph with two keys: "nodes" and "links".

Nodes:
- Each node must include:
  - "id": a concise title reflecting an actual concept or topic from the text.
  - "size": one of "large", "medium", or "small".
  - "ring": 0, 1, or 2.
  - "description": a brief summary derived from the document excerpts.
- Identify up to ${mainConcepts} primary topics as central nodes.
- The total number of nodes should be around ${nodeCount}.

Links:
- Each link should be { source: id, target: id }.

Return only the JSON object.`;
}

async function runLLM(prompt: string): Promise<KnowledgeGraph> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1_000,
    temperature: 0.7,
  });
  
  const raw = completion.choices[0]?.message?.content ?? '';
  const jsonLike = raw.replace(/```json/gi, '').replace(/```/g, '');
  
  return JSON.parse(jsonLike) as KnowledgeGraph;
}

export async function generateGraph(pdfBase64: string, cfg: GraphConfig = {}): Promise<GraphData> {
  const rawText = await extractText(pdfBase64);
  const cleanText = sanitize(rawText);

  const chunks = chunk(cleanText);
  const batches = batch(chunks);

  const documentId = uuidv4();
  await upsert(batches, documentId);

  const searchResults = await search(documentId);
  const prompt = buildPrompt(searchResults, cfg);
  
  const graph = await runLLM(prompt);
  return { graph, documentId };
}
