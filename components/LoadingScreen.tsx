"use client";
import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        bgcolor: "rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="h6" sx={{ mt: 2, color: "#fff" }}>
        Generating Graph...
      </Typography>
    </Box>
  );
}
