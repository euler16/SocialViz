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
            //softMax();
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

/* document.getElementById('addnode-btn').addEventListener('click',function() {
    let data = {
        "name": addName.value,
        "score": addScore.value
    };
    if (saveGraph === undefined) {
        saveGraph = {};
        saveGraph["nodes"] = [];
        graph = JSON.parse(JSON.stringify(saveGraph));
    }
    saveGraph["nodes"].push(data);
    addLinks();
    console.log(data);
}); */
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
    for(let i=0;i<graph["nodes"].length;++i) {
        sum += graph["nodes"][i]["score"];
    }
    for (let i = 0; i < graph["nodes"].length; ++i) {
        graph["nodes"][i]["RAI"] = graph["nodes"][i]["score"]/sum;
    }
}

function addLinks() {

    let edge1, edge2, diff, raiDiff, edgeWeight; 

    graph["links"] = [];
    console.log("addLinks!!");    
    /* for(let i=0; i<graph["nodes"].length-1; ++i) {
        for (let j=i+1; j<graph["nodes"].length; ++j) {
            
            diff = Math.abs(graph["nodes"][i]["score"] - graph["nodes"][j]["score"]);
            raiDiff = Math.abs(graph["nodes"][i]["RAI"] - graph["nodes"][j]["RAI"]);
            
            edgeWeight = (2.0 / (0.1 + raiDiff));
            edge1 = {
                "source": i,
                "target": j,
                "value": edgeWeight
            }
            graph["links"].push(edge1);

            if (diff < thresh) {
                for (let k=0; k<=thresh-diff; ++k) {
                    edge2 = {
                        "source": j,
                        "target": i,
                        "value": edgeWeight
                    }
                    graph["links"].push(edge2);
                }
            }
        }
    } */
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