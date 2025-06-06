import React from 'react';
import Sketch from 'react-p5';
import { evaluate } from 'mathjs'; // Using math.js for safety

const P5Component = ({ vizType, equation, rangeX, rangeY, count, behavior, title, theme }) => {
    let setup, draw;
    const isDark = theme === 'dark';
    const bgColor = isDark ? 51 : 240;
    const strokeColor = isDark ? 255 : 0;
    const textColor = isDark ? 255 : 0;

    if (vizType === 'p5-math' && equation && rangeX && rangeY) {
        let parsedEq;
        try {
            parsedEq = evaluate.bind(null, equation.replace('y =', '').trim());
        } catch (e) {
            console.error("Math.js parse error:", e);
            parsedEq = () => NaN; // Set to NaN on error
        }

        setup = (p5, canvasParentRef) => {
            p5.createCanvas(500, 400).parent(canvasParentRef);
            p5.noLoop();
        };
        draw = (p5) => {
            p5.background(bgColor);
            p5.stroke(strokeColor); p5.fill(textColor);
            if (title) { p5.textAlign(p5.CENTER); p5.text(title, p5.width / 2, 20); }
            p5.translate(p5.width / 2, p5.height / 2); // Center origin
            p5.stroke(strokeColor, 100); // Axis lines
            p5.line(-p5.width / 2, 0, p5.width / 2, 0); // X-axis
            p5.line(0, -p5.height / 2, 0, p5.height / 2); // Y-axis
            p5.stroke(255, 100, 100); // Red for plot
            p5.noFill(); p5.beginShape();
            for (let px = -p5.width / 2; px <= p5.width / 2; px += 1) {
                const x = p5.map(px, -p5.width / 2, p5.width / 2, rangeX[0], rangeX[1]);
                try {
                    const y = parsedEq({ x: x });
                    if (!isNaN(y)) {
                       const py = p5.map(y, rangeY[0], rangeY[1], p5.height / 2, -p5.height / 2);
                       p5.vertex(px, py);
                    }
                } catch(e) {/* Ignore eval errors during loop */}
            }
            p5.endShape();
        };
    } else { // Fallback/Particle Placeholder
        setup = (p5, canvasParentRef) => p5.createCanvas(500, 400).parent(canvasParentRef);
        draw = (p5) => { p5.background(bgColor); p5.fill(textColor); p5.textAlign(p5.CENTER); p5.text(title || "p5 Visualization", p5.width / 2, p5.height / 2); };
    }

    return <Sketch setup={setup} draw={draw} />;
};

export default P5Component;