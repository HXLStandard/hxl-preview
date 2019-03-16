hxl_preview = {
    rowIndex: 0,
    totalRows: -1
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

    if ((column.tag == "#country" || column.tag == "#sector" || column.tag == "#subsector" || column.tag == "#org") && column.attributes.indexOf("code") == -1) {
        var linkNode = document.createElement("a");
        linkNode.href = "https://data.humdata.org/search?q=" + encodeURIComponent(value);
        linkNode.appendChild(document.createTextNode(value));
        return linkNode;
    }
    
    return document.createTextNode(value);
};

/**
 * Draw the data as cards
 */
hxl_preview.drawCards = function (dataset) {
    var containerNode = document.getElementById("preview");

    var cardsNode = document.createElement("div");
    cardsNode.className = "hxl-cards";
    containerNode.appendChild(cardsNode);

    dataset.rows.forEach((row, index) => {
        var cardNode = document.createElement("section");
        cardNode.className = "hxl-card";
        if (index != hxl_preview.rowIndex) {
            cardNode.hidden = true;
        }

        hxl_preview.totalCards = index + 1;

        dataset.columns.forEach((column, index) => {
            var fieldNode = document.createElement("div");
            fieldNode.className = "field";

            var labelNode = document.createElement("div");
            labelNode.className = "label";

            var node = document.createElement("span");
            node.className = "header";
            node.appendChild(document.createTextNode(column.header));
            labelNode.appendChild(node);

            var node = document.createElement("span");
            node.className = "hashtag";
            node.appendChild(document.createTextNode(column.displayTag));
            labelNode.appendChild(node);
            
            fieldNode.appendChild(labelNode);

            var valueNode = document.createElement("div");
            valueNode.className = "value";
            valueNode.appendChild(hxl_preview.makeText(row.values[index], row.columns[index]))
            fieldNode.appendChild(valueNode);

            cardNode.appendChild(fieldNode);
        });
        
        cardsNode.appendChild(cardNode);
    });
};

/**
 * Draw the data table
 */
hxl_preview.drawTable = function (dataset) {
    var containerNode = document.getElementById("preview");

    var tableNode = document.createElement("table");
    tableNode.className = "hxl-table";
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
        row.values.forEach((value, index) => {
            var cellNode = document.createElement("td");
            cellNode.appendChild(hxl_preview.makeText(row.values[index], row.columns[index]));
            rowNode.appendChild(cellNode);
        });
        tbodyNode.appendChild(rowNode)
    });
};

/**
 * Onload function
 */
hxl_preview.load = function () {

    var localParams = {
        style: "table"
    };
    
    if (location.hash) {
        localParams = hxl_preview.getParams(location.hash.substr(1));

        // Convert to after the #
        if (localParams.row !== undefined) {
            hxl_preview.rowIndex = Number.parseInt(localParams.row, 10);
            if (Number.isNaN(hxl_preview.rowIndex)) {
                hxl_preview.rowIndex = 0;
            }
        }
    }
    
    var params = hxl_preview.getParams(location.search.substr(1));

    if (params.url) {
        hxl.proxy(params.url, (dataset) => {
            if (localParams.style == "cards") {
                hxl_preview.drawCards(dataset);
            } else {
                hxl_preview.drawTable(dataset);
            }
        });
    }

};

window.onload = hxl_preview.load;

