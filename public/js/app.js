const fs = require("fs");
const {dialog} = require("electron").remote

let graph, saveGraph;

let width = 960,
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
            visualize();
        })
    })
});

d3.select("#save-btn").on("click", function() {
    
    if (graph === undefined)
        return;

    dialog.showOpenDialog((filenames) => {
        if(filenames === undefined) {
            console.log("No file selected");
            return;
        }
        
        let json = JSON.stringify(saveGraph);
        fs.writeFile(filenames[0], json, function(err) {
            if (err) throw err;
            console.log("success");
        });
    });
});

d3.select("#clusterButton").on("click", function () {

    /******************/
    /*  Clustering    */
    /******************/
    netClustering.cluster(graph.nodes, graph.links);

    svg.selectAll(".node").transition().duration(2000).style("fill", function (d) { return color(d.cluster); });
});

d3.select("#addButton").on("click", function() {
    //testing

    graph["nodes"].push({
        "name": "Nilay",
        "score": 20
    });
    softMax();
    addLinks();
    console.log(graph["nodes"].length);
});

function softMax() {
    let sum = 0.0;
    for(let i=0;i<graph["nodes"].length;++i) {
        sum += graph["nodes"][i]["score"];
    }
    for (let i = 0; i < graph["nodes"].length; ++i) {
        graph["nodes"][i]["RAI"] = graph["nodes"][i]["score"]/sum;
    }
    console.log(graph["nodes"][0]);
}

function addLinks() {

    let edge; 

    graph["links"] = [];
    
    for(let i=0; i<graph["nodes"].length-1; ++i) {
        for (let j=i+1; j<graph["nodes"].length; ++j) {
            edge = {
                "source": i,
                "target": j,
                "value": (1.0 / (0.5 + Math.abs(graph["nodes"][i]["RAI"] - graph["nodes"][j]["RAI"])))
            }
            graph["links"].push(edge);
        }
    }
}