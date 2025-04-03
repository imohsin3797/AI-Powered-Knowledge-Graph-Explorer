"use client";
import React from "react";
import { AppBar, Toolbar, Box, Typography, Button } from "@mui/material";

interface HeaderProps {
  aiTitle: string;
}

export default function Header({ aiTitle }: HeaderProps) {
  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ flex: 1, textAlign: "left" }}>
          <Typography variant="h6">NodeVista</Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {aiTitle}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: "right" }}>
          <Button color="inherit">Graph Gallery</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
