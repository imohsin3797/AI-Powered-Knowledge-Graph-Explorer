/* eslint-disable */
"use client";
import React, { useRef, useEffect } from "react";
import { Box } from "@mui/material";
import * as d3 from "d3";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  size: "large" | "medium" | "small";
  ring: number;
  description?: string;
  radius?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface D3GraphProps {
  graphData: GraphData | null;
  onNodeClick?: (node: GraphNode) => void;
}

// Base node radii by "size"
const BASE_RADIUS = {
  large: 30,
  medium: 20,
  small: 14,
};

function getTextWidth(text: string, fontSize = 12, fontFamily = "sans-serif") {
  if (typeof document === "undefined") return text.length * fontSize;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * fontSize;
  context.font = `${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
}

export default function D3Graph({ graphData, onNodeClick }: D3GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g");

    const { nodes, links } = graphData;

    const defs = container.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("width", "150%")
      .attr("height", "150%");
    filter.append("feDropShadow")
      .attr("dx", 2)
      .attr("dy", 2)
      .attr("stdDeviation", 2)
      .attr("flood-color", "#000")
      .attr("flood-opacity", 0.3);

    nodes.forEach(node => {
      const base = BASE_RADIUS[node.size] || 14;
      const textWidth = getTextWidth(node.id, 12);
      const neededRadius = textWidth / 2 + 8;
      node.radius = Math.max(base, neededRadius);
    });

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, any>(links)
        .id(d => d.id)
        .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => (d.radius || 20) + 4));
    simulationRef.current = simulation;

    setTimeout(() => {
      if (simulationRef.current) {
        simulationRef.current.force("center", null);
      }
    }, 1000);

    const linkSelection = container.selectAll<SVGLineElement, any>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    const nodeSelection = container.selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => d.radius || 14)
      .attr("fill", "#1f1f1f")
      .attr("filter", "url(#drop-shadow)")
      .on("click", (event, d) => {
        if (simulationRef.current) {
          simulationRef.current.force("center", null);
        }
        if (onNodeClick) onNodeClick(d);
      })
      .on("mouseover", function (event, d) {
        const currentRadius = parseFloat(d3.select(this).attr("r"));
        d3.select(this)
          .transition()
          .attr("r", currentRadius * 1.1);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .attr("r", d.radius || 14);
      })
      .call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on("start", (event, d) => {
            if (simulationRef.current) {
              simulationRef.current.force("center", null);
              if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (simulationRef.current) {
              if (!event.active) simulationRef.current.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          })
      );

    const labelSelection = container.selectAll<SVGTextElement, GraphNode>("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em");

    simulation.on("tick", () => {
      linkSelection
        .attr("x1", d =>
          typeof d.source !== "string" ? d.source.x ?? 0 : 0
        )
        .attr("y1", d =>
          typeof d.source !== "string" ? d.source.y ?? 0 : 0
        )
        .attr("x2", d =>
          typeof d.target !== "string" ? d.target.x ?? 0 : 0
        )
        .attr("y2", d =>
          typeof d.target !== "string" ? d.target.y ?? 0 : 0
        );

      nodeSelection
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);

      labelSelection
        .attr("x", d => d.x || 0)
        .attr("y", d => d.y || 0);
    });

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);

    return () => {
      simulation.stop();
    };
  }, [graphData, onNodeClick]);

  return (
    <Box
      component="svg"
      ref={svgRef}
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#343541",
        display: "block",
      }}
    />
  );
}

