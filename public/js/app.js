const fs = require("fs");
const {dialog} = require("electron").remote

let graph, saveGraph, thresh = 4;
// form 
let addName = document.getElementById("add-name");
let addScore = document.getElementById("add-score");

let width = 600,
    height = 500;

let color = d3.scale.category20();

let force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

let svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height);

let link, node;
let dataset = [];
// BAR
let w = width;
let h = 80;
let barPadding = 1;

let xScale = d3.scale.ordinal()
    .domain(d3.range(0))
    .rangeRoundBands([0, w], 0.05);
let yScale;

let barSvg = d3.select("#barchart")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

let bars, labels ;






function visualize() {
    
    d3.selectAll("svg > *").remove();

    force
        .nodes(graph.nodes)
        .links(graph.links)
        .start();

    link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function (d) { return Math.sqrt(d.value); });

    node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 5)
        .call(force.drag);

    node.append("title")
        .text(function (d) { return d.name; });
        
    force.on("tick", function () {
        link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        node.attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    });
    barViz();
    console.log("visualized!!");
}


d3.select("#open-btn").on("click", function() {
    dialog.showOpenDialog((filenames)=> {
        if(filenames === undefined) {
            console.log("No file selected");
            return;
        }
        fs.readFile(filenames[0], function(err, data) {
            if (err) throw err;
            graph = JSON.parse(data);
            saveGraph = JSON.parse(JSON.stringify(graph));
            //console.log(graph);
            softMax();
            addLinks();
            visualize();
            console.log('hello');
        })
    })
});

d3.select("#save-btn").on("click", function() {
    
    if (graph === undefined)
        return;
    json = JSON.stringify(saveGraph);
    fs.writeFile('./data.json', json, function (err) {
        if (err) throw err;
        //alert("data saved in data.json")
        console.log('saved');
    });
});

d3.select("#addnode-btn").on("click", function() {
    let data = {
        "name": addName.value,
        "score": addScore.value
    };
    if (saveGraph === undefined) {
        saveGraph = {};
        saveGraph["nodes"] = [];
    }
    console.log(data);

    saveGraph["nodes"].push(data);
    graph = JSON.parse(JSON.stringify(saveGraph));
    softMax();
    addLinks();
    visualize(); 
});

d3.select('#screenshot-btn').on('click', function() {
    saveSvgAsPng(document.getElementsByTagName("svg")[0], "plot.png", {
         scale: 1, backgroundColor: "#FFFFFF" 
    });
});

d3.select("#clusterButton").on("click", function () {

    /******************/
    /*  Clustering    */
    /******************/
    graph = JSON.parse(JSON.stringify(saveGraph));
    softMax();
    
    addClusterLinks(); // removes old links
    visualize();
    netClustering.cluster(graph.nodes, graph.links);
    svg.selectAll(".node")
       .transition()
       .duration(2000)
       .style("fill", function (d) { return color(d.cluster); });
    
});

function softMax() {
    let sum = 0.0;
    dataset = [];
    for(let i=0;i<graph["nodes"].length;++i) {
        sum += (Math.exp(graph["nodes"][i]["score"]/100));
    }
    for (let i = 0; i < graph["nodes"].length; ++i) {
        graph["nodes"][i]["RAI"] = (Math.exp(graph["nodes"][i]["score"]/100.0))/sum;
        dataset.push(Number(graph["nodes"][i]["RAI"].toFixed(3)));
    }
}

function addLinks() {

    let edge1, edge2, diff, raiDiff, edgeWeight; 

    graph["links"] = [];
    console.log("addLinks!!");    
    
}

function addClusterLinks() {
    let edge1, edge2, diff, raiDiff, edgeWeight;

    graph["links"] = [];

    for (let i = 0; i < graph["nodes"].length - 1; ++i) {
        for (let j = i + 1; j < graph["nodes"].length; ++j) {

            diff = Math.abs(graph["nodes"][i]["score"] - graph["nodes"][j]["score"]);
            raiDiff = Math.abs(graph["nodes"][i]["RAI"] - graph["nodes"][j]["RAI"]);

            edgeWeight = (2.0 / (0.1 + raiDiff));
            if (diff < thresh) {
                    edge2 = {
                        "source": j,
                        "target": i,
                        "value": edgeWeight
                    }
                    graph["links"].push(edge2);
            }
        }
    }
}



// Visualization attributes
//-----------

// Scales
//-----------
function barViz() {
    xScale = d3.scale.ordinal()
        .domain(d3.range(dataset.length))
        .rangeRoundBands([0, w], 0.05);

    yScale = d3.scale.linear()
        .domain([0, d3.max(dataset)])
        .range([0, h]);

    bars = barSvg.selectAll('rect')
        .data(graph["nodes"])
        .enter()
        .append('rect')
        .attr('x', function (d, i) {
            return xScale(i);
        })
        .attr('y', function (d) {
            return h - yScale(d["RAI"]);
        })
        .attr('width', xScale.rangeBand())
        .attr('height', function (d) {
            return yScale(d["RAI"]);
        })
        .attr('fill', function (d) {
            return 'rgb(0, 191, 255)';//" + (d * 255) + ")';
        })
        .on('click', function () {
            sortBars();
        })
        .on('mouseover', function (d) {
            var xPos, yPos;

            //Get this bar's x/y values, then augment for the tooltip
            xPos = 110+parseFloat(d3.select(this).attr("x")) + xScale.rangeBand() / 2;
            yPos = 400+parseFloat(d3.select(this).attr("y")) / 2 + h / 2;

            d3.select('#bartooltip')
                .style('left', xPos + 'px')
                .style('top', yPos + 'px')
                .select('#value')
                .text(Number(d["RAI"].toFixed(2)));

            //Show the tooltip
            d3.select('#bartooltip').classed('hidden', false);
        })
        .on('mouseout', function () {
            //Remove the tooltip
            d3.select('#bartooltip').classed('hidden', true);
        });

    labels = barSvg.selectAll("text")
        .data(graph["nodes"])
        .enter()
        .append("text")
        .style("pointer-events", "none")
        .text(function (d) {
            return d["name"];
        })
        .attr("text-anchor", "middle")
        .attr("x", function (d, i) {
            return xScale(i) + xScale.rangeBand() / 2;
        })
        .attr("y", function (d) {
            return h - yScale(d["RAI"]) + 14;
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("fill", "white")
        .on('click', function () {
            sortBars();
        });

}

var sortOrder = false;

var sortBars = function () {
    sortOrder = !sortOrder;

    barSvg.selectAll('rect')
        .sort(function (a, b) {
            return sortCallback(a, b, sortOrder);
        })
        .transition()
        .delay(function (d, i) {
            return i * 50;
        })
        .duration(1000)
        .attr("x", function (d, i) {
            return xScale(i);
        });

    barSvg.selectAll('text')
        .sort(function (a, b) {
            return sortCallback(a, b, sortOrder);
        })
        .transition()
        .delay(function (d, i) {
            return i * 50;
        })
        .duration(1000)
        .attr("x", function (d, i) {
            return xScale(i) + xScale.rangeBand() / 2;
        });
};

var sortCallback = function (a, b, order) {
    if (order) {
        return d3.ascending(a["RAI"], b["RAI"]);
    } else {
        return d3.descending(a["RAI"], b["RAI"]);
    }
};