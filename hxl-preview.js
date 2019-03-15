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
 * Draw the data table
 */
hxl_preview.draw = function (dataset) {
    var containerNode = document.getElementById("preview");

    var tableNode = document.createElement("table");
    containerNode.appendChild(tableNode);
    
    var theadNode = document.createElement("thead");
    tableNode.appendChild(theadNode);
    
    var hxlHeadersRowNode = document.createElement("tr");
    var hxlTagsRowNode = document.createElement("tr");
    theadNode.appendChild(hxlHeadersRowNode);
    theadNode.appendChild(hxlTagsRowNode);
    
    dataset.headers.forEach((header) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(header));
        hxlHeadersRowNode.appendChild(thNode);
    });

    dataset.displayTags.forEach((tagspec) => {
        var thNode = document.createElement("th");
        thNode.appendChild(document.createTextNode(tagspec));
        hxlTagsRowNode.appendChild(thNode);
    });

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
            hxl_preview.draw(dataset);
        });
    }
};

window.onload = hxl_preview.load;

