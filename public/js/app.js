const fs = require("fs");
const { dialog, app } = require("electron").remote
const { DataTable } = require("simple-datatables");
const Chart = require("chart.js");
// variables
let state = 1; // 0 - data mode 1,2,3,4,5 Time mode
/**
 * score is an array in saveGraph 
 * timeGraphs[state-1] is the graph to be used.
 * saveGraph[nodes] = tableGraph
 */
let timeGraphs = [], saveGraph, tableGraph, thresh = 4;

let width = 300, height = 300;


const chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};
const COLORS = [
    '#4dc9f6',
    '#f67019',
    '#f53794',
    '#537bc4',
    '#acc236',
    '#166a8f',
    '#00a950',
    '#58595b',
    '#8549ba'
];


// buttons
let clusterBtn, screenBtn;

let color = d3.scale.category20();
let svg, link, node, ctx, chart;

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
let saveBtn, loadBtn, tableAdd, dataChanged = false;
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

    clusterBtn = document.getElementById("cluster-btn");
    clusterBtn.addEventListener("click", clusterBtnClick);
    screenBtn = document.getElementById("screenshot-btn");
    screenBtn.addEventListener("click", screenShotBtnClick);

    tableAdd = document.getElementById("add-btn");
    tableAdd.addEventListener("click", tableAddClick);

    nameField = document.getElementById("add-name");
    for (let i = 1; i <= 5; ++i) {
        scoreField.push(document.getElementById("add-score" + i));
    }

    table.addEventListener("dblclick", tableRemoveClick);
    ctx = document.getElementById("myChart").getContext("2d");
    svg = d3.select("#graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    state = 0;
    setupDataMode();
}

function setupTimeMode() {
    graphPane.classList.remove("hidden");
    tablePane.classList.add("hidden");
    plotChart();
}

function setupDataMode() {
    graphPane.classList.add("hidden");
    tablePane.classList.remove("hidden");
}

function plotChart() {
    let labels = [];
    let t1 = [];
    let t2 = [];
    let t3 = [];
    let t4 = [];
    let t5 = [];
    for (let i = 0; i < saveGraph["nodes"].length; ++i) {
        labels.push(saveGraph["nodes"][i]["name"]);
        t1.push(timeGraphs[0]["nodes"][i]["RAI"]);
        t2.push(timeGraphs[1]["nodes"][i]["RAI"]);
        t3.push(timeGraphs[2]["nodes"][i]["RAI"]);
        t4.push(timeGraphs[3]["nodes"][i]["RAI"]);
        t5.push(timeGraphs[4]["nodes"][i]["RAI"]);
    }
    let config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'time1',
                data: t1,
                backgroundColor: chartColors.blue,
                borderColor: chartColors.blue,
                fill: false
            }, {
                label: 'time2',
                data: t2,
                    backgroundColor: chartColors.green,
                    borderColor: chartColors.green,
                    fill: false
            }, {
                label: 'time3',
                data: t3,
                    backgroundColor: chartColors.red,
                    borderColor: chartColors.red,
                    fill: false
            }, {
                label: 'time4',
                data: t4,
                    backgroundColor: chartColors.orange,
                    borderColor: chartColors.orange,
                    fill: false
            }, {
                label: 'time5',
                data: t5,
                    backgroundColor: chartColors.purple,
                    borderColor: chartColors.purple,
                    fill: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive:true,
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        labelString: 'Student'
                    }
                }
                ],
                yAxes: [{
                    display:true,
                    scaleLabel:{
                        labelString:'RAI'
                    },
                    ticks: {
                        beginAtZero: false
                    }
                }]
            }
        }
    }
    if (chart !== undefined)
        chart.destroy();
    chart = new Chart(ctx,config);
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
    //barViz();
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
    visualize();
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
    dataChanged = false;
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
            for (let i = 0; i < tableGraph["nodes"].length; ++i) {
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
    if (!dataChanged)
        return;
    const options = {
        defaultPath: app.getAppPath() + '/data.json',
        securityScopedBookmarks: true
    }
    dialog.showSaveDialog(null, options, function (filename) {
        if (filename === undefined) {
            console.log("no file selected");
            return;
        }
        json = JSON.stringify(saveGraph);
        fs.writeFile(filename, json, function (err) {
            if (err) throw err;
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
    if (tableGraph === undefined) {
        tableGraph = {
            "nodes": []
        }
    }

    tableGraph["nodes"].push(newNode);
    syncGraphs();
    dataTable.rows().add(newRow);
    dataChanged = true;
}

function tableRemoveClick(event) {
    console.log("double click");
    console.log(event.target.tagName.toLowerCase());
    if (event.target.tagName.toLowerCase() == 'td') {
        let idx = event.target.rowIndex;
        dataTable.rows().remove(event.target.rowIndex);
        tableGraph["nodes"].splice(idx, 1);
        syncGraphs();
        dataChanged = true;
    }
}

function clusterBtnClick() {

    visualize();
    netClustering.cluster(timeGraphs[state - 1].nodes, timeGraphs[state - 1].links);
    svg.selectAll(".node")
        .transition()
        .duration(2000)
        .style("fill", function (d) { return color(d.cluster); });
}

function screenShotBtnClick() {
    saveSvgAsPng(document.getElementsByTagName("svg")[0], "plot.png", {
        scale: 1, backgroundColor: "#FFFFFF"
    });
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
    for (let k = 0; k < 5; ++k) {
        timeGraphs.push({
            "nodes": [],
            "links": []
        });
    }

    let n = saveGraph["nodes"].length;
    let hash;
    for (let s = 1; s <= 5; ++s) {
        hash = "score" + s;
        for (let j = 0; j < n; ++j) {
            timeGraphs[s - 1]["nodes"].push({
                "name": saveGraph["nodes"][j]["name"],
                "score": saveGraph["nodes"][j][hash]
            });
        }

        softMax(s);
        addClusterLinks(s);
    }
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

init();