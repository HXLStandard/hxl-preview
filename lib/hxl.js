/**
 * Simple HXL library.
 *
 * This isn't a full-featured HXL library; it focusses on datasets
 * that have already had tags expanded, and includes mainly filtering
 * operations that are useful to support mapping and visualisation.
 *
 * @author David Megginson
 * @date Started 2015-02
 */

////////////////////////////////////////////////////////////////////////
// Root object
////////////////////////////////////////////////////////////////////////

/**
 * Root hxl object, from which everything else starts.
 *
 * See {@link hxl.classes.Source} for a list of methods to use on a
 * HXL object.
 *
 * @global
 * @namespace
 */
var hxl = {
    /**
     * @namespace
     */
    classes: {},

    /**
     * List of attached loggers
     */
    loggers: []
};

/**
 * Log a warning or error message.
 *
 * Add logger functions to hxl.loggers.
 *
 * @param {string} message The message to log.
 */
hxl.log = function (message) {
    hxl.loggers.forEach(logger => {
        loggers(message);
    });
};

/**
 * Wrap a JavaScript array as a HXL dataset.
 *
 * @param {array} rawData an array of arrays of raw strings to wrap
 * @return a new {@link hxl.classes.Dataset}
 */
hxl.wrap = function (rawData) {
    return new hxl.classes.Dataset(rawData);
};

/**
 * Load a remote HXL dataset asynchronously.
 *
 * The callback takes a single argument, which is
 * the HXL data source (when successfully loaded).
 *
 * @param {string} url The URL of the HXL dataset to load.
 * @param {function} callback The function to call when loaded.
 * @param {boolean} useProxy Pass the dataset through the HXL Proxy.
 */
hxl.load = function (url, callback) {
    if (typeof(Papa) != 'undefined' && typeof(Papa.parse) != 'undefined') {
        Papa.parse(url, {
            download: true,
            skipEmptyLines: true,
            complete: result => {
                callback(hxl.wrap(result.data));
            },
            error: result => {
                throw new Error(result.errors.join("\n"));
            }
        });
    } else {
        throw Error("No CSV parser available (tried Papa.parse)");
    }
};

/**
 * Load a remote dataset asynchronously via the HXL Proxy
 * @param {function} success_callback Callback for a successful load (arg is hxl.Dataset object)
 * @param {function} error_callback Callback for an error (arg is XmlHttpRequest)
 */
hxl.proxy = function (url, success_callback, error_callback) {
    var url = "https://proxy.hxlstandard.org/data.json?url=" + encodeURIComponent(url);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
        if (xhr.status === 200) {
            success_callback(hxl.wrap(JSON.parse(xhr.responseText)));
        } else {
            if (error_callback) {
                error_callback(xhr);
            }
        }
    };
    xhr.send(null);
};


/** 
* Load a HXL dataset from a string
*/
hxl.parseString = function(string) {
    return hxl.wrap(Papa.parse(string).data);
}

/**
 * Normalise just whitespace within a string.
 */
hxl.normaliseSpace = function (value) {
    if (value) {
        return value.toString().trim().replace(/\s+/, ' ');
    } else {
        return null;
    }
};

/**
 * Normalise case and whitespace in a string.
 *
 * @param {string} value The string value to normalise.
 * @return {string} the string with case and whitespace normalised.
 */
hxl.normaliseString = function (value) {
    if (value) {
        return hxl.normaliseSpace(value).toLowerCase();
    } else {
        return null;
    }
};

/**
 * Normalise a date.
 * @param {string} dateString - the date string to normalise
 * @return {string} - a normalised date string (ISO or extended Q format)
 */
hxl.normaliseDate = function (dateString, dayfirst=true) {

    dateString = dateString.trim().toUpperCase();

    // ISO date?
    if (dateString.match(/^\d{4}(-\d{2}(-\d{2})?|Q[1-4])?$/)) {
        return dateString;
    }

    // may need to swap month and day
    // Date.parse expects mm/dd/yy
    var result = dateString.match(/^(\d\d?)[ .-\/]+(\d\d?)[ .-\/]+(\d\d\d?\d?)$/);
    if (result) {
        if (0 + result[1] > 12 || (0 + result[2] <= 12 && dayfirst)) {
            dateString = result[2] + '/' + result[1] + '/' + result[3];
        }
    }

    // Fall back to the old, broken date parse
    var timestamp = Date.parse(dateString);
    if (isNaN(timestamp)) {
        return false;
    }
    var date = new Date(timestamp);
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    
    return ('0000' + year).slice(-4) + '-' +
        ('00' + month).slice(-2) + '-' +
        ('00' + day).slice(-2);
};

/**
 * Convenience method for matching a tag pattern
 */
hxl.match = function(pattern, column) {
    pattern = hxl.classes.TagPattern.parse(pattern);
    return pattern.match(column);
};

/**
 * Convenience method for matching a tag pattern against a list
 */
hxl.matchList = function(pattern, columns) {
    pattern = hxl.classes.TagPattern.parse(pattern);
    return pattern.matchList(columns);
};


////////////////////////////////////////////////////////////////////////
// hxl.classes.Source
////////////////////////////////////////////////////////////////////////

/**
 * Abstract base class for any HXL data source.
 * Derived classes must define getColumns() and iterator()
 *
 * @constructor
 * @property {array} columns an array of column specs (see {@link #getColumns})
 * @property {array} rows an array of data rows (see {@link #getRows})
 * @property {array} headers an array of string headers (see {@link #getHeaders})
 * @property {array} tags an array of string tags, without attributes (see {@link #getTags})
 * @property {array} displayTags an array of display tags, with attributes (see {@link #getDisplayTags})
 */
hxl.classes.Source = function() {
    var prototype = Object.getPrototypeOf(this);
    Object.defineProperty(this, 'columns', {
        enumerable: true,
        get: prototype.getColumns
    });
    Object.defineProperty(this, 'rows', {
        enumerable: true,
        get: prototype.getRows
    });
    Object.defineProperty(this, 'rawData', {
        enumerable: true,
        get: prototype.getRawData
    });
    Object.defineProperty(this, 'headers', {
        enumerable: true,
        get: prototype.getHeaders
    });
    Object.defineProperty(this, 'tags', {
        enumerable: true,
        get: prototype.getTags
    });
    Object.defineProperty(this, 'displayTags', {
        enumerable: true,
        get: prototype.getDisplayTags
    });
}

/**
 * Get a list of columns for a HXL dataset.
 *
 * <pre>
 * var columns = data.getColumns();
 * </pre>
 *
 * It is usually easier to use the {@link #columns} property, which is
 * an alias to this method:
 *
 * <pre>
 * var columns = data.columns;
 * </pre>
 *
 * @function
 * @return {array} an array of {@link hxl.classes.Column} objects.
 * @see #columns
 * @see #getRows
 */
