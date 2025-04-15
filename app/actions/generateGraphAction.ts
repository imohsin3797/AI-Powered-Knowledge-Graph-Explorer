'use server';

import { generateGraph } from '../../lib//generateGraph';
import type { GraphData } from '../../lib//generateGraph';

export async function generateGraphAction(pdfBase64: string): Promise<GraphData> {
  return await generateGraph(pdfBase64, {});
}
