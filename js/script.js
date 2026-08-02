const DATA_URL = 'data/owid-co2-data.csv';

async function loadData() {
    const raw_data = await d3.csv(DATA_URL);

    const columns = Object.keys(raw_data[0]);

    const data = raw_data
        .map(d => ({
            year: +d.year,
            co2: +d.co2,
            temperature_change_from_co2: +d.temperature_change_from_co2,
            country: d.country
        }))
        .filter(d =>
            Number.isFinite(d.year)
            && Number.isFinite(d.co2)
            && Number.isFinite(d.temperature_change_from_co2)
            && d.country == "World"
        )
        // Ascending sort so line drawing and bisecting function correctly
        .sort((a, b) => a.year - b.year);

    return data;
}

function drawGraph(data, domain, annotation, isScene3 = false) {
    const margins = {
        top: 20, bottom: 48,
        left: 70, right: 70
    };

    const svg = d3.select("svg#graph");

    // Clear SVG between renders
    svg.html("");

    const canvasWidth = +svg.attr("width");
    const canvasHeight = +svg.attr("height");

    const graphWidth = canvasWidth - margins.left - margins.right;
    const graphHeight = canvasHeight - margins.top - margins.bottom;

    const mainG = svg.append("g")
        .attr("transform", `translate(${margins.left}, ${margins.top})`);

    mainG.append('rect')
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", graphWidth)
        .attr("height", graphHeight)
        .style('fill', '#eee');

    const yearRange = domain;
    const filteredData = data.filter(d => d.year >= domain[0] && d.year <= domain[1]);

    const co2Range = d3.extent(data, d => d.co2);
    const tempChangeFromCo2Range = d3.extent(data, d => d.temperature_change_from_co2);

    const xScale = d3.scaleLinear()
        .domain(yearRange)
        .range([0, graphWidth]);

    const yCo2Scale = d3.scaleLinear()
        .domain(co2Range)
        .range([graphHeight, 0]);

    const yTempChangeFromCo2Scale = d3.scaleLinear()
        .domain(tempChangeFromCo2Range)
        .range([graphHeight, 0]);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format(""))
        .ticks(6);

    mainG.append("g")
        .classed("x-axis", true)
        .attr("transform", `translate(0, ${graphHeight})`)
        .call(xAxis);

    mainG.append("text")
        .attr("x", graphWidth / 2)
        .attr("y", graphHeight + margins.bottom - 20)
        .style("alignment-baseline", "hanging")
        .style("text-anchor", "middle")
        .text("Year");

    const yCo2Axis = d3.axisLeft(yCo2Scale);
    mainG.append("g")
        .classed("y-left-axis", true)
        .call(yCo2Axis);

    mainG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -graphHeight / 2)
        .attr("y", - margins.left / 2 - 20)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "hanging")
        .text("CO2 Emissions (Million Tonnes)");

    const yTempChangeAxis = d3.axisRight(yTempChangeFromCo2Scale);
    mainG.append("g")
        .classed("y-right-axis", true)
        .attr("transform", `translate(${graphWidth}, 0)`)
        .call(yTempChangeAxis);

    mainG.append("text")
        .classed("y-label-text", true)
        .attr("transform", "rotate(-90)")
        .attr("x", -graphHeight / 2)
        .attr("y", graphWidth + margins.right / 2 + 15)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "baseline")
        .text("Temp. change from CO₂ (°C)");

    const linesG = mainG.append("g").classed("lines", true);

    const lineCo2 = d3.line()
        .x(d => xScale(d.year))
        .y(d => yCo2Scale(d.co2));

    const tempChangeFromCo2 = d3.line()
        .x(d => xScale(d.year))
        .y(d => yTempChangeFromCo2Scale(d.temperature_change_from_co2));

    linesG.append("path")
        .datum(filteredData)
        .attr("fill", "none")
        .attr("stroke", "#006652")
        .attr("stroke-width", 2.5)
        .attr("d", lineCo2);

    linesG.append("path")
        .datum(filteredData)
        .attr("fill", "none")
        .attr("stroke", "#C84B31")
        .attr("stroke-width", 2.5)
        .attr("d", tempChangeFromCo2);

    // Build legend
    const legendG = mainG.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(100, ${-margins.top + 10})`);

    legendG.append('rect')
        .attr("x", 0).attr("y", 1).attr("width", 15).attr("height", 2).attr("fill", "#006652");

    legendG.append('text')
        .classed("legend-text", true)
        .attr("x", 20).attr("y", 3)
        .style("alignment-baseline", "middle")
        .style("text-anchor", "start")
        .text("CO2 emissions");

    legendG.append('rect')
        .attr("x", 130).attr("y", 1).attr("width", 15).attr("height", 2).attr("fill", "#C84B31");

    legendG.append('text')
        .classed("legend-text", true)
        .attr("x", 150).attr("y", 3)
        .style("alignment-baseline", "middle")
        .style("text-anchor", "start")
        .text("Temp Change from CO2");

    // Static scene annotations (Scenes 1 & 2)
    if (annotation) {
        const annotationDatum = filteredData.find(d => d.year == annotation.year);
        if (annotationDatum) {
            const annotationCtx = [
                {
                    note: {
                        title: annotation.title,
                        label: typeof annotation.label == "function"
                            ? annotation.label(annotationDatum)
                            : annotation.label,
                        wrap: annotation.wrap || 200,
                        padding: 6,
                        bgPadding: 4,
                    },
                    x: xScale(annotationDatum.year),
                    y: yTempChangeFromCo2Scale(annotationDatum.temperature_change_from_co2),
                    dx: annotation.dx !== undefined ? annotation.dx : -50,
                    dy: annotation.dy !== undefined ? annotation.dy : -50,
                    color: "black"
                }
            ];

            const annotationG = mainG.append("g").attr("id", "graph-annotation");
            annotationG.call(
                d3.annotation(d3.annotationCallout).annotations(annotationCtx)
            );
        }
    }

    // Scene 3 Interactive Hover Line & Custom Tooltip
    if (isScene3) {
        const hoverLine = mainG.append("line")
            .attr("y1", 0).attr("y2", graphHeight)
            .attr("stroke", "#888888")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,4")
            .style("opacity", 0);

        const co2Dot = mainG.append("circle")
            .attr("r", 5)
            .attr("fill", "#006652")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .style("opacity", 0);

        const tempDot = mainG.append("circle")
            .attr("r", 5)
            .attr("fill", "#C84B31")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .style("opacity", 0);

        const tooltip = d3.select("#tooltip");
        const bisectYear = d3.bisector(d => d.year).left;

        mainG.append("rect")
            .attr("width", graphWidth)
            .attr("height", graphHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseover", () => {
                hoverLine.style("opacity", 1);
                co2Dot.style("opacity", 1);
                tempDot.style("opacity", 1);
                if (!tooltip.empty()) tooltip.style("opacity", 1);
            })
            .on("mouseout", () => {
                hoverLine.style("opacity", 0);
                co2Dot.style("opacity", 0);
                tempDot.style("opacity", 0);
                if (!tooltip.empty()) tooltip.style("opacity", 0);
            })
            .on("mousemove", function(event) {
                const [mouseX] = d3.pointer(event, this);
                const xYear = xScale.invert(mouseX);
                
                // Bisect over filteredData so hover snaps accurately to active domain
                const index = bisectYear(filteredData, xYear, 1);
                const d0 = filteredData[index - 1];
                const d1 = filteredData[index];
                if (!d0 && !d1) return;

                let d = d0;
                if (d1 && d0) {
                    d = xYear - d0.year > d1.year - xYear ? d1 : d0;
                }

                const xPos = xScale(d.year);
                const yCo2Pos = yCo2Scale(d.co2);
                const yTempPos = yTempChangeFromCo2Scale(d.temperature_change_from_co2);

                hoverLine.attr("x1", xPos).attr("x2", xPos);
                co2Dot.attr("cx", xPos).attr("cy", yCo2Pos);
                tempDot.attr("cx", xPos).attr("cy", yTempPos);

                if (!tooltip.empty()) {
                    tooltip.html(`
                        <div class="tooltip-title">Year ${d.year}</div>
                        <div class="tooltip-row">CO<sub>2</sub> emissions: ${d3.format(",")(Math.round(d.co2))} Mt</div>
                        <div class="tooltip-row">Temperature change: ${d.temperature_change_from_co2.toFixed(3)} °C</div>
                    `);

                    // Adjust offset if cursor is near right edge to prevent overflow
                    const xOffset = xPos > graphWidth * 0.75 ? -210 : 15;
                    
                    tooltip
                        .style("left", `${event.pageX + xOffset}px`)
                        .style("top", `${event.pageY - 30}px`);
                }
            });
    }
}

function render(scene, data, sceneIndex) {
    d3.select("#scene-title").text(scene.sceneTitle);
    d3.select("#scene-narative").text(scene.sceneNarative);

    const controls = d3.select("#scene3-controls");

    if (sceneIndex === 2) { // Scene 3
        controls.style("display", "flex");

        d3.selectAll(".filter-btn").on("click", function() {
            d3.selectAll(".filter-btn").classed("active", false);
            d3.select(this).classed("active", true);

            const selectedDomain = JSON.parse(this.getAttribute("data-domain"));
            drawGraph(data, selectedDomain, null, true);
        });

        drawGraph(data, scene.sceneDomain, null, true);
    } else {
        controls.style("display", "none");
        drawGraph(data, scene.sceneDomain, scene.sceneAnnotation, false);
    }
}

const SCENE_ARRAY = [
    {
        sceneTitle: "1880 - 1950: Early Industrialization",
        sceneNarative: "Between 1880 and 1950, global carbon emissions grew steadily, but remained relatively low due to a lack of human energy consumption and industrial capacity.",
        sceneDomain: [1880, 1950],
        sceneAnnotation: {
            year: 1930,
            title: "Mid-Century Stability",
            label: "For nearly a century, global carbon emissions grew gradually, keeping average global surface temperatures within a stable baseline range."
        },
    },
    {
        sceneTitle: "1950 - Today: The Great Acceleration",
        sceneNarative: "After 1950, rapid global industrialization and a heavy reliance on oil and gas, especially for motorization, caused a drastic uptick in CO2 emissions.",
        sceneDomain: [1950, 2024],
        sceneAnnotation: {
            year: 1970,
            title: "Massive Acceleration",
            label: "Post-1970 industrial growth caused carbon emissions to explode. Surface temperatures closely tracked this surge, breaking historical records over the last decade.",
            dx: 110,
            dy: 2,
            wrap: 220
        },
    },
    {
        sceneTitle: "1880 - Today: The Global Crisis",
        sceneNarative: "In the 21st century, the global population is consuming energy at levels like never before, pushing CO2 emission levels to record highs and causing global temperatures to rise with it.",
        sceneDomain: [1880, 2024],
    },
];

async function main() {
    const data = await loadData();

    const sceneRange = [1, 3];
    let sceneId = sceneRange[0];

    const prevBtn = d3.select("button#btn-prev");
    const nextBtn = d3.select("button#btn-next");

    const setBtns = () => {
        prevBtn.classed("btn-disabled", sceneId <= sceneRange[0]);
        prevBtn.attr("disabled", sceneId <= sceneRange[0] ? "" : null);
        nextBtn.classed("btn-disabled", sceneId >= sceneRange[1]);
        nextBtn.attr("disabled", sceneId >= sceneRange[1] ? "" : null);
    };

    prevBtn.on("click", () => {
        sceneId = Math.max(sceneId - 1, sceneRange[0]);
        setBtns();
        render(SCENE_ARRAY[sceneId - 1], data, sceneId - 1);
    });

    nextBtn.on("click", () => {
        sceneId = Math.min(sceneId + 1, sceneRange[1]);
        setBtns();
        render(SCENE_ARRAY[sceneId - 1], data, sceneId - 1);
    });

    setBtns();
    render(SCENE_ARRAY[sceneId - 1], data, sceneId - 1);
}

document.addEventListener("DOMContentLoaded", main);