/* eslint-disable */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";

// Ensure required environment variables are provided.
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined");
}
if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not defined");
}
if (!process.env.PINECONE_INDEX) {
  throw new Error("PINECONE_INDEX is not defined");
}
if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error("PINECONE_ENVIRONMENT is not defined");
}

// Trim the index name to remove any accidental whitespace.
const rawIndexName = process.env.PINECONE_INDEX;
const indexName = rawIndexName.trim();

// Validate that the index name matches the expected pattern (lowercase letters, numbers, and hyphens).
if (!/^[a-z0-9-]+$/.test(indexName)) {
  throw new Error("PINECONE_INDEX does not match the expected pattern (lowercase letters, numbers, and hyphens only)");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request: Request) {
  try {
    try {
      await pinecone.createIndexForModel({
        name: indexName,
        cloud: "aws",
        region: process.env.PINECONE_ENVIRONMENT!,
        embed: {
          model: "llama-text-embed-v2",
          fieldMap: { text: "text" },
        },
        waitUntilReady: true,
      });
    } catch (err: any) {
      if (!err.message?.includes("ALREADY_EXISTS")) {
        throw err;
      }
    }

    const index = pinecone.Index(indexName);

    function chunkText(fullText: string, maxChunkSize = 1000): string[] {
      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += maxChunkSize) {
        chunks.push(fullText.slice(i, i + maxChunkSize));
      }
      return chunks;
    }

    function chunkArray<T>(arr: T[], batchSize: number): T[][] {
      const result: T[][] = [];
      for (let i = 0; i < arr.length; i += batchSize) {
        result.push(arr.slice(i, i + batchSize));
      }
      return result;
    }

    const { pdfBase64, config } = await request.json();
    if (!pdfBase64) {
      return NextResponse.json({ error: "No PDF base64 data provided" }, { status: 400 });
    }

    const docNamespace = uuidv4();

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const pdfData = await pdf(pdfBuffer);
    let extractedText = pdfData.text || "";
    // Replace non-ASCII characters (except basic whitespace) to ensure consistent text.
    extractedText = extractedText.replace(/[^\x20-\x7E\n\r\t]+/g, " ");

    console.log(extractedText);

    const chunks = chunkText(extractedText, 2000);
    const recordIdBase = `doc-${Date.now()}`;
    // Change property from _id to id so Pinecone sees a valid identifier.
    const records = chunks
      .map((chunk, i) => ({
        id: `${recordIdBase}-${i}`,
        text: chunk,
      }))
      .filter((record) => record.text && record.text.trim() !== "");

    const namespacedIndex = index.namespace(docNamespace);
    const batchSize = 20;
    const recordBatches = chunkArray(records, batchSize);

    for (const batch of recordBatches) {
      await namespacedIndex.upsertRecords(batch as any);
    }

    // Wait a moment for the records to be indexed.
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const genericQuery = "Key information for building a knowledge graph";
    const results = await namespacedIndex.searchRecords({
      query: {
        inputs: { text: genericQuery },
        topK: 10,
      },
    });

    const dataStr = JSON.stringify(results, null, 2);
    const mainConcepts = config?.mainConcepts || 3;
    const nodeCount = config?.nodeCount || 10;

    // Updated prompt instructing the model to extract actual topics and entities.
    const prompt = `
You are an expert at extracting structured, factual key topics and relationships from unstructured text.
Below are document excerpts retrieved via semantic search based on the uploaded document:
"""${dataStr}"""
Using the context of these excerpts, identify the actual topics, entities, and details present in the document. Do not use generic placeholders like "main concepts" or "semantic search." Instead, generate nodes that reflect real topics found in the text.
Generate a JSON object representing a knowledge graph with two keys: "nodes" and "links".

Nodes:
- Each node must include:
  - "id": a concise title reflecting an actual concept or topic from the text.
  - "size": one of "large", "medium", or "small" (with "large" for a central topic, "medium" for an important sub-topic, and "small" for a detail).
  - "ring": an integer (0 for primary topics, 1 for secondary topics, 2 for detailed aspects).
  - "description": a brief summary derived from the document excerpts.
- Identify up to ${mainConcepts} primary topics as central nodes.
- The total number of nodes should be around ${nodeCount}.

Links:
- Each link should be an object with { source: id, target: id } representing the relationship between topics.
- Ensure the graph reflects logical relationships derived from the content.

Return only the JSON object.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const completionText = completion.choices[0]?.message?.content || "";
    const sanitizedText = completionText.replace(/```json/gi, "").replace(/```/g, "");

    let graphJson;
    try {
      graphJson = JSON.parse(sanitizedText);
    } catch {
      return NextResponse.json({ error: "Failed to parse knowledge graph" }, { status: 500 });
    }

    return NextResponse.json({ graph: graphJson, docNamespace }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error generating graph" }, { status: 500 });
  }
}
