const fs = require("fs");
const { dialog, app } = require("electron").remote
const { DataTable } = require("simple-datatables");
// variables
let state = 1; // 0 - data mode 1,2,3,4,5 Time mode
/**
 * score is an array in saveGraph 
 * timeGraphs[state-1] is the graph to be used.
 * saveGraph[nodes] = tableGraph
 */
let timeGraphs = [], saveGraph, tableGraph, thresh = 10;

let width = 600, height = 500;

// buttons
let clusterBtn;

let color = d3.scale.category20();
let svg, link, node;

let force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

let dataset = [];

// bar chart
let w = width;
let h = 80;
let barPadding = 1;
let bars, labels;

let yScale, xScale = d3.scale.ordinal().domain(d3.range(0))
    .rangeRoundBands([0, w], 0.05);

/* panes */
let graphPane, tablePane;
/* tab buttons */
let tabs = [], dataTab;

/* dataMode elements */
let saveBtn, loadBtn, tableAdd;
let nameField, scoreField = [];
let table = document.querySelector("#data-table");
const headers = {
    "headings": [
        "name",
        "score1",
        "score2",
        "score3",
        "score4",
        "score5"
    ]
}
const dataTable = new DataTable(table, {
    data: headers,
    searchable: false,
    
});


function init() {

    let tab;

    for (let i = 1; i <= 5; ++i) {
        tab = document.getElementById("Tab" + i);
        tab.addEventListener("click", tabClick);
        tabs.push(tab);
    }

    graphPane = document.getElementById("graph-pane");
    tablePane = document.getElementById("table-pane");

    dataTab = document.getElementById("data-tab");
    dataTab.addEventListener("click", dataTabClick);

    loadBtn = document.getElementById("load-btn");
    loadBtn.addEventListener("click", loadBtnClick);

    saveBtn = document.getElementById("save-btn");
    saveBtn.addEventListener("click", saveBtnClick);

    //clusterBtn = document.getElementById("cluster-btn");
    //clusterBtn.addEventListener("click", clusterBtnClick);

    tableAdd = document.getElementById("add-btn");
    tableAdd.addEventListener("click", tableAddClick);

    nameField = document.getElementById("add-name");
    for(let i=1; i<=5; ++i) {
        scoreField.push(document.getElementById("add-score"+i));
    }
    svg = d3.select("#graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    state = 0;
    setupDataMode();
}

function setupTimeMode() {
    graphPane.classList.remove("hidden");
    tablePane.classList.add("hidden");
}

function setupDataMode() {
    graphPane.classList.add("hidden");
    tablePane.classList.remove("hidden");
}


function visualize() {

    if (state == 0) // DataMode
        return;

    let q = state - 1;
    d3.selectAll("svg > *").remove();
    force
        .nodes(timeGraphs[q].nodes)
        .links(timeGraphs[q].links)
        .start();

    link = svg.selectAll(".link")
        .data(timeGraphs[q].links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function (d) { return Math.sqrt(d.value); });

    node = svg.selectAll(".node")
        .data(timeGraphs[q].nodes)
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

// event handlers

function tabClick() {
    /* event handler for tab clicks */

    id = parseInt(event.srcElement.id.slice(-1));
    if (state === 0) {/* experimental */

        dataTab.className = "tab-item";
        setupTimeMode();
    } else {
        tabs[state - 1].className = "tab-item"; // switch off the previous
    }
    tabs[id - 1].className = "tab-item active";
    state = id;
    console.log("tab click working " + id + " " + state);
    /* visualization code */
}

function dataTabClick() {
    /* event handler for data tab */
    console.log("data tab");
    if (state !== 0)
        setupDataMode();

    tabs[state - 1].className = "tab-item";
    dataTab.className = "tab-item active";
    state = 0;
}


function loadBtnClick() {
    console.log("loadBtn click!!");

    dialog.showOpenDialog((filenames) => {

        if (filenames === undefined) {
            console.log("No file selected");
            return;
        }
        fs.readFile(filenames[0], function (err, data) {
            if (err) throw err;
            dataTable.destroy();
            dataTable.init({
                data: headers,
                searchable: false
            });
            tableGraph = JSON.parse(data);

            syncGraphs();
            console.log(tableGraph["nodes"]);
            //dataTable.rows().add(["cell","bell","dell","kell","jell","rell"]);
            let newRows = [];
            for (let i=0; i<tableGraph["nodes"].length; ++i) {
                let r = [
                    tableGraph["nodes"][i]["name"],
                    tableGraph["nodes"][i]["score1"].toString(),
                    tableGraph["nodes"][i]["score2"].toString(),
                    tableGraph["nodes"][i]["score3"].toString(),
                    tableGraph["nodes"][i]["score4"].toString(),
                    tableGraph["nodes"][i]["score5"].toString()
                ];
                //dataTable.rows().add(r);
                newRows.push(r);
            }
            dataTable.rows().add(newRows)
        });
    });
}

function saveBtnClick() {

    if (saveGraph === undefined)
        return;
    syncGraphs();
    console.log('saveBtn click');
    const options = {
        defaultPath: app.getAppPath() + '/data.json',
        securityScopedBookmarks: true
    }
    dialog.showSaveDialog(null,options, function(filename) {
        if(filename === undefined) {
            console.log("no file selected");
            return;
        }
        json = JSON.stringify(saveGraph);
        fs.writeFile(filename,json, function(err) {
            if(err) throw err;
            console.log('saved');
        })
    });
}

function tableAddClick() {
    console.log("add button clicked");
    let newNode = {
        "name": nameField.value,
        "score1": scoreField[0].value,
        "score2": scoreField[1].value,
        "score3": scoreField[2].value,
        "score4": scoreField[3].value,
        "score5": scoreField[4].value,
    }
    let newRow = [
        nameField.value,
        scoreField[0].value,
        scoreField[1].value,
        scoreField[2].value,
        scoreField[3].value,
        scoreField[4].value
    ]
    console.log(newNode);
    if(tableGraph === undefined) {
        tableGraph = {
            "nodes":[]
        }
    }
    
    tableGraph["nodes"].push(newNode);
    syncGraphs();
    dataTable.rows().add(newRow);
}

function clusterBtnClick() {

    // need to change this to accomodate different times

    graph = JSON.parse(JSON.stringify(saveGraph));
    softMax();

    addClusterLinks(); // removes old links
    visualize();
    netClustering.cluster(graph.nodes, graph.links);
    svg.selectAll(".node")
        .transition()
        .duration(2000)
        .style("fill", function (d) { return color(d.cluster); });
}

// auxialiary function

/**
 * 
 * @param {*} state : necessary as softmax is part of a for loop for every state
 */
function softMax(state) {
    let sum = 0.0;
    dataset = [];
    let idx = state - 1;
    //console.log(timeGraphs);
    for (let i = 0; i < timeGraphs[idx]["nodes"].length; ++i) {
        sum += (Math.exp(timeGraphs[idx]["nodes"][i]["score"] / 100));
    }
    for (let i = 0; i < timeGraphs[idx]["nodes"].length; ++i) {
        timeGraphs[idx]["nodes"][i]["RAI"] = (Math.exp(timeGraphs[idx]["nodes"][i]["score"] / 100.0)) / sum;
        dataset.push(Number(timeGraphs[idx]["nodes"][i]["RAI"].toFixed(3)));
    }
}

/**
 *  synchronize the three graphs
 * 1. timeGraph : an array of graphs
 * 2. saveGraph : the representation to save
 * 3. tableGraph : temporary representation for table 
 */

function syncGraphs() {
    /* writing this is the key */
    saveGraph = JSON.parse(JSON.stringify(tableGraph));
    console.log(saveGraph);
    let t;
    timeGraphs = [];
    for (let k=0; k<5; ++k) {
        timeGraphs.push({
            "nodes": [],
            "links": []
        });
    }
    
    let n = saveGraph["nodes"].length;
    let hash;
    for (let s = 1; s <= 5; ++s) {
        hash = "score"+s;
        for (let j=0; j<n; ++j) {
            timeGraphs[s-1]["nodes"].push({
                "name": saveGraph["nodes"][j]["name"],
                "score": saveGraph["nodes"][j][hash]
            });
        }

        softMax(s);
        addClusterLinks(s);
    }
}

/**
 * USELESS to be removed!
 */

function addLinks() {

    let edge1, edge2, diff, raiDiff, edgeWeight;

    graph["links"] = [];
    console.log("addLinks!!");

}

/**
 * 
 * @param {*} state  : adds edges for visualization 
 * testing
 *
 */

function addClusterLinks(state) {
    let edge1, edge2, diff, raiDiff, edgeWeight;
    let idx = state - 1;

    timeGraphs[idx]["links"] = [];

    for (let i = 0; i < timeGraphs[idx]["nodes"].length - 1; ++i) {
        for (let j = i + 1; j < timeGraphs[idx]["nodes"].length; ++j) {

            diff = Math.abs(timeGraphs[idx]["nodes"][i]["score"] - timeGraphs[idx]["nodes"][j]["score"]);
            raiDiff = Math.abs(timeGraphs[idx]["nodes"][i]["RAI"] - timeGraphs[idx]["nodes"][j]["RAI"]);

            edgeWeight = (2.0 / (0.1 + raiDiff));
            if (diff < thresh) {
                edge2 = {
                    "source": j,
                    "target": i,
                    "value": edgeWeight
                }
                timeGraphs[idx]["links"].push(edge2);
                //console.log("edge pushed: " + idx + " " + timeGraphs[idx]["links"]);
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
            xPos = 110 + parseFloat(d3.select(this).attr("x")) + xScale.rangeBand() / 2;
            yPos = 400 + parseFloat(d3.select(this).attr("y")) / 2 + h / 2;

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

function sortCallBack(a, b, order) {
    if (order) {
        return d3.ascending(a["RAI"], b["RAI"]);
    } else {
        return d3.descending(a["RAI"], b["RAI"]);
    }
};

init();