hxl.classes.Source.prototype.getColumns = undefined;

/**
 * Get an iterator to read through the rows of a HXL dataset.
 *
 * The iterator will have a next() method to read each row in sequence, and
 * will return null once the rows are exhausted.
 *
 * <pre>
 * var row;
 * var iterator = data.iterator();
 * while (row = iterator.next()) {
 *   // do something with the row
 * }
 * </pre>
 *
 * The {@link #each} or {@link #forEach} method provides a
 * more-elegant way of iterating through rows, but this method makes
 * it easier to break out of the loop early.
 *
 * @function
 * @return {object} An iterator object with a .next() method.
 * @see #getRows
 * @see #each
 * @see #forEach
 */
hxl.classes.Source.prototype.iterator = undefined;

/**
 * Get an array of row objects.
 *
 * This method might be highly inefficient, depending on the
 * implementation in the derived class. Normally, it's best
 * to go through the rows using an iterator.
 *
 * <pre>
 * var rows = data.getRows();
 * </pre>
 *
 * It is usually easier to use the {@link #rows} property, which is an
 * alias to this method:
 *
 * <pre>
 * var rows = data.rows;
 * </pre>
 *
 * @return {array} An array of {@link hxl.classes.Row} objects.
 * @see #rows
 * @see #iterator
 * @see #getColumns
 */
hxl.classes.Source.prototype.getRows = function () {
    var row;
    var rows = [];
    var iterator = this.iterator();
    while (row = iterator.next()) {
        rows.push(row);
    }
    return rows;
}

/**
 * Get raw data for the dataset (excluding header rows and hashtag row)
 */
hxl.classes.Source.prototype.getRawData = function () {
    var rawData = [];
    var iterator = this.iterator();
    while (row = iterator.next()) {
        rawData.push(row.values);
    }
    return rawData;
};

/**
 * Get an array of human-readable column headers.
 *
 * These are the headers that come before the HXL hashtag row. This is
 * especially useful for creating an HTML table, CSV, JSON, etc.
 *
 * <pre>
 * var headerRow = data.getHeaders();
 * </pre>
 *
 * It is usually easier to use the {@link #headers} property, which is
 * an alias to this method:
 *
 * <pre>
 * var headerRow = data.headers();
 * </pre>
 *
 * @return {array} An array of strings.
`* @see #headers
 * @see #getTags
 * @see #getDisplayTags
 * @see #getColumns
 */
hxl.classes.Source.prototype.getHeaders = function () {
    return this.columns.map(col => { return col.header; });
}

/**
 * Get an array of tags.
 *
 * These are plain tags, without attributes.
 *
 * <pre>
 * var tagList = data.getTags();
 * </pre>
 *
 * It is usually easier to use the {@link #tags} property, which is an
 * alias to this method:
 *
 * <pre>
 * var tagList = data.tags;
 * </pre>
 *
 * @return {array} An array of strings.
 * @see #tags
 * @see #getDisplayTags
 * @see #getHeaders
 * @see #getColumns
 */
hxl.classes.Source.prototype.getTags = function () {
    return this.columns.map(col => { return col.tag; });
}

/**
 * Get an array of tagspecs.
 *
 * These are full tagspecs, with attributes. This is especially useful
 * for creating an HTML table, CSV, JSON, etc.
 *
 * <pre>
 * var tagRow = data.getDisplayTags();
 * </pre>
 *
 * It is usually more convenient to use the {@link #displayTags} property,
 * which is an alias to this method:
 *
 * <pre>
 * var tagRow = data.displayTags;
 * </pre>
 *
 * @return {array} An array of strings.
 * @see #displayTags
 * @see #getTags
 * @see #getHeaders
 * @see #getColumns
 */
hxl.classes.Source.prototype.getDisplayTags = function () {
    return this.columns.map(col => { return col.displayTag; });
}

/**
 * Get the minimum value for a column
 *
 * Uses a < comparison, ignoring empty cells. This method is
 * especially useful for setting ranges in a chart or other
 * visualisation.
 *
 * <pre>
 * var minAffected = data.getMin('#affected');
 * </pre>
 *
 * @param {string} pattern The tag pattern for the column(s) to
 * use. See {@link hxl.classes.TagPattern} for details.
 * @return {string} The lowest value in the column.
 * @see #getMax
 */
hxl.classes.Source.prototype.getMin = function(pattern) {
    var min = null;
    var row, value;
    var iterator = this.iterator();
    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    while (row = iterator.next()) {
        value = row.get(pattern);
        if (value !== null) {
            num = parseFloat(value);
            if (num !== NaN) {
                if (min === null || value < min) {
                    min = value;
                }
            }
        }
    }
    return min;
}

/**
 * Get the maximum value for a column
 *
 * Uses a > comparison, ignoring empty cells. This method is especially
 * useful for setting ranges in a chart or other visualisation.
 *
 * <pre>
 * var maxAffected = data.getMax('#affected');
 * </pre>
 *
 * @param {string} pattern The tag pattern for the column(s) to
 * use. See {@link hxl.classes.TagPattern} for details.
 * @return {string} the highest value in the column.
 * @see #getMin
 */
hxl.classes.Source.prototype.getMax = function(pattern) {
    var max = null;
    var row, value;
    var iterator = this.iterator();
    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    while (row = iterator.next()) {
        value = row.get(pattern);
        if (value !== null) {
            num = parseFloat(value);
            if (num !== NaN) {
                if (max === null || value > max) {
                    max = value;
                }
            }
        }
    }
    return max;
}

/**
 * Get a list of unique values for a tag
 * 
 * Uses a map to store unique values.
 *
 * <pre>
 * var sectorList = data.getValues('#sector');
 * </pre>
 *
 * @param {hxl.classes.TagPattern} pattern A tag pattern to match for the column(s).
 * @return {array} A list of unique values.
 */
hxl.classes.Source.prototype.getValues = function(pattern) {
    var row;
    var iterator = this.iterator();
    var valueMap = {};

    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    while (row = iterator.next()) {
        valueMap[row.get(pattern)] = true;
    }
    return Object.keys(valueMap);
}

/**
 * Check if a dataset contains at least one column matching a pattern.
 *
 * <pre>
 * if (data.hasColumn('#meta+count')) {
 *   draw_my_graph(data);
 * }
 * </pre>
 *
 * @param {hxl.classes.TagPattern} pattern A tag pattern to match for the column(s).
 * @return {boolean} true if there's a match, false otherwise.
 * @see #getColumns
 */
