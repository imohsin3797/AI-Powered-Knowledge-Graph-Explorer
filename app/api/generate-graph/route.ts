import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX!;

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
    extractedText = extractedText.replace(/[^\x20-\x7E\n\r\t]+/g, " ");

    const chunks = chunkText(extractedText, 2000);
    const recordIdBase = `doc-${Date.now()}`;
    const records = chunks
      .map((chunk, i) => ({
        _id: `${recordIdBase}-${i}`,
        text: chunk,
      }))
      .filter((record) => record.text && record.text.trim() !== "");

    const namespacedIndex = index.namespace(docNamespace);
    const batchSize = 20;
    const recordBatches = chunkArray(records, batchSize);

    for (const batch of recordBatches) {
      await namespacedIndex.upsertRecords(batch as any);
    }

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

    const prompt = `
You are an expert at extracting structured knowledge from unstructured text using semantic context.
Based on the following document excerpts obtained via semantic search:
"""${dataStr}"""
Generate a JSON object representing a knowledge graph with two keys: "nodes" and "links".

Nodes:
- Each node must include:
  - "id": a short title or concept.
  - "size": one of "large", "medium", or "small".
  - "ring": an integer (0=main concept, 1=sub-concept, 2=detail).
  - "description": a brief summary.
- Focus on up to ${mainConcepts} main concepts as central nodes.
- The total number of nodes should be ~${nodeCount}.

Links:
- Each link: { source: id, target: id }.
- Ensure logical structure.

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
