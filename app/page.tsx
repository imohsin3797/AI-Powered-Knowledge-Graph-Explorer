/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider, Box, CircularProgress, Typography } from '@mui/material';
import { chatGPTDarkTheme } from './theme';
import Header from '@/components/Header';
import DocumentUpload from '@/components/DocumentUpload';
import D3Graph from '@/components/d3-components/D3Graph';
import Sidebar from '@/components/Sidebar';
import ChatbotSidebar from '@/components/ChatbotSidebar';

export interface GraphNode {
  id: string;
  size: 'large' | 'medium' | 'small';
  ring: number;
  description?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphResponse {
  graph: GraphData;
  documentId: string;
}

export default function Page() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [documentId, setDocumentId] = useState('');
  const [docTitle, setDocTitle] = useState('Knowledge Explorer');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGraphData = (data: GraphResponse) => {
    setGraphData(data.graph);
    setDocumentId(data.documentId);
    setLoading(false);
  };

  useEffect(() => {
    if (!documentId) return;

    const fetchTitle = async () => {
      try {
        const res = await fetch('/api/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
        });
        if (!res.ok) throw new Error(`Failed to load title (status ${res.status})`);
        const { title } = await res.json();
        setDocTitle(title);
      } catch (err) {
        console.error('Error fetching document title:', err);
      }
    };

    fetchTitle();
  }, [documentId]);

  const handleNodeClick = (node: GraphNode) => setSelectedNode(node);
  const handleCloseSidebar = () => setSelectedNode(null);

  return (
    <ThemeProvider theme={chatGPTDarkTheme}>
      <Header aiTitle={docTitle} />
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        {!graphData && !loading && (
          <Box sx={{ p: 2 }}>
            <DocumentUpload onGraphData={handleGraphData} />
          </Box>
        )}
        {loading && !graphData && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
            }}
          >
            <CircularProgress color="primary" />
            <Typography variant="body2" sx={{ mt: 2, color: '#fff' }}>
              Generating Graph…
            </Typography>
          </Box>
        )}
        {graphData && (
          <>
            <D3Graph graphData={graphData} onNodeClick={handleNodeClick} />
            <Sidebar selectedNode={selectedNode} onClose={handleCloseSidebar} documentId={documentId} />
            <ChatbotSidebar documentId={documentId} />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