hxl.classes.Source.prototype.hasColumn = function (pattern) {
    var cols =this.getColumns();
    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    for (var i = 0; i < cols.length; i++) {
        if (pattern.match(cols[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Get a list of indices for columns matching a tag pattern.
 */
hxl.classes.Source.prototype.getMatchingColumns = function(pattern) {
    var result = [];
    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    this.getColumns().forEach(col => {
        if (pattern.match(col)) {
            result.push(col);
        }
    });
    return result;
}

/**
 * Fire a callback on each row of data.
 *
 * The callback has the form
 *
 * <pre>
 * function (row, source, rowNumber) {}
 * </pre>
 *
 * (Often, the callback will need to bother with only the first parameter,
 * so function (row) {} will be more typical).
 *
 * <pre>
 * var sectors = {};
 * data.each(function(row) {
 *   sectors[row.getValue('sector')] = true;
 * });
 * </pre>
 *
 * @param {function} callback Callback function for each row of data.
 * @return {int} The number of rows processed.
 * @see #iterator
 */
hxl.classes.Source.prototype.each = function(callback) {
    var row, rowNumber = 0, iterator = this.iterator();
    while (row = iterator.next()) {
        callback(row, this, rowNumber++);
    }
    return rowNumber;
}

/**
 * Alias each() to forEach()
 *
 * <pre>
 * var sectors = {};
 * data.forEach(function(row) {
 *   sectors[row.getValue('sector')] = true;
 * });
 * </pre>
 *
 * @function
 */
hxl.classes.Source.prototype.forEach = hxl.classes.Source.prototype.each;

/**
 * Test if a tag pattern points mainly to numbers.
 *
 * This method is useful for trying to guess which columns contain numeric
 * values that can be graphed:
 *
 * <pre>
 * if (data.isNumbery('#affected')) {
 *   min = data.getMin('#affected');
 * }
 * </pre>
 *
 * @param {hxl.classes.TagPattern} pattern A tag pattern to match for the column(s).
 * @return {boolean} true if at least 90% of the non-null values are numeric.
 */
hxl.classes.Source.prototype.isNumbery = function(pattern) {
    var totalSeen = 0;
    var numericSeen = 0;
    pattern = hxl.classes.TagPattern.parse(pattern); // more efficient to precompile
    this.rows.forEach(row => {
        var value = row.get(pattern);
        if (value) {
            totalSeen++;
            if (!isNaN(value)) {
                numericSeen++;
            }
        }
    });
    return (totalSeen > 0 && (numericSeen/totalSeen >= 0.9));;
}

/**
 * Filter rows to include only those that match at least one predicate.
 *
 * Use this, for example, to include only rows where the #sector is "WASH":
 *
 * <pre>
 * var filtered = data.withRows('sector=WASH');
 * </pre>
 *
 * @param {array or string} predicates a single string predicate or a list of predicates.
 * See {@link hxl.classes.RowFilter} for details.
 * @return {hxl.classes.Source} A new data source, including only selected data rows.
 * @see hxl.classes.RowFilter
 */
hxl.classes.Source.prototype.withRows = function(predicates) {
    return new hxl.classes.RowFilter(this, predicates, false);
}

/**
 * Filter rows to include only those that match none of the predicates.
 *
 * Use this, for example, to exclude any rows where the #status is "completed":
 *
 * <pre>
 * var filtered = data.withoutRows('status=completed');
 * </pre>
 *
 * @param predicates a single string predicate or a list of predicates.
 * See {@link hxl.classes.RowFilter} for details.
 * @return {hxl.classes.Source} A new data source, excluding matching data rows.
 * @see hxl.classes.RowFilter
 */
hxl.classes.Source.prototype.withoutRows = function(predicates) {
    return new hxl.classes.RowFilter(this, predicates, true);
}

/**
 * Filter columns to include only those that match the pattern(s) provided.
 *
 * Use this, for example, to strip down a dataset to only the desired columns:
 *
 * <pre>
 * var filtered = data.withColumns('org,sector,adm1');
 * </pre>
 *
 * @param {array or string} patterns A single string tag pattern or a
 * list of tag patterns for included columns (whitelist). See {@link
 * hxl.classes.TagPattern} for details.
 * @return {hxl.classes.Source} A new data source, including only matching columns.
 * @see #withoutColumns
 * @see hxl.classes.ColumnFilter
 */
hxl.classes.Source.prototype.withColumns = function(patterns) {
    return new hxl.classes.ColumnFilter(this, patterns);
}

/**
 * Filter columns to include only those that don't match the pattern(s) provided.
 *
 * Use this, for example, to remove any columns containing
 * personally-identifiable information (PII):
 *
 * <pre>
 * var filtered = data.withoutColumns('contact');
 * </pre>
 *
 * @param {array or string} patterns A single string tag pattern or a
 * list of tag patterns for excluded columns (blacklist). See {@link
 * hxl.classes.TagPattern} for details.
 * @return {hxl.classes.Source} A new data source, excluding matching columns.
 * @see #withColumns
 * @see hxl.classes.ColumnFilter
 */
hxl.classes.Source.prototype.withoutColumns = function(patterns) {
    return new hxl.classes.ColumnFilter(this, patterns, true);
}

/**
 * Count the unique occurrences of a combination of values in a dataset.
 *
 * Use this to count, e.g. the number of sectors, or the number of
 * #org / #sector combinations:
 *
 * <pre>
 * var filtered = data.count('org');
 * </pre>
 *
 * @param {array or string} patterns A single string tag pattern or a
 * list of tag patterns for counting unique combinations. See {@link
 * hxl.classes.TagPattern#parse} for details.
 * @param aggregate {string} (optional) A single numeric tag pattern for which
 * to produce aggregate values
 * @return {hxl.classes.Source} A new data source, including the aggregated data.
 * @see hxl.classes.CountFilter
 */
hxl.classes.Source.prototype.count = function(patterns, aggregate) {
    return new hxl.classes.CountFilter(this, patterns, aggregate);
}

/**
 * Change the tag (and optionally, header) for one or more columns.
 *
 * Use this to change around tags and attributes. For example, you
 * could change the first instance of #org to #org+funder to make the
 * data easier to filter later:
 *
 * <pre>
 * var filtered = data.rename('#org', '#org+funder', 'Donor', 0);
 * </pre>
 *
 * @param {string} pattern The tag pattern to match for replacement.
 * See {@link hxl.classes.TagPattern#parse} for details.
 * @param newTag the new HXL tag spec (e.g. "#adm1+code"). See {@link
 * hxl.classes.Column#parse} for details.
 * @param {string} newHeader (optional) The new header. If undefined, don't change.
 * @param {int} index The zero-based index to replace among matching tags. If undefined,
 * replace *all* matches.
 * @return {hxl.classes.Source} A new data source, with matching column(s) replaced.
 * @see hxl.classes.RenameFilter
 */
hxl.classes.Source.prototype.rename = function(pattern, newTag, newHeader, index) {
    return new hxl.classes.RenameFilter(this, pattern, newTag, newHeader, index);
}

/**
 * Cache the transformed HXL for future use.
 *
 * Create a copy of the HXL dataset, as transformed up to this point
 * in the filter chain, to save future work.  Some filters, like
 * {@link hxl.classes.CountFilter}, already build their own cache, and
 * don't need this filter.
 *
 * <pre>
 * var filtered = data.withRows('sector=WASH').withoutColumns('contact').cache();
 * </pre>
 *
 * @return {hxl.classes.Source} a new data source, with all transformations cached.
 * @see hxl.classes.CacheFilter
 */
hxl.classes.Source.prototype.cache = function() {
    return new hxl.classes.CacheFilter(this);
}

/**
 * Number repeated tags +i0, +i1, etc.
 *
 * This method is mainly useful for handling repeated tags that aren't
 * distinguished by semantic attributes like +funder or
 * +main. Numbering happens from left to right:
 *
 * <pre>
 * var filtered = data.index('org');
 * </pre>
 *
 * @param {string} pattern A {hxl.classes.TagPattern} for matching tag to index.
 * @return {hxl.classes.Source} a new data source, with index attributes added.
 * @see hxl.classes.IndexFilter
 */
hxl.classes.Source.prototype.index = function(pattern) {
    return new hxl.classes.IndexFilter(this, pattern);
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.Dataset
////////////////////////////////////////////////////////////////////////

/**
 * An original HXL dataset (including the raw data)
 * Derived from hxl.classes.Source
 * @constructor
 * @augments hxl.classes.Source
 * @param {array} rawData An array of arrays of raw strings (tabular).
 */
hxl.classes.Dataset = function (rawData) {
    hxl.classes.Source.call(this);
    this._rawData = rawData;
    this._tagRowIndex = null;
    this._savedColumns = null;
}

hxl.classes.Dataset.prototype = Object.create(hxl.classes.Source.prototype);
hxl.classes.Dataset.prototype.constructor = hxl.classes.Dataset;

/**
 * Get an array of column definitions.
 */
hxl.classes.Dataset.prototype.getColumns = function() {
    var cols, tagsIndex, tagspec, header;
    if (this._savedColumns == null) {
        cols = [];
        tagsIndex = this._getTagRowIndex();
        if (tagsIndex > -1) {
            for (var i = 0; i < this._rawData[tagsIndex].length; i++) {
                tagspec = this._rawData[tagsIndex][i];
                header = null;
                if (tagsIndex > 0) {
                    header = this._rawData[tagsIndex-1][i];
                }
                cols.push(hxl.classes.Column.parse(tagspec, header));
            }
            this._savedColumns = cols;
        } else {
            throw "No HXL hashtag row found.";
        }
    }
    return this._savedColumns;
}

/**
 * Get an iterator through all the rows in the dataset.
 */
hxl.classes.Dataset.prototype.iterator = function() {
    var index = this._getTagRowIndex() + 1;
    var columns = this.columns;
    var rawData = this._rawData;
    return {
        next: function() {
            if (index < rawData.length) {
                return new hxl.classes.Row(rawData[index++], columns);
            } else {
                return null;
            }
        }
    };
};

/**
 * Override default function to get raw data, for efficiency
 */
hxl.classes.Dataset.prototype.getRawData = function() {
    return this._rawData.slice(this._getTagRowIndex()+1);
};

/**
 * Get the index of the tag row.
 */
hxl.classes.Dataset.prototype._getTagRowIndex = function() {
    var i;
    if (this._tagRowIndex == null) {
        for (i = 0; i < 25 && i < this._rawData.length; i++) {
            if (this._isTagRow(this._rawData[i])) {
                this._tagRowIndex = i;
                return this._tagRowIndex;
            }
        }
        throw "No HXL tag row found."
    } else {
        return this._tagRowIndex;
    }
}

/**
 * Test a candidate HXL tag row.
 *
 * @param rawRow a raw array of values (e.g. a CSV row).
 * @return true if this qualifies as a tag row.
 */
hxl.classes.Dataset.prototype._isTagRow = function(rawRow) {
    var seenTag = false, seenNonTag = false;
    rawRow.forEach(rawValue => {
        if (rawValue) {
            if (String(rawValue).match(/^\s*#.*$/) && hxl.classes.TagPattern.parse(rawValue)) {
                seenTag = true;
            } else {
                seenNonTag = true;
            }
        }
    });
    return (seenTag && !seenNonTag);
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.Column
////////////////////////////////////////////////////////////////////////

/**
 * Wrapper for a HXL column definition.
 * @constructor
 * @see hxl.classes.TagPattern
 */
hxl.classes.Column = function (tag, attributes, header) {
    this.tag = tag;
    this.attributes = attributes;
    if (!this.attributes) {
        this.attributes = [];
    }
    this.header = header;
    Object.defineProperty(this, 'displayTag', {
        enumerable: true,
        get: hxl.classes.Column.prototype.getDisplayTag
    });
}

/**
 * Create a display tagspec for the column.
 */
hxl.classes.Column.prototype.getDisplayTag = function() {
    return [this.tag].concat(this.attributes.sort()).join('+');
};

/**
 * Parse a tag spec into its parts.
 */
hxl.classes.Column.parse = function(spec, header, useException) {
    if (spec instanceof hxl.classes.Column) {
        return spec;
    }
    if (!spec) {
        return new hxl.classes.Column(undefined, [], header);
    }
    var result = spec.match(/^\s*(#[A-Za-z][A-Za-z0-9_]*)((\s*\+[A-Za-z][A-Za-z0-9_]*)*)?\s*$/);
    var attributes = [];
    if (result) {
        if (result[2]) {
            // filter out empty values
            attributes = result[2].split(/\s*\+/).filter(function(attribute) { return attribute.toLowerCase(); });
        }
        return new hxl.classes.Column(result[1].toLowerCase(), attributes, header);
    } else if (useException) {
        throw "Bad tag specification: " + spec;
    } else {
        hxl.log("Bad tag specification: " + spec);
        return new hxl.classes.Column(undefined, [], header);
    }
};

/**
 * Create a deep copy of this column spec.
 *
 * This method is mainly useful for filters that want to modify a column.
 *
 * @return {hxl.classes.Column} A deep copy of this columns spec.
 */
hxl.classes.Column.prototype.clone = function() {
    return new hxl.classes.Column(this.tag, this.attributes.slice(0), this.header);
};


////////////////////////////////////////////////////////////////////////
// hxl.classes.TagPattern
////////////////////////////////////////////////////////////////////////

/**
 * A compiled pattern for matching HXL columns.
 *
 * <p>You should not normally call this constructor directly. All
 * functions that use a pattern compile it as needed, so you can stick
 * with strings.  If you want to precompile a pattern, use the static
 * {@link #parse} method.</p>
 *
 * <p>The other useful method in this class is {@link #match}, with
 * tests the pattern against a {@link hxl.classes.Column}.</p>
 *
 * <p>A pattern specification looks like a normal HXL hashtag and
 * attributes, except that it can contain "-" attributes as well as
 * "+" attributes. For example, the following pattern matches any
 * column with the tag "#org", the attribute "+funder", and *not* the
 * attribute "+impl" (any other attributes are ignored):</p>
 *
 * <pre>
 * #org+funder-impl
 * </pre>
 *
 * <p>More examples:</p>
 *
 * <p><b>#adm1</b> will match the following: #adm1, #adm1+code, #adm1+fr,
 * #adm1+name, etc.</p>
 *
 * <p><b>#adm1-code</b> will match #adm1, #adm1+fr, and #adm1+name,
 * but *not* #adm1+code (because the +code attribute is explicitly
 * forbidden).</p>
 *
 * <p><b>#adm1+name-fr</b> will match #adm1+name or #adm1+name+en, but
 * not #adm1+name+fr</p>
 *
 * @constructor
 * @param {string} tag The basic tag to use in the pattern, with the
 * leading '#'
 * @param {array} includeAttributes A (possibly-empty) list of
 * attribute names that must be present, without the leading '+'
 * @param {array} excludeAttributes A (possibly-empty) list of
 * attribute names that must *not* be present, without the leading '+'
 * @see hxl.classes.Column
 */
hxl.classes.TagPattern = function (tag, includeAttributes, excludeAttributes, isAbsolute) {
    this.tag = tag;
    this.includeAttributes = includeAttributes;
    this.excludeAttributes = excludeAttributes;
    this.isAbsolute = isAbsolute; // defaults to a false value
}

/**
 * Test if a column matches this pattern.
 *
 * <pre>
 * data.columns.forEach(function(col) {
 *   if (pattern.match(col)) {
 *     console.log("Found a match: " + col.displayTag);
 *   }
 * });
 * </pre>
 *
 * This method is used heavily in the filter classes.
 *
 * @param {hxl.classes.Column} column The column to test.
 * @return {boolean} true on match, false otherwise.
 */
hxl.classes.TagPattern.prototype.match = function(column) {
    var attribute, i;

    // in case it's not already parsed
    column = hxl.classes.Column.parse(column, "");

    // fail if this column isn't tagged
    if (!column.tag) {
        return false;
    }

    // tags must match
    if (this.tag != '#*' && (column && this.tag != column.tag)) {
        return false;
    }

    // include attributes must be present
    for (i = 0; i < this.includeAttributes.length; i++) {
        attribute = this.includeAttributes[i];
        if (column.attributes.indexOf(attribute) < 0) {
            return false;
        }
    }

    if (this.isAbsolute) {
        // only includeAttributes are allowed
        for (i = 0; i < column.attributes.length; i++) {
            if (this.includeAttributes.indexOf(column.attributes[i]) < 0) {
                return false;
            }
        }
    } else {
        // exclude attributes must not be present, but any others are OK
        for (i = 0; i < this.excludeAttributes.length; i++) {
            attribute = this.excludeAttributes[i];
            if (column.attributes.indexOf(attribute) > -1) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Test if a tag pattern matches any columns in a list.
 */
hxl.classes.TagPattern.prototype.matchList = function(columns) {
    for (var i = 0; i < columns.length; i++) {
        if (this.match(columns[i])) {
            return true;
        }
    }
    return false;
};

/**
 * Parse a string into a tag pattern.
 *
 * <pre>
 * var pattern = hxl.classes.TagPattern.parse('#org+funder-impl');
 * </pre>
 *
 * It is safe to pass an already-compiled {@link hxl.classes.TagPattern}
 * to this method; it will simple be returned as-is.
 *
 * @param {string} pattern a tag-pattern string, like "#org+funder-impl"
 * @param useException (optional) throw an exception on failure.
 * @return a hxl.classes.TagPattern, or null if parsing fails (and useException is false).
 */
hxl.classes.TagPattern.parse = function(pattern, useException) {
    var result, includeAttributes, excludeAttributes, attributeSpecs, i;
    if (pattern instanceof hxl.classes.TagPattern) {
        // If this is already parsed, then just return it.
        return pattern;
    } else if (!pattern) {
        if (useException) {
            throw new Error("No tag pattern provided");
        } else {
            return null;
        }
    } else {
        result = String(pattern).match(/^\s*#?(\*|[A-Za-z][A-Za-z0-9_]*)((?:\s*[+-][A-Za-z][A-Za-z0-9_]*)*)\s*(!)?\s*$/);
        if (result) {
            includeAttributes = [];
            excludeAttributes = [];
            attributeSpecs = result[2].split(/\s*([+-])/).filter(function(item) { return item; });
            for (i = 0; i < attributeSpecs.length; i += 2) {
                if (attributeSpecs[i] == "+") {
                    includeAttributes.push(attributeSpecs[i+1].toLowerCase());
                } else {
                    excludeAttributes.push(attributeSpecs[i+1].toLowerCase());
                }
            }
            var isAbsolute = false;
            if (result[3] == "!") {
                isAbsolute = true;
            }
            return new hxl.classes.TagPattern('#' + result[1].toLowerCase(), includeAttributes, excludeAttributes, isAbsolute);
        } else if (useException) {
            throw "Bad tag pattern: " + pattern;
        } else {
            hxl.log("Bad tag pattern: " + pattern);
            return null;
        }
    }
}

hxl.classes.TagPattern.toString = function() {
    var s = this.tag;
    if (this.includeAttributes) {
        s += "+" + this.includeAttributes.join("+");
    }
    if (this.excludeAttributes) {
        s += "-" + this.excludeAttributes.join("-");
    }
    if (this.isAbsolute) {
        s += "!";
    }
    return s;
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.Row
////////////////////////////////////////////////////////////////////////

/**
 * Wrapper for a row of HXL data.
 * @constructor
 */
hxl.classes.Row = function (values, columns) {
    this.values = values;
    this.columns = columns;
}

/**
 * Look up the first value that matches a tag pattern.
 *
 * @param pattern The tag pattern to use.
 * @return a string value, or null if none found.
 */
hxl.classes.Row.prototype.get = function(pattern) {
    var i;
    pattern = hxl.classes.TagPattern.parse(pattern, true);
    for (i = 0; i < this.columns.length && i < this.values.length; i++) {
        if (pattern.match(this.columns[i])) {
            return this.values[i];
        }
    }
    return null;
}

/**
 * Look up all values that match a tag pattern.
 *
 * @param pattern The tag pattern to use.
 * @return a possibly-empty array of string values (or nulls).
 */
hxl.classes.Row.prototype.getAll = function(pattern) {
    var row = this, values = [];
    pattern = hxl.classes.TagPattern.parse(pattern, true);
    this.columns.forEach((column, index) => {
        if (pattern.match(column)) {
            values.push(row.values[index]);
        }
    });
    return values;
}


/**
 * Make a deep copy of a row's values (not the columns).
 *
 * This method is especially useful for filters.
 *
 * @return {hxl.classes.Row} a new row object.
 */
hxl.classes.Row.prototype.clone = function() {
    return new hxl.classes.Row(this.values.slice(0), this.columns);
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.BaseFilter (override for specific filters).
////////////////////////////////////////////////////////////////////////

/**
 * Abstract class for a HXL filter.
 *
 * Provide basic scaffolding for creating a class that reads from
 * a HXL source, transforms the data on the fly, then sends out a new
 * stream of HXL data.
 *
 * @constructor
 * @augments hxl.classes.Source
 * @param {hxl.classes.Source} source Another HXL data source to read from.
 */
hxl.classes.BaseFilter = function (source) {
    hxl.classes.Source.call(this);
    this.source = source;
}

hxl.classes.BaseFilter.prototype = Object.create(hxl.classes.Source.prototype);
hxl.classes.BaseFilter.prototype.constructor = hxl.classes.BaseFilter;

hxl.classes.BaseFilter.prototype.getColumns = function() {
    return this.source.getColumns();
}

hxl.classes.BaseFilter.prototype.iterator = function() {
    return this.source.iterator();
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.RowFilter
////////////////////////////////////////////////////////////////////////

/**
 * HXL filter class to select rows from a source.
 *
 * Usage:
 *
 * // select all rows where #adm1 is the Coastal Region
 * // *or* the population is greater than 1,000
 * var filter = new hxl.classes.RowFilter(source,
 *   { pattern: '#adm1', test: 'Coastal Region' },
 *   { pattern: '#population+num', test: function(v) { return v > 1000; } }
 * ]);
 *
 * Predicates are always "OR"'d together. If you need
 * a logical "AND", then chain another select filter.
 *
 * @constructor
 * @param source the hxl.classes.Source
 * @param predicates a list of predicates, each of 
 * has a "test" property (and optionally, a "pattern" property).
 */
hxl.classes.RowFilter = function (source, predicates, invert) {
    hxl.classes.BaseFilter.call(this, source);
    this.predicates = this._compilePredicates(predicates);
    this.invert = invert;
}

hxl.classes.RowFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.RowFilter.prototype.constructor = hxl.classes.RowFilter;

/**
 * Override HXLFIlter.iterator to return only select rows.
 *
 * @return an iterator object that will skip rows that fail to pass at
 * least one of the predicates.
 */
hxl.classes.RowFilter.prototype.iterator = function() {
    var iterator = this.source.iterator();
    var outer = this;
    return {
        next: function() {
            var row;
            while (row = iterator.next()) {
                if (outer._tryPredicates(row)) {
                    return row;
                }
            }
            return null;
        }
    }
}

/**
 * Operator functions.
 */
hxl.classes.RowFilter.OPERATORS = {
    '=': (a, b) => { return a == b; },
    '!=': (a, b) => { return a != b; },
    '<': (a, b) => { return a < b; },
    '<=': (a, b) => { return a <= b; },
    '>': (a, b) => { return a > b; },
    '>=': (a, b) => { return a >= b; },
    '~': (a, b) => { return a.match(b); },
    '!~': (a, b) => { return !a.match(b); }
};

/**
 * Precompile the tag patterns in the predicates.
 *
 * @param predicates the predicates as input
 * @return a compiled/normalised list of predicates
 * @exception if one of the tag patterns is malformed
 */
hxl.classes.RowFilter.prototype._compilePredicates = function(predicates) {

    /**
     * Helper function: compile the tag pattern, if present
     */
    var parsePattern = pattern => {
        if (pattern) {
            return hxl.classes.TagPattern.parse(pattern);
        } else {
            return null;
        }
    };

    /**
     * Helper function: if test is a plain string, create an equality function.
     */
    var parseTest = test => {
        if (typeof(test) != 'function') {
            test = hxl.normaliseString(test);
            return value => { return hxl.normaliseString(value) == test; };
        } else {
            return test;
        }
    };

    /**
     * Helper function: parse a string predicate.
     */
    var parsePredicate = s => {
        var operator, expected;

        // loose expression (parsing the pattern will verify)
        var result = s.match(/^\s*([^!=~<>]+)\s*(!?[=~]|<=?|>=?)(.*)$/);
        if (result) {
            operator = hxl.classes.RowFilter.OPERATORS[result[2]];
            expected = hxl.normaliseString(result[3]);
            return {
                pattern: parsePattern(result[1]),
                test: value => { return operator(hxl.normaliseString(value), expected); }
            };
        } else {
            throw Error("Bad predicate: " + s);
        }
    };

    // If it's not a list, wrap it in one
    if (!Array.isArray(predicates)) {
        predicates = [ predicates ];
    }

    // Map the list to a compiled/normalised version
    return predicates.map(predicate => {
        if (typeof(predicate) == 'object') {
            return {
                pattern: parsePattern(predicate.pattern),
                test: parseTest(predicate.test)
            };
        } else if (typeof(predicate) == 'function') {
            return {
                test: predicate
            };
        } else {
            return parsePredicate(predicate);
        }
    });
}

/**
 * Return success if _any_ of the predicates succeeds.
 */
hxl.classes.RowFilter.prototype._tryPredicates = function(row) {
    var predicate;

    // Try every predicate on the row
    for (var i = 0; i < this.predicates.length; i++) {
        predicate = this.predicates[i];

        // If the first part is set, then it's a tag pattern
        // test only the values with hashtags that match
        if (predicate.pattern) {
            var values = row.getAll(predicate.pattern);
            for (var j = 0; j < values.length; j++) {
                if (predicate.test(values[i])) {
                    return !this.invert;
                }
            }
        } 

        // If the first part is not set, then it's a row predicate
        // test the whole row at once
        else {
            if (this.invert) {
                return !predicate.test(row);
            } else {
                return predicate.test(row);
            }
        }
    }

    return this.invert;
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.ColumnFilter
////////////////////////////////////////////////////////////////////////

/**
 * HXL filter class to remove columns from a dataset.
 *
 * @constructor
 * @param source the HXL data source (may be another filter).
 * @param patterns a list of HXL tag patterns to include (or exclude).
 * @param invert if true, exclude matching columns rather than including them (blacklist).
 */
hxl.classes.ColumnFilter = function (source, patterns, invert) {
    hxl.classes.BaseFilter.call(this, source);
    this.patterns = this._compilePatterns(patterns);
    this.invert = invert;
}

hxl.classes.ColumnFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.ColumnFilter.prototype.constructor = hxl.classes.ColumnFilter;

/**
 * Override hxl.classes.BaseFilter.getColumns to return only the allowed columns.
 *
 * This method triggers lazy processing that also saves the indices for
 * slicing the data itself.
 *
 * @return a list of hxl.classes.Column objects.
 */
hxl.classes.ColumnFilter.prototype.getColumns = function() {
    if (typeof(this._savedColumns) == 'undefined') {

        /**
         * Check if any of the patterns matches the column.
         */
        var columnMatches = function(column, patterns) {
            for (var i = 0; i < patterns.length; i++) {
                if (patterns[i].match(column)) {
                    return true;
                }
            }
            return false;
        };

        // we haven't extracted the columns before, so do it now
        var newColumns = [];
        var newIndices = [];

        // check every column against the patterns
        for (var i = 0; i < this.source.columns.length; i++) {
            var isMatch = columnMatches(this.source.columns[i], this.patterns);
            if ((isMatch && !this.invert) || (!isMatch && this.invert)) {
                newColumns.push(this.source.columns[i]);
                newIndices.push(i);
            }
        }

        // save the columns and indices for future use
        this._savedColumns = newColumns;
        this._savedIndices = newIndices;
    }

    // return the saved columns
    return this._savedColumns;
}

/**
 * Override hxl.classes.BaseFilter.iterator to get data with some columns removed.
 *
 * @return an iterator object to read the modified data rows.
 */
hxl.classes.ColumnFilter.prototype.iterator = function () {
    var outer = this;
    var iterator = this.source.iterator();
    return {
        next: function() {
            var i, values;
            var columns = outer.columns; // will trigger lazy column processing
            var row = iterator.next();
            if (row) {
                // Use the saved indices to slice values
                values = [];
                for (i = 0; i < outer._savedIndices.length; i++) {
                    values.push(row.values[outer._savedIndices[i]]);
                }
                return new hxl.classes.Row(values, columns);
            } else {
                // end of data
                return null;
            }
        }
    }
}

/**
 * Normalise and optimize the list of column patterns.
 */
hxl.classes.ColumnFilter.prototype._compilePatterns = function (patterns) {
    if (!Array.isArray(patterns)) {
        patterns = [ patterns ];
    }
    return patterns.map(pattern => {
        return hxl.classes.TagPattern.parse(pattern);
    });
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.CountFilter
////////////////////////////////////////////////////////////////////////

/**
 * HXL filter to count and aggregate data.
 *
 * By default, this filter put out a dataset with the selected tags
 * and a new tag #meta+count giving the number of times each
 * combination of values appears. If the aggregate tag pattern is
 * present, the filter will also produce a column with the sum,
 * average (mean), minimum, and maximum values for the tag, attaching
 * the attributes +sum, +avg, +min, and +max to the core tag.
 *
 * @constructor
 * @param source the HXL data source (may be another filter).
 * @param patterns a list of tag patterns (strings or hxl.classes.TagPattern
 * objects) whose values make up a shared key.
 */
hxl.classes.CountFilter = function (source, patterns, aggregate) {
    hxl.classes.BaseFilter.call(this, source);
    if (patterns) {
        if (!Array.isArray(patterns)) {
            patterns = [ patterns ];
        }
        this.patterns = patterns.map(pattern => { return hxl.classes.TagPattern.parse(pattern, true); });
    } else {
        throw new Error("No tag patterns specified");
    }
    if (aggregate) {
        this.aggregate = hxl.classes.TagPattern.parse(aggregate, true);
    } else {
        this.aggregate = null;
    }
}

hxl.classes.CountFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.CountFilter.prototype.constructor = hxl.classes.CountFilter;

/**
 * Override hxl.classes.BaseFilter.getColumns to return only the columns for the aggregation report.
 *
 * Will list the tags that match the patterns provided in the
 * constructor, as well as a #meta+count tag, and aggregation tags if
 * the aggregation parameter was included.
 *
 * @return a list of hxl.classes.Column objects
 */
hxl.classes.CountFilter.prototype.getColumns = function() {
    var cols, indices, tagspec;
    if (!this._savedColumns) {
        cols = [];
        indices = [];
        for (var i = 0; i < this.source.columns.length; i++) {
            for (var j = 0; j < this.patterns.length; j++) {
                if (this.patterns[j].match(this.source.columns[i])) {
                    cols.push(this.source.columns[i]);
                    indices.push(i);
                    break;
                }
            }
        }
        cols.push(hxl.classes.Column.parse('#meta+count'));
        if (this.aggregate) {
            tagspec = this.aggregate.tag;
            cols.push(hxl.classes.Column.parse(tagspec + '+sum'));
            cols.push(hxl.classes.Column.parse(tagspec + '+avg'));
            cols.push(hxl.classes.Column.parse(tagspec + '+min'));
            cols.push(hxl.classes.Column.parse(tagspec + '+max'));
        }
        this._savedColumns = cols;
        this._savedIndices = indices;
    }
    return this._savedColumns;
}

/**
 * Override hxl.classes.BaseFilter.iterator to return a set of rows with aggregated values.
 *
 * Each row represents a unique set of values and the number of times
 * it occurs.
 *
 * @return an iterator over the aggregated data.
 */
hxl.classes.CountFilter.prototype.iterator = function() {
    var columns = this.columns; // will trigger lazy column creation
    var data = this._aggregateData();
    var pos = 0;
    return {
        next: () => {
            if (pos < data.length) {
                return new hxl.classes.Row(data[pos++], columns);
            } else {
                return null;
            }
        }
    };
}

/**
 * Monster ugly function to aggregate data.
 * FIXME: can I decompose this into smaller parts?
 */
hxl.classes.CountFilter.prototype._aggregateData = function() {
    var row, key, values, value, entry, aggregates;
    var dataMap = {};
    var data = [];
    var iterator = this.source.iterator();

    // Make a unique map of data values
    while (row = iterator.next()) {
        rowInfo = this._scanRow(row);

        // Always do a count
        if (dataMap[rowInfo.key]) {
            dataMap[rowInfo.key].count += 1;
        } else {
            // create if it doesn't exist yet
            dataMap[rowInfo.key] = {count: 1, values: rowInfo.values};
        }

        // Aggregate numeric values if requested
        if (this.aggregate) {
            // try parsing, and proceed only if it's numeric
            value = parseFloat(row.get(this.aggregate));
            if (!isNaN(value)) {
                entry = dataMap[rowInfo.key].aggregates;
                if (entry) {
                    // Not the first value
                    entry.total++;
                    entry.sum += value;
                    entry.avg = (entry.avg * (entry.total - 1) + value) / entry.total;
                    entry.min = (value < entry.min ? value : entry.min);
                    entry.max = (value > entry.max ? value : entry.max);
                } else {
                    // the first value
                    dataMap[rowInfo.key].aggregates = {
                        total: 1,
                        sum: value,
                        avg: value,
                        min: value,
                        max: value
                    }
                }
            }
        }
    }

    // Generate the data from the map
    for (key in dataMap) {

        // first set of unnormalised values associated with the key
        values = dataMap[key].values;

        // Add the count
        values.push(dataMap[key].count);

        // Add other aggregates if requested
        if (this.aggregate) {
            entry = dataMap[key].aggregates;
            if (entry) {
                values = values.concat([
                    entry.sum,
                    entry.avg,
                    entry.min,
                    entry.max
                ]);
            } else {
                values = values.concat([
                    '', '', '', ''
                ]);
            }
        }

        // Row is finished.
        data.push(values);
    }

    // return all the rows
    return data;
}

/**
 * Construct a unique key from the requested values in a row of data.
 *
 * @return the unique key as a single string.
 */
hxl.classes.CountFilter.prototype._scanRow = function(row) {
    var keys = [];
    var values = [];
    for (i = 0; i < this._savedIndices.length; i++) {
        var rawValue = row.values[this._savedIndices[i]];
        keys.push(hxl.normaliseString(rawValue));
        values.push(rawValue);
    }
    return {key: keys.join("\0"), values: values};
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.RenameFilter
////////////////////////////////////////////////////////////////////////

/**
 * HXL filter to rename a column (new header and tag).
 *
 * @constructor
 * @param source the hxl.classes.Source
 * @param pattern the tag pattern to replace
 * @param newTag the new HXL tag (with attributes)
 * @param newHeader (optional) the new text header. If undefined or
 * null or false, don't change the existing header.
 * @param index the zero-based index of the match to replace. If
 * undefined or null or false, replace *all* matches.
 */
hxl.classes.RenameFilter = function(source, pattern, newTagspec, newHeader, index) {
    hxl.classes.BaseFilter.call(this, source);
    this.pattern = hxl.classes.TagPattern.parse(pattern);
    this.newTagspec = newTagspec;
    this.newHeader = newHeader;
    this.index = index;
    this._savedColumns = undefined;
}

hxl.classes.RenameFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.RenameFilter.prototype.constructor = hxl.classes.RenameFilter;

/**
 * Get the renamed columns.
 */
hxl.classes.RenameFilter.prototype.getColumns = function() {
    var cols, header;
    var pattern = this.pattern;
    var tagspec = this.newTagspec;
    var index = this.index;
    if (this._savedColumns === undefined) {
        cols = [];
        // loop through the columns, translating as needed
        this.source.getColumns().forEach(col => {
            // Index has to be 0 or undefined for a match
            if (pattern.match(col) && !index) {
                // we have a match!
                if (this.header === undefined) {
                    header = col.header;
                } else {
                    header = this.header;
                }
                col = hxl.classes.Column.parse(tagspec, header);
                cols.push(col);
            } else {
                // no match: use existing column
                cols.push(col);
            }
            // decrement the index counter if present
            if (index) {
                index -= 1;
            }
        });
        this._savedColumns = cols;
    }
    return this._savedColumns;
}

/**
 * Return copies of the rows with the new columns.
 *
 * @returnn {fobject} A new row iterator, with a next() method.
 */
hxl.classes.RenameFilter.prototype.iterator = function () {
    var iterator = this.source.iterator();
    var outer = this;
    return {
        next: function() {
            row = iterator.next();
            if (row) {
                row = new hxl.classes.Row(row.values, outer.getColumns());
            }
            return row;
        }
    };
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.CacheFilter
////////////////////////////////////////////////////////////////////////

/**
 * HXL filter to save a copy of a transformed HXL dataset.
 *
 * This filter stops the chain, so that any future requests won't
 * go back and repeat earlier transformations. You should use it
 * when there are some expensive operations earlier in the chain
 * that you don't want to repeat.
 *
 * @constructor
 * @this {CacheFilter}
 * @param {hxl.classes.Source} source the hxl.classes.Source
 */
hxl.classes.CacheFilter = function (source) {
    hxl.classes.BaseFilter.call(this, source);
    this._savedColumns = undefined;
    this._savedRows = undefined;
}

hxl.classes.CacheFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.CacheFilter.prototype.constructor = hxl.classes.CacheFilter;

hxl.classes.CacheFilter.prototype.getColumns = function() {
    if (this._savedColumns === undefined) {
        this._savedColumns = this.source.getColumns();
    }
    return this._savedColumns;
}

hxl.classes.CacheFilter.prototype.iterator = function() {
    var index = 0;
    if (this._savedRows === undefined) {
        this._savedRows = this.source.getRows();
    }
    return {
        next: function() {
            if (index < this._savedRows.length) {
                return this._savedRows[index++];
            } else {
                return null;
            }
        }
    };
}


////////////////////////////////////////////////////////////////////////
// hxl.classes.IndexFilter
////////////////////////////////////////////////////////////////////////

/**
 * Add index attributes (+i0, +i1, etc.) to a repeated tag.
 *
 * This is useful for query-type processing, where it's not otherwise
 * easy to work with order. Normally, it's better to use semantic
 * attributes like #org+funder, #org+impl, etc., but in some cases,
 * that's not available, so you can automatically number the tags
 * as #org+i0, #org+i1, etc., from left to right.
 *
 * @constructor
 * @this{IndexFilter}
 * @param {hxl.classes.Source} source the hxl.classes.Source
 * @param {string} pattern the tag pattern to replace (see {@link hxl.classes.TagPattern}).
 */
hxl.classes.IndexFilter = function (source, pattern) {
    hxl.classes.BaseFilter.call(this, source);
    this.pattern = hxl.classes.TagPattern.parse(pattern);
}

hxl.classes.IndexFilter.prototype = Object.create(hxl.classes.BaseFilter.prototype);
hxl.classes.IndexFilter.prototype.constructor = hxl.classes.IndexFilter;

hxl.classes.IndexFilter.prototype.getColumns = function() {
    var pattern = this.pattern;
    if (this._savedColumns == undefined) {
        var i = 0;
        var cols = [];
        this.source.columns.forEach(col => {
            if (pattern.match(col)) {
                col = col.clone();
                col.attributes.push('i' + i++);
            }
            cols.push(col);
        });
        this._savedColumns = cols;
    }
    return this._savedColumns;
}

// end
