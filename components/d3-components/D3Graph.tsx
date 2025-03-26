"use client" 

import React, { useRef, useEffect } from "react"
import * as d3 from "d3"

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string
}

const data = {
  nodes: [
    { id: "Topic" },
    { id: "SubTopic1" },
    { id: "SubTopic2" },
    { id: "Related1" },
    { id: "Related2" },
  ] as NodeDatum[],
  links: [
    { source: "Topic", target: "SubTopic1" },
    { source: "Topic", target: "SubTopic2" },
    { source: "SubTopic1", target: "Related1" },
    { source: "SubTopic2", target: "Related2" },
  ] as d3.SimulationLinkDatum<NodeDatum>[],
}

export default function D3Graph() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 600
    const height = 400

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const simulation = d3
      .forceSimulation<NodeDatum>(data.nodes)
      .force("charge", d3.forceManyBody<NodeDatum>().strength(-200))
      .force(
        "link",
        d3
          .forceLink<NodeDatum, d3.SimulationLinkDatum<NodeDatum>>(data.links)
          .id(d => d.id)
          .distance(100)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke-width", 2)

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", "steelblue")
      .call(
        d3.drag<SVGCircleElement, NodeDatum>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    const label = svg
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .attr("dy", "-1.2em")

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as NodeDatum).x ?? 0)
        .attr("y1", d => (d.source as NodeDatum).y ?? 0)
        .attr("x2", d => (d.target as NodeDatum).x ?? 0)
        .attr("y2", d => (d.target as NodeDatum).y ?? 0)

      node
        .attr("cx", d => d.x ?? 0)
        .attr("cy", d => d.y ?? 0)

      label
        .attr("x", d => d.x ?? 0)
        .attr("y", d => d.y ?? 0)
    })
  }, [])

  return (
    <svg
      ref={svgRef}
      width={600}
      height={400}
      style={{ border: "1px solid #ccc" }}
    />
  )
}
