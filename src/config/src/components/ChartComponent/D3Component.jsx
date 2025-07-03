 import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const D3Component = ({ vizType, data, title, theme }) => {
    const d3Ref = useRef(null);
    const isDark = theme === 'dark';
    const textColor = isDark ? '#fff' : '#000';

    useEffect(() => {
        if (!d3Ref.current || !data) return;
        const svg = d3.select(d3Ref.current);
        svg.selectAll("*").remove();

        const width = 500;
        const height = 400;
        svg.attr('width', '100%').attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

        if (title) { /* ... Add Title ... */ }

        if (vizType === 'd3-bubble' && Array.isArray(data)) {
            // --- Bubble Chart Logic (Simplified) ---
            const root = d3.pack().size([width - 2, height - 40]).padding(5)(d3.hierarchy({ children: data }).sum(d => d.value || 1));
            const color = d3.scaleOrdinal(d3.schemeTableau10);
            const node = svg.selectAll("g").data(root.leaves()).enter().append("g")
                .attr("transform", d => `translate(${d.x + 1},${d.y + 31})`);
            node.append("circle").attr("r", d => d.r).style("fill", d => color(d.data.group || d.data.label));
            node.append("text").text(d => d.data.label.substring(0, d.r / 3))
                .style("font-size", d => Math.min(2 * d.r, (2 * d.r - 8) / d.data.label.length * 1.5) + "px")
                .attr("dy", ".35em").attr("text-anchor", "middle").style("fill", "#fff");
        } else if (vizType === 'd3-force' && data.nodes && data.links) {
            // --- Force Directed Logic (Simplified) ---
            const links = data.links.map(d => ({...d}));
            const nodes = data.nodes.map(d => ({...d}));
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(50))
                .force("charge", d3.forceManyBody().strength(-150))
                .force("center", d3.forceCenter(width / 2, height / 2));
            const link = svg.append("g").attr("stroke", "#999").attr("stroke-opacity", 0.6)
              .selectAll("line").data(links).join("line").attr("stroke-width", d => Math.sqrt(d.value || 1));
            const node = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5)
              .selectAll("circle").data(nodes).join("circle").attr("r", 5).attr("fill", d3.scaleOrdinal(d3.schemeCategory10)(d => d.group));
            node.append("title").text(d => d.id);
            simulation.on("tick", () => {
              link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
              node.attr("cx", d => d.x).attr("cy", d => d.y);
            });
        }
    }, [vizType, data, title, theme]);

    return <svg ref={d3Ref}></svg>;
};

export default D3Component;