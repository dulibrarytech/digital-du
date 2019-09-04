 /**
 * @file 
 *
 * Discovery Helper Functions
 *
 */

'use strict'

var config = require('../config/' + process.env.CONFIGURATION_FILE);

/**
 * Create array of 'view data' objects, one for each result item in the input object array
 *
 * @param {Array} objects - Array of Elastic search result _source objects
 *
* @typedef (Object) viewData - List of 'view data' objects
 * @property {String} pid - Object pid
 * @property {String} tn - Object TN image source path
 * @property {String} title - Object title
 * @property {String} path - {"/collection"|"/object"} based on object type
 *
 * @return {viewData}
 */
 exports.getObjectLinkDisplayList = function(objects) {
  var objectList = [], tn, pid, title, path;
  for(var object of objects) {

    title = object.title || null;
    if(!title || title == "") {
      title = config.noTitlePlaceholder;
    }

    pid = object.pid || "";
    if(!pid) {
      console.log("Error: Object " + object + " has no pid value");
    }
    tn = config.rootUrl + "/datastream/" + object.pid + "/tn";

    if(!object.object_type) {
      console.log("Error: Object " + object + " has no object_type value");
    }
    path = "/" + object.object_type || "";

    // Push the current object view data to the list
    objectList.push({
        pid: pid,
        tn: tn,
        title: title,
        path: path
      });
  }

  return objectList;
}

 /**
 * Get facet counts by name
 *
 * @param {Array} facets - Elastic aggregations object
 * @return {Object} Object of facet count data
 */
exports.getTypeFacetTotalsObject = function(facets) {
  var totals = {};
  for(var facet of facets.Type.buckets) {
    for(var key in config.facetLabelNormalization.Type) {
      if(config.facetLabelNormalization.Type[key].includes(facet.key)) {
        totals[key] = {
          "count": facet.doc_count,
          "key": facet.key
        };
      }
    }
  }

  return totals;
}

 /**
 * Not in use
 */
exports.sortSearchResultObjects = function(objects) {
	var titles = [], sorted = [];

	// Sort the titles alphabetically
	for(var object of objects) {
		titles.push(object.title[0]);
	}
	titles.sort();
	
	// Sort the objects based on the sorted titles.
	for(var title of titles) {
		for(object of objects) {
			if(object.title[0] == title) {
				sorted.push(object);
			}
		}
	}
	return sorted;
}

 /**
 * Wrapper function for createBreadcrumbLinks
 *
 * @param {Array.<{pid: String - The collection pid, name: String - The collection name, url: String - Absolute path to the collection's view}>} collections
 * @return {String|null} The html string, null if the collections array is empty
 */
exports.getCollectionBreadcrumbObject = function(collections) {
    return createBreadcrumbLinks(collections);
};

/**
 * Creates an html breadcrumb link list for an array of collections
 *
 * @param {Array.<{pid: String - The collection pid, name: String - The collection name, url: String - Absolute path to the collection's view}>} collections
 * @return {String|null} The html string, null if the collections array is empty
 */
function createBreadcrumbLinks(collections) {
    var html = "";
    for (var i = 0; i < collections.length; i++) {
    	if(i>0) {
    		html += '&nbsp&nbsp<span>></span>&nbsp&nbsp';
    	}
        html += '<a class="collection-link" href="' + collections[i].url + '">' + collections[i].name + '</a>';
    }
    return collections.length > 0 ? html : null;
};

 /**
 * Creates an Elastic 'aggs' query for an Elastic query object 
 *
 * @param {Object} facets - DDU facet fields configuration
 * @return {Object} Elastic DSL aggregations query object
 */
exports.getFacetAggregationObject = function(facets) {
	var facetAggregations = {}, field;
    for(var key in facets) {
      field = {};
      field['field'] = facets[key] + ".keyword";
      field['size'] = config.facetLimit;
      facetAggregations[key] = {
        "terms": field
      };
    }

    return facetAggregations;
}

 /**
 * Finds the IIIF object type that corresponds with an object's mime type
 *
 * @param {String} mimeType - Object mime type (ex "audio/mp3")
 * @return {String} IIIF object type
 */
exports.getIIIFObjectType = function(mimeType) {
  let objectTypes = config.IIIFObjectTypes, 
      localObjectTypes = config.objectTypes,
      objectType = null;

  for(var type in localObjectTypes) {
    if(localObjectTypes[type].includes(mimeType)) {
      objectType = objectTypes[type];
    }
  }

  return objectType;
}

 /**
 * Finds the DDU datastream ID that corresponds with an object's mime type
 *
 * @param {String} mimeType - Object mime type (ex "audio/mp3")
 * @return {String} DDU datastream ID
 */
exports.getDsType = function(mimeType) {
  let datastreams = config.datastreams,
      datastream = "",
      objectType = null;

  for(var key in datastreams) {
    if(datastreams[key].includes(mimeType)) {
      datastream = key;
    }
  }

  return datastream;
}

 /**
 * Finds the DDU object type that corresponds with an object's mime type
 *
 * @param {String} mimeType - Object mime type (ex "audio/mp3")
 * @return {String} DDU object type
 */
exports.getObjectType = function(mimeType) {
  let type = "";
  for(var key in config.objectTypes) {
    if(config.objectTypes[key].includes(mimeType)) {
      type = key;
    }
  }
  return type;
}


