"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  useTheme,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReactMarkdown from "react-markdown";

interface NodeData {
  id: string;
  size: "large" | "medium" | "small";
  ring: number;
}

interface VideoLink {
  url: string;
  title: string;
  thumbnail: string;
}

interface ArticleLink {
  url: string;
  title: string;
  thumbnail: string;
}

interface SidebarProps {
  selectedNode: NodeData | null;
  onClose: () => void;
  docNamespace: string;
}

export default function Sidebar({ selectedNode, onClose, docNamespace }: SidebarProps) {
  const theme = useTheme();

  const [summary, setSummary] = useState<string>("");
  const [youtubeLinks, setYoutubeLinks] = useState<VideoLink[]>([]);
  const [articleLinks, setArticleLinks] = useState<ArticleLink[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  useEffect(() => {

    if (!selectedNode) {
      setSummary("");
      setYoutubeLinks([]);
      setArticleLinks([]);
      return;
    }

    const fetchNodeData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/node-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept: selectedNode.id, namespace: docNamespace }),
        });
        if (!res.ok)
          throw new Error(`Failed to load node info (status ${res.status})`);
        const data = await res.json();
        setSummary(data.summary || "");
        setYoutubeLinks(data.youtubeLinks || []);
        setArticleLinks(data.articleLinks || []);
      } catch (err) {
        console.error("Error fetching node info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeData();
  }, [selectedNode, docNamespace]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Drawer
      anchor="left"
      variant="persistent"
      open={Boolean(selectedNode)}
      onClose={onClose}
      hideBackdrop
      ModalProps={{ hideBackdrop: true }}
      PaperProps={{
        sx: {
          width: sidebarWidth,
          top: "-10px",
          position: "absolute",
          backgroundColor: "background.paper",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Concept Summary</Typography>
        <IconButton onClick={onClose} sx={{ color: "text.primary" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, p: 2, height: "calc(100% - 64px)", overflowY: "auto" }}>
        {selectedNode && (
          <>
            <Typography variant="h6" gutterBottom>
              {selectedNode.id}
            </Typography>

            {loading ? (
              <Typography>Loading details...</Typography>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Detailed Summary
                  </Typography>
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    🎥 Related YouTube Videos
                  </Typography>
                  {youtubeLinks.length === 0 ? (
                    <Typography variant="body2">No videos found.</Typography>
                  ) : (
                    youtubeLinks.map((video, idx) => (
                      <Card
                        key={idx}
                        sx={{ display: "flex", mb: 1, cursor: "pointer" }}
                        onClick={() => window.open(video.url, "_blank")}
                      >
                        <CardMedia
                          component="img"
                          sx={{ width: 100 }}
                          image={video.thumbnail}
                          alt={video.title}
                        />
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                            {video.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    📚 Further Reading
                  </Typography>
                  {articleLinks.length === 0 ? (
                    <Typography variant="body2">No articles found.</Typography>
                  ) : (
                    articleLinks.map((article, idx) => (
                      <Card
                        key={idx}
                        sx={{ display: "flex", mb: 1, cursor: "pointer" }}
                        onClick={() => window.open(article.url, "_blank")}
                      >
                        {article.thumbnail && (
                          <CardMedia
                            component="img"
                            sx={{ width: 100 }}
                            image={article.thumbnail}
                            alt={article.title}
                          />
                        )}
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                            {article.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>
      <Box
        sx={{
          width: 4,
          cursor: "col-resize",
          backgroundColor: "divider",
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
      />
    </Drawer>
  );
}
