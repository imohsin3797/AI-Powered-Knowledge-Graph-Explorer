"use client";
import React, { useState, useEffect } from "react";
import { ThemeProvider, Box, CircularProgress } from "@mui/material";
import { chatGPTDarkTheme } from "./theme";
import Header from "@/components/Header";
import DocumentUpload from "@/components/DocumentUpload";
import D3Graph from "@/components/d3-components/D3Graph";
import Sidebar from "@/components/Sidebar";
import ChatbotSidebar from "@/components/ChatbotSidebar";

// Define graph types
interface GraphNode {
  id: string;
  size: "large" | "medium" | "small";
  ring: number;
  description?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Expected response from generate-graph route
interface GraphResponse {
  graph: GraphData;
  docNamespace: string;
}

export default function Page() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [docNamespace, setDocNamespace] = useState<string>("");
  const [docTitle, setDocTitle] = useState<string>("Knowledge Explorer");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);

  // When document upload completes, store both the graph and namespace.
  const handleGraphData = (data: GraphResponse) => {
    setTimeout(() => {
      setGraphData(data.graph);
      setDocNamespace(data.docNamespace);
      setLoading(false);
    }, 1000);
  };

  // After the namespace is available, fetch an AI-generated title.
  useEffect(() => {
    if (docNamespace) {
      const fetchTitle = async () => {
        try {
          const res = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ namespace: docNamespace }),
          });
          if (!res.ok) throw new Error(`Failed to load title (status ${res.status})`);
          const data = await res.json();
          setDocTitle(data.title);
        } catch (err) {
          console.error("Error fetching document title:", err);
        }
      };
      fetchTitle();
    }
  }, [docNamespace]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handleCloseSidebar = () => {
    setSelectedNode(null);
  };

  return (
    <ThemeProvider theme={chatGPTDarkTheme}>
      {/* Header now shows a fixed left title, centered AI title, and a right button */}
      <Header aiTitle={docTitle} />
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 64px)",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        {/* Document Upload view */}
        {!graphData && !loading && (
          <Box sx={{ p: 2 }}>
            <DocumentUpload
              onGraphData={(data: GraphResponse) => {
                setLoading(true);
                handleGraphData(data);
              }}
            />
          </Box>
        )}

        {/* Loading indicator */}
        {loading && !graphData && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <CircularProgress color="primary" />
          </Box>
        )}

        {/* Render graph and sidebars when graphData is available */}
        {graphData && (
          <>
            <D3Graph graphData={graphData} onNodeClick={handleNodeClick} />
            <Sidebar selectedNode={selectedNode} onClose={handleCloseSidebar} docNamespace={docNamespace} />
            <ChatbotSidebar docNamespace={docNamespace} />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
