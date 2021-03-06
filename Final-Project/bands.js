const FOCUS_SIZE = 1;

var highlighted = new Set();

function defocus(node, hidden=false){
    name = node.attr("text");

    if(highlighted.has(name)) {
        size = node.attr("r");
        node.attr("r", size / FOCUS_SIZE);
        highlighted.delete(name)
    }

    node.style("stroke-opacity", hidden ? 0.05 : 1);
    node.style("fill-opacity", hidden ? 0.05 : 1);
}

function focus_node(node){
    name = node.attr("text");

    if(!highlighted.has(name)) {
        size = node.attr("r");
        node.attr("r", (size * FOCUS_SIZE));

        highlighted.add(name)
    }

    var svg = d3.select("#bands");

    svg.append('text')
        .attr('class', 'svgtext')
        .attr('x', node.attr('cx'))
        .attr('y', node.attr('cy'))
        .attr('color', 'white')
        .text(node.attr('text'));

    node.style("stroke-opacity", 1);
    node.style("fill-opacity", 1);
}

function search_node() {

    search_query = $("#search").val();
    d3.select("svg").selectAll("text").remove();


    var nodes = d3.selectAll('circle').each(function (d) {
        current = d3.select(this);
        name = current.attr('text');

        if (search_query.length > 2) {
            if (name.toLowerCase().includes(search_query.toLowerCase())) {
                focus_node(current);
            } else {
                defocus(current, true);
            }

        } else {
            defocus(current);
            d3.select("#bands").selectAll("text").remove();
        }

    })

    if (search_query.length > 2) {
        var links = d3.selectAll('line').each(function (d) {
            link = d3.select(this)
            link.style("stroke-opacity", 0.1);
        });
    }

    else{
        var links = d3.selectAll('line').each(function (d) {
            link = d3.select(this)
            link.style("stroke-opacity", 0.6);
        });
    }

}

var community_color = d3.scaleOrdinal(d3.schemeCategory20);

d3zoom = d3.zoom;
d3forceSimulation = d3.forceSimulation;
d3forceLink = d3.forceLink;
d3forceManyBody = d3.forceManyBody;
d3forceCenter = d3.forceCenter;
d3drag = d3.drag;

d3.json("Json_Graph.json", function (error, graph) {
    if (error) throw error;
    var svg = d3.select("#bands")
            .call(d3zoom()
                .scaleExtent([1, 10])
                .on("zoom", zoom)),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var simulation = d3forceSimulation(graph.nodes)
        .force("link", d3forceLink().id(function (d) {
            return d.id;
        }).distance(30))
        .force("charge", d3forceManyBody().strength(-2))
        .force("center", d3forceCenter(width+500, (height + 360)))
        .stop();

    simulation.force("link")
        .links(graph.links);

    for (var i = 0; i < 300; ++i) simulation.tick();

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")

        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        })
        .attr("stroke-width", function (d) {
            return Math.sqrt(d.value);
        });

    var node = svg.append("g")

        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr('text', function (d) {
            return d.id;
        }).style("stroke", "black")
        .on("mouseover", mouseOver(0.05))
        .on("mouseout", mouseOut)
        .attr("r", function (d) {
            return d['node degree'];
        })

        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("r", function (d) {
            return d['node degree'] * 1.4;
        })
        .attr("fill", function (d) {
            return community_color(d.community);
        })
        .attr("community", function (d) {return d.community})
        .attr('stroke-width', 20)
        .call(d3drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    function zoom() {
        d3.select("#bands").selectAll("text").remove();
        var zoom_value = d3.event.transform.k * 100;
        formatDecimal = d3.format(".0f")
        d3.select('#zoomtext').text(formatDecimal(zoom_value) + '%');

        translation = [d3.event.transform.x, d3.event.transform.y]
        scaleFactor = d3.event.transform.k
        tick(); //update positions
        search_node(); //update search
    }

    function tick() {
        link.attr("x1", function (d) {
            return translation[0] + scaleFactor * d.source.x;
        })
            .attr("y1", function (d) {
                return translation[1] + scaleFactor * d.source.y;
            })
            .attr("x2", function (d) {
                return translation[0] + scaleFactor * d.target.x;
            })
            .attr("y2", function (d) {
                return translation[1] + scaleFactor * d.target.y;
            });

        node.attr("cx", function (d) {

            return translation[0] + scaleFactor * d.x;
        })
            .attr("cy", function (d) {
                return translation[1] + scaleFactor * d.y;
            });
    }

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    var linkedByIndex = {};
    graph.links.forEach(function (d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });

    // check the dictionary to see if nodes are linked
    function isConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
    }


    // fade nodes on hover
    function mouseOver(opacity) {

        return function (d) {

            node_on_mouse = d3.selectAll("circle").filter(function(n) { return n.id === d.id; });
            d3.select('#nametext').text(node_on_mouse.attr('text'));
            d3.select('#communitytext').text(node_on_mouse.attr('community'));

            // check all other nodes to see if they're connected
            // to this one. if so, keep the opacity at 1, otherwise
            // fade
            node.style("stroke-opacity", function (o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                text = d3.select(this).attr('text');

                if (thisOpacity === 1 && !highlighted.has(text)) {
                    svg.append('text')
                        .attr('class', 'svgtext')
                        .attr('x', +d3.select(this).attr('cx') + +d3.select(this).attr('r') + 10)
                        .attr('y', +d3.select(this).attr('cy') + (+d3.select(this).attr('r') / 2))
                        .attr("pointer-events", "none")
                        .attr('color', 'white')
                        .text(text);
                }
                return thisOpacity;
            });
            node.style("fill-opacity", function (o) {
                text = d3.select(this).attr('text');
                highlight = highlighted.has(text);
                thisOpacity = isConnected(d, o) || highlight ? 1 : opacity;
                return thisOpacity;
            });
            // also style link accordingly
            link.style("stroke-opacity", function (o) {
                return o.source === d || o.target === d ? 1 : opacity;
            });
            link.style("stroke", function (o) {
                return o.source === d || o.target === d ? o.source.colour : "#ddd";
            });
        };
    }

    function mouseOut() {
        if(this.nodeName != 'circle'){
            return
        }
        d3.select("#bands").selectAll("text").remove();
        d3.select('#nametext').text('');
        d3.select('#communitytext').text('');
        node.style("stroke-opacity", 1);
        node.style("fill-opacity", 1);
        link.style("stroke-opacity", 1);
        link.style("stroke", "#ddd");

        search_node()
    }
});
