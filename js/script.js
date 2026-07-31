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
        .sort((a,b) => b.year - a.year);

    // console.log("data", {columns, raw_data, data});

    return data;
}

function drawGraph(data, domain) {

    const margins = {
        top: 20, bottom: 50,
        left: 80, right: 50
    };

    const svg = d3.select("svg#graph");

    // clear the SVG between renders
    svg.html("")

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
        .style('fill', '#eee')

    // console.log("canva2", {
    //     data,
    //     canvas: svg,
    //     node: svg.node(),
    //     canvasWidth, canvasHeight,
    //     graphWidth, graphHeight
    // });

    const yearRange = domain;
    const filteredData = data.filter(d => d.year >= domain[0] && d.year <= domain[1])
    // console.log("yearRange", {yearRange});

    const co2Range = d3.extent(data, d=>d.co2);
    // console.log("co2Range", co2Range);

    const tempChangeFromCo2Range = d3.extent(data, d=>d.temperature_change_from_co2);
    // console.log("tempChangeFromCo2Range", tempChangeFromCo2Range);

    const xScale = d3.scaleLinear()
        .domain(yearRange)
        .range([0, graphWidth])

    const yCo2Scale = d3.scaleLinear()
        .domain(co2Range)
        .range([graphHeight, 0])

    const yTempChangeFromCo2Scale = d3.scaleLinear()
        .domain(tempChangeFromCo2Range)
        .range([graphHeight, 0])

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format(""))
        .ticks(6)


    mainG.append("g")
        .classed("x-axis", true)
        .attr("transform", `translate(0, ${graphHeight})`)
        .call(xAxis)

    mainG.append("text")
        .attr("x", graphWidth/2)
        .attr("y", graphHeight + margins.bottom - 20)
        .style("alignment-baseline", "hanging")
        .text("Year")

    const yCo2Axis = d3.axisLeft(yCo2Scale);
    mainG.append("g")
        .classed("y-left-axis", true)
        .call(yCo2Axis)

    mainG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -graphHeight/2)
        .attr("y", - margins.left + 5)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "hanging")
        .text("Co2 emmisions (million tonnes")


    const yTempChangeAxis = d3.axisRight(yTempChangeFromCo2Scale);
    mainG.append("g")
        .classed("y-right-axis", true)
        .attr("transform", `translate(${graphWidth}, 0)`)
        .call(yTempChangeAxis)

    mainG.append("text")
        .classed("y-label-text", true)
        .attr("transform", "rotate(-90)")
        .attr("x", -graphHeight/2)
        .attr("y", graphWidth + margins.right - 5)
        .style("text-anchor", "middle")
        .style("alignment-baseline", "baseline")
        .text("Temperature Change from Co2")

    const linesG = mainG.append("g")
        .classed("lines", true);

    // create a line generator for co2 per year
    const lineCo2 = d3.line()
        .x(d => xScale(d.year))
        .y(d => yCo2Scale(d.co2))

    // create a line generator for temperature_change_from_co2 per year
    const tempChangeFromCo2 = d3.line()
        .x(d => xScale(d.year))
        .y(d => yTempChangeFromCo2Scale(d.temperature_change_from_co2))

    const c02Path = linesG.append("path")
        .datum(filteredData)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("d", lineCo2)

    const tempChangeFromCo2Path = linesG.append("path")
        .datum(filteredData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("d", tempChangeFromCo2)

    // now build the legend
    const legendG = mainG.append("g")
        .attr("transform", `translate(5, ${-margins.top + 10})`)

    legendG.append('rect')
        .attr("x", 0)
        .attr("y", 1)
        .attr("width", 15)
        .attr("height", 2)
        .attr("fill", "blue")

    legendG.append('text')
        .classed("legend-text", true)
        .attr("x", 20)
        .attr("y", 3)
        .style("alignment-baseline", "middle")
        .style("text-anchor", "start")
        .text("CO2 emissions")

    legendG.append('rect')
        .attr("x", 130)
        .attr("y", 1)
        .attr("width", 15)
        .attr("height", 2)
        .attr("fill", "red")

    legendG.append('text')
        .classed("legend-text", true)
        .attr("x", 150)
        .attr("y", 3)
        .style("alignment-baseline", "middle")
        .style("text-anchor", "start")
        .text("Temp Change from CO2")

}

function render({sceneTitle, sceneNarative, sceneDomain}, data) {
    d3.select("#scene-title").text(sceneTitle);
    d3.select("#scene-narative").text(sceneNarative);

    drawGraph(data, sceneDomain);
}

const SCENE_ARRAY = [
    {
        sceneTitle: "Scene 1 Title", 
        sceneNarative: "Scene 1 Narrative", 
        sceneDomain: [1880, 1950]
    },
    {
        sceneTitle: "Scene 2 Title", 
        sceneNarative: "Scene 2 Narrative", 
        sceneDomain: [1950, 2024]
    },
    {
        sceneTitle: "Scene 3 Title", 
        sceneNarative: "Scene 3 Narrative", 
        sceneDomain: [1880, 2024]
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
        prevBtn.attr("disabled", sceneId <= sceneRange[0]?"":null)
        nextBtn.classed("btn-disabled", sceneId >= sceneId[1]);
        nextBtn.attr("disabled", sceneId >= sceneRange[1]?"":null)
    }

    prevBtn
        .on("click", () => {
            console.log("prev clicked");
            sceneId = Math.max(sceneId - 1, sceneRange[0]);
            setBtns();
            render(SCENE_ARRAY[sceneId - 1], data );
        });

    nextBtn
        .on("click", () => {
            console.log("next clicked");
            sceneId = Math.min(sceneId + 1, sceneRange[1]);
            setBtns();
            render(SCENE_ARRAY[sceneId - 1], data );
        });

    setBtns();
    render(SCENE_ARRAY[sceneId - 1], data );
}

document.addEventListener("DOMContentLoaded", main);