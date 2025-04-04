/* eslint-disable */
"use client";
import React, { useState } from "react";
import { Button, Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LoadingScreen from "./LoadingScreen";

// Shared types (or import from a shared file)
export interface GraphNode {
  id: string;
  size: "large" | "medium" | "small";
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
  docNamespace: string;
}

interface DocumentUploadProps {
  onGraphData: (data: GraphResponse) => void;
}

export default function DocumentUpload({ onGraphData }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError("");
    setIsLoading(true);

    try {
      // STEP 0: Reading file
      setStep(0);
      setLoadingMessage("Reading file…");
      const arrayBuffer = await file.arrayBuffer();

      // STEP 1: Converting to Base64
      setStep(1);
      setLoadingMessage("Converting to Base64…");
      const uint8Arr = new Uint8Array(arrayBuffer);
      let binaryStr = "";
      for (let i = 0; i < uint8Arr.length; i++) {
        binaryStr += String.fromCharCode(uint8Arr[i]);
      }
      const pdfBase64 = btoa(binaryStr);

      // STEP 2: Call generate-graph API without streaming
      const res = await fetch("/api/generate-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfBase64, config: {} }),
      });

      // Read response as text first.
      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      
      let data: GraphResponse;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse JSON. Response text:", text);
        throw new Error("Failed to parse JSON from response");
      }
      
      if (data.graph && data.docNamespace) {
        onGraphData(data);
      } else {
        throw new Error("Invalid response from the server");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 4,
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          mb: 4,
          background: "linear-gradient(45deg, silver, #ccc)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Upload a Document to get Started
      </Typography>

      <Box
        sx={{
          border: "2px dashed #555",
          borderRadius: "8px",
          p: 6,
          mb: 4,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: "#aaa", mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Drag and drop your file here or click to select
        </Typography>
        <label htmlFor="file-upload">
          <Button variant="outlined" component="span">
            Choose File
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected: {file.name}
          </Typography>
        )}
      </Box>

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!file || isLoading}
        sx={{
          mb: 2,
          backgroundColor: "#333",
          color: "#fff",
          "&:hover": {
            backgroundColor: "#555",
          },
        }}
      >
        {isLoading ? "Processing..." : "Upload & Generate Graph"}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {isLoading && <LoadingScreen />}
    </Box>
  );
}
