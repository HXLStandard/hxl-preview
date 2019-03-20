hxl_preview = {
    dataset: undefined,
    rowIndex: 0,
    totalRows: -1,
    localParams: {},
    skipHash: false
};

/**
 * Parse GET parameters
 * @param s: the raw query string (omitting ? or !)
 * @returns: an object mapping names to values
 */
hxl_preview.getParams = function (s) {
    var params = {};
    var parts = [];

    s.split("&").forEach((param) => {
        parts = param.split('=');
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    });
    return params;
};

/**
 * Return a link node if appropriate.
 */
hxl_preview.makeText = function(value, column) {
    if (column.attributes.indexOf("url") > -1) {
        try {
            new URL(value);
            var linkNode = document.createElement("a");
            linkNode.href = value;
            linkNode.appendChild(document.createTextNode(value));
            return linkNode;
        } catch(e) {
            console.log("Not a URL", value);
        }
    }

    if ((column.tag == "#country" || column.tag == "#sector" || column.tag == "#subsector" || column.tag == "#org") && column.attributes.indexOf("code") == -1 && column.attributes.indexOf("type") == -1) {
        var linkNode = document.createElement("a");
        linkNode.href = "https://data.humdata.org/search?q=" + encodeURIComponent(value);
        linkNode.target = "_blank";
        linkNode.appendChild(document.createTextNode(value));
        return linkNode;
    }
    
    return document.createTextNode(value);
};

/**
 * Draw the data as cards
 */
hxl_preview.drawCards = function (dataset, containerNode) {
    var containerNode = document.getElementById("preview");

    var cardsNode = document.createElement("div");
    cardsNode.className = "hxl-cards";
    containerNode.appendChild(cardsNode);

    dataset.rows.forEach((row, index) => {
        var cardNode = document.createElement("section");
        cardNode.className = "hxl-card";
        if (index == hxl_preview.rowIndex) {
            cardNode.className = "hxl-card current";
        }

        var cardnavNode = document.createElement("p");
        cardnavNode.className = "cardnav";

        var prevNode = document.createElement("a");
        prevNode.appendChild(document.createTextNode("prev"));
        if (index > 0) {
            prevNode.className = "prev active";
            prevNode.addEventListener("click", () => {
                if (cardNode.previousElementSibling) {
                    hxl_preview.rowIndex--;
                    cardNode.className = "hxl-card";
                    cardNode.previousElementSibling.className = "hxl-card current";
                    hxl_preview.updateLocalParams();
                }
            });
        } else {
            prevNode.className = "prev inactive";
        }
        cardnavNode.appendChild(prevNode);

        var counterNode = document.createElement("a");
        counterNode.appendChild(document.createTextNode((index + 1) + "/" + dataset.rows.length));
        cardnavNode.appendChild(counterNode);

        var nextNode = document.createElement("a");
        nextNode.appendChild(document.createTextNode("next"));
        if (index < dataset.rows.length) {
            nextNode.className = "next active";
            nextNode.addEventListener("click", () => {
                if (cardNode.nextElementSibling) {
                    hxl_preview.rowIndex++;
                    cardNode.className = "hxl-card";
                    cardNode.nextElementSibling.className = "hxl-card current";
                    hxl_preview.updateLocalParams();
                }
            });
        } else {
            nextNode.className = "next inactive";
        }
        cardnavNode.appendChild(nextNode);

        cardNode.appendChild(cardnavNode);

        hxl_preview.totalCards = index + 1;

        dataset.columns.forEach((column, index) => {

            // replace null values with an nbsp
            function nonull (s) {
                if (s) {
                    return s;
                } else {
                    return "\u00a0";
                }
            }

            var fieldNode = document.createElement("div");
            fieldNode.className = "field";

            var labelNode = document.createElement("div");
            labelNode.className = "label";

            var node = document.createElement("span");
            node.className = "header";
            node.appendChild(document.createTextNode(nonull(column.header)));
            labelNode.appendChild(node);

            var node = document.createElement("span");
            node.className = "hashtag";
            node.appendChild(document.createTextNode(nonull(column.displayTag)));
            labelNode.appendChild(node);
            
            fieldNode.appendChild(labelNode);

            var valueNode = document.createElement("div");
            valueNode.className = "value";
            valueNode.appendChild(nonull(hxl_preview.makeText(row.values[index], row.columns[index])));
            fieldNode.appendChild(valueNode);

            cardNode.appendChild(fieldNode);
        });
        
        cardsNode.appendChild(cardNode);
    });
};

