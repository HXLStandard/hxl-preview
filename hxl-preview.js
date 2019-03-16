hxl_preview = {};

/**
 * Parse GET parameters
 * @returns: an object mapping names to values
 */
hxl_preview.getParams = function () {
    var params = {};
    var parts = [];
    location.search.substr(1).split("&").forEach((param) => {
        parts = param.split('=');
        params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    });
    return params;
};

/**
 * Draw the data as cards
 */
hxl_preview.drawCards = function (dataset) {
    var containerNode = document.getElementById("preview");

    dataset.rows.forEach((row) => {
        var sectionNode = document.createElement("section");
        sectionNode.className = "card";

        dataset.columns.forEach((column, index) => {
            var rowNode = document.createElement("tr");

            var headerNode = document.createElement("th");

            var node = document.createElement("div");
            node.className = "header";
            node.appendChild(document.createTextNode(column.header));
            headerNode.appendChild(node);

            var node = document.createElement("div");
            node.className = "hashtag";
            node.appendChild(document.createTextNode(column.displayTag));
            headerNode.appendChild(node);
            
            rowNode.appendChild(headerNode);

            var valueNode = document.createElement("td");
            valueNode.appendChild(document.createTextNode(row.values[index]));
            rowNode.appendChild(valueNode);

            sectionNode.appendChild(rowNode);
        });
        
        containerNode.appendChild(sectionNode);
    });
};

/**
 * Draw the data table
 */
hxl_preview.drawTable = function (dataset) {
    var containerNode = document.getElementById("preview");

    var tableNode = document.createElement("table");
    tableNode.className = "hxl";
    containerNode.appendChild(tableNode);
    
    var theadNode = document.createElement("thead");
    tableNode.appendChild(theadNode);
    
    var headerRowNode = document.createElement("tr");
    headerRowNode.className = "headers";
    dataset.headers.forEach((header) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(header));
        headerRowNode.appendChild(thNode);
    });
    theadNode.appendChild(headerRowNode);

    var hashtagsRowNode = document.createElement("tr");
    hashtagsRowNode.className = "hashtags";
    dataset.displayTags.forEach((tagspec) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(tagspec));
        hashtagsRowNode.appendChild(thNode);
    });
    theadNode.appendChild(hashtagsRowNode);

    var tbodyNode = document.createElement("tbody");
    tableNode.appendChild(tbodyNode);

    dataset.rows.forEach((row) => {
        var rowNode = document.createElement("tr");
        row.values.forEach((value) => {
            var cellNode = document.createElement("td");
            cellNode.appendChild(document.createTextNode(value));
            rowNode.appendChild(cellNode);
        });
        tbodyNode.appendChild(rowNode)
    });
};

/**
 * Onload function
 */
hxl_preview.load = function () {
    var params = hxl_preview.getParams();
    if (params.url) {
        hxl.proxy(params.url, (dataset) => {
            if (params.style == "cards") {
                hxl_preview.drawCards(dataset);
            } else {
                hxl_preview.drawTable(dataset);
            }
        });
    }
};

window.onload = hxl_preview.load;

