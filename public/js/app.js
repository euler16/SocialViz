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

force
    .nodes(graph.nodes)
    .links(graph.links)
    .start();

let link = svg.selectAll(".link")
    .data(graph.links)
    .enter().append("line")
    .attr("class", "link")
    .style("stroke-width", function (d) { return Math.sqrt(d.value); });

let node = svg.selectAll(".node")
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

d3.select("#clusterButton").on("click", function () {

    /******************/
    /*  Clustering    */
    /******************/
    netClustering.cluster(graph.nodes, graph.links);

    svg.selectAll(".node").transition().duration(2000).style("fill", function (d) { return color(d.cluster); });
});

function softMax() {
    
}