/**
 * Draw the data table
 */
hxl_preview.drawTable = function (dataset, containerNode) {

    var tableNode = document.createElement("table");
    tableNode.className = "hxl-table";
    containerNode.appendChild(tableNode);
    
    var theadNode = document.createElement("thead");
    tableNode.appendChild(theadNode);
    
    var headerRowNode = document.createElement("tr");
    headerRowNode.className = "headers";
    headerRowNode.appendChild(document.createElement("th"));
    dataset.headers.forEach((header) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(header));
        headerRowNode.appendChild(thNode);
    });
    theadNode.appendChild(headerRowNode);

    var hashtagsRowNode = document.createElement("tr");
    hashtagsRowNode.className = "hashtags";
    hashtagsRowNode.appendChild(document.createElement("th"));
    dataset.displayTags.forEach((tagspec) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(tagspec));
        hashtagsRowNode.appendChild(thNode);
    });
    theadNode.appendChild(hashtagsRowNode);

    var tbodyNode = document.createElement("tbody");
    tableNode.appendChild(tbodyNode);

    dataset.rows.forEach((row, index) => {
        var rowNode = document.createElement("tr");

        // Row number
        var numNode = document.createElement("td");
        numNode.className = "row-number";
        numNode.appendChild(document.createTextNode(index + 1));
        rowNode.appendChild(numNode);

        // Values
        row.values.forEach((value, index) => {
            var cellNode = document.createElement("td");
            cellNode.appendChild(hxl_preview.makeText(row.values[index], row.columns[index]));
            rowNode.appendChild(cellNode);
        });
        tbodyNode.appendChild(rowNode)
        if (index == hxl_preview.localParams.row) {
            rowNode.scrollIntoView();
            rowNode.className = rowNode.className + " selected";
        }
    });
};

/**
 * Update local config
 */
hxl_preview.readLocalParams = function () {

    hxl_preview.localParams = {
        style: "table"
    };
    
    if (location.hash) {
        hxl_preview.localParams = hxl_preview.getParams(location.hash.substr(1));
    }
};

/**
 * Redraw data
 */
hxl_preview.redraw = function () {
    var containerNode = document.getElementById("preview");
    containerNode.innerHTML = "";

    hxl_preview.readLocalParams();

    if (hxl_preview.localParams.row !== undefined) {
        hxl_preview.rowIndex = Number.parseInt(hxl_preview.localParams.row, 10);
        if (Number.isNaN(hxl_preview.rowIndex)) {
            hxl_preview.rowIndex = 0;
        }
    }
    if (hxl_preview.localParams.style == "cards") {
        hxl_preview.drawCards(hxl_preview.dataset, containerNode);
    } else {
        hxl_preview.drawTable(hxl_preview.dataset, containerNode);
    }
};

/**
 *
 */
hxl_preview.updateLocalParams = function () {
    var hash = "";
    var isFirst = true;

    // Copy operational variables
    hxl_preview.localParams.row = hxl_preview.rowIndex;

    // Construct the hash
    for (var key in hxl_preview.localParams) {
        if (isFirst) {
            hash = "#";
            isFirst = false;
        } else {
            hash += "&";
        }
        hash += encodeURIComponent(key);
        hash += "=";
        hash += encodeURIComponent(hxl_preview.localParams[key]);
    }
    
    hxl_preview.skipHash = true; // don't force a redraw with this hash change
    location.hash = hash;
};

/**
 * Onload function
 */
hxl_preview.load = function () {

    var params = hxl_preview.getParams(location.search.substr(1));

    if (params.url) {
        var loadingNode = document.getElementById("source-url");
        loadingNode.href = params.url;
        loadingNode.appendChild(document.createTextNode(params.url));
        hxl.proxy(params.url, (dataset) => {
            hxl_preview.dataset = dataset;
            window.onhashchange = function () {
                if (hxl_preview.skipHash) {
                    hxl_preview.skipHash = false;
                } else {
                    hxl_preview.redraw();
                }
            };
            hxl_preview.redraw();
        });
    }

    document.getElementById("style-table").onclick = () => {
        hxl_preview.localParams.style = "table";
        hxl_preview.updateLocalParams();
    };

    document.getElementById("style-cards").onclick = () => {
        hxl_preview.localParams.style = "cards";
        hxl_preview.updateLocalParams();
    };

};

window.onload = hxl_preview.load;

