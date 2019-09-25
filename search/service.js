 /**
 * @file 
 *
 * Search Service Functions
 *
 */

'use strict';

const es = require('../config/index'),
      fs = require('fs'),
      util = require('util'),
      config = require('../config/' + process.env.CONFIGURATION_FILE),
      request  = require("request"),
      Repository = require('../libs/repository'),
      Helper = require("./helper");

/**
 * Search the index
 * Perform a search with query data and search specifications
 *
 * @param {Array.<queryData>} queryData - Array of data for multiple combined queries
 * @param {Object} facets - DDU Facet object (ex {"{facet name or ID}": ["{facet value}", "{facet value}", ...]}) Currently selected facets
 * @param {String} collection - Collection PID to scope search resuts to.  No longer in use, use collection facet
 * @param {Array.<queryData>} pageNum - Page number of results to return.  Will use this page number in the Elastic search  Must be numeric
 * @param {Array.<queryData>} pageSize - Specify number of results per page directly with this value.  Must be numeric
 * @param {dateRange} daterange
 * @param {sort} sort
 *
 * @typedef {Object} dateRange
 * @property {String} from - Daterange 'search from' date.  Year only [YYYY]
 * @property {String} to - Daterange 'search to' date.  Year only [YYYY]
 *
 * @typedef {Object} sort
 * @property {String} field - Index field to sort search results by
 * @property {String} order - Order of sort ["asc"|"desc"]
 *
 * @typedef {Object} queryData - Data to perform a single query
 * @property {String} terms - Search terms
 * @property {String} field - Search in this index field; "all" to search in all configured search fields {"all"|[index field]}
 * @property {String} type - Search type ["contains|is"]
 * @property {String} bool - Bool to use to combine current query with previous query ["or"|"and"|"not"]
 *
 * @typedef {Object} searchResults - This object is the search results data object
 * @property {String} title - Result object title
 * @property {String} tn - Uri to result object thumbnail datastream
 * @property {String} pid - Result object pid
 * @property {String} objectType - Result object 'object_type' ["object"|"collection"]
 * @property {Object} display_record - Result object index display record
 *
 * @callback callback
 * @param {String|null} Error message or null
 * @param {Array.<searchResults>|null} Search results object, Null if error
 */
exports.searchIndex = function(queryData, facets=null, collection=null, pageNum=1, pageSize=10, daterange=null, sort=null, isAdvanced=false, callback) {
    var queryFields = [],
        results = [], 
        restrictions = [],
        filters = [],
        queryType,
        booleanQuery = {
          "bool": {
            "should": [],
            "must": [],
            "must_not": []
          }
        },
        currentQuery;
      
    /* 
     * Build the search fields object 
     * Use a match query for each word token, a match_phrase query for word group tokens, and a wildcard search for tokens that contain a '*'.
     * Each query is placed in a separate bool object
     */
    // Search data for each query
    var field, fields, type, terms, bool;

    // Elastic boolean objects
    var shouldArray = [], 
        mustBoolean = {
          bool: {
            must: []
          }
        },
        mustNotArray = [];

    // queryData is an array of the combined queries in the search.  A simple search will contain one query, an advanced search may contain multiple queries
    for(var index in queryData.reverse()) {
      queryFields = [];
      currentQuery = {};

      // Get the query data from the current data object, or use default data
      terms = queryData[index].terms || "";
      field = queryData[index].field || "all";
      type = queryData[index].type || "contains";
      bool = queryData[index].bool || "or";

      // If field value is "all", get all the available search fields
      fields = Helper.getSearchFields(field);
      
      // Get the Elastic query type to use for this query
      queryType = Helper.getQueryType(queryData[index]);

      // Build the elastic query
      if(Array.isArray(fields)) {
        /*
         * Loop the keywords, adding each to the main query array under the specified query type (match, wildcard, match_phrase)
         * For match queries, check for a boost value in the keyword object and add it to the query if the value is present
         */
        let fieldObj, keywordObj, queryObj, nestedQuery, nestedQueryObj;
        for(var field of fields) {
          fieldObj = {};
          keywordObj = {};
          queryObj = {};
          nestedQuery = {};
          nestedQueryObj = {};

          // Get boost value if it exists in this field object
          if(queryType == "match") {
            keywordObj = {
              "query": terms,
              "operator": "or"
            };

            // Add fuzz factor if this is not an advanced search
            if(isAdvanced == false && /[0-9]+/.test(terms) === false) {
              keywordObj["fuzziness"] = config.searchTermFuzziness;
            }

            // Add the field boost value if it is set
            if(field.boost) {
              keywordObj["boost"] = field.boost;
            }

            // Create the elastic match query object
            fieldObj[field.field] = keywordObj;
            queryObj[queryType] = fieldObj;

            // 
            let mustArray = [];
            if(field.matchField && field.matchTerm) {
              let mustQuery = {
                "match_phrase": {}
              };
              mustQuery.match_phrase[field.matchField] = field.matchTerm;
              mustArray.push(queryObj);
              mustArray.push(mustQuery);
              queryObj = {
                "bool": {
                  "must": mustArray
                }
              };
            }

            // Build a nested query for nested data ypes
            if(field.isNestedType == "true") {
              nestedQueryObj = {
                "nested": {
                  "path": field.field.substring(0,field.field.lastIndexOf(".")),
                  "score_mode": "avg",
                  "query": queryObj
                }
              }
              queryFields.push(nestedQueryObj);
            }

            else {
              queryFields.push(queryObj);
            }
          }

          else {
            if(field.isNestedType == "true") {
              fieldObj[field.field] = terms;
              queryObj[queryType] = fieldObj;
              nestedQueryObj = {
                "nested": {
                  "path": field.field.substring(0,field.field.lastIndexOf(".")),
                  "score_mode": "avg",
                  "query": queryObj
                }
              }
              queryFields.push(nestedQueryObj);
            }
            else {
              fieldObj[field.field] = terms;
              queryObj[queryType] = fieldObj;
              queryFields.push(queryObj);
            }
          }
        }
      }
      else {
        console.log("Error: invalid search field configuration", {});
      } 
      currentQuery = queryFields;

      /*
       * Add the query to the boolean object
       */
      // Add to the 'should' array
      if(bool == "or") {
        shouldArray = shouldArray.concat(currentQuery);
      }

      // Must queries must be nested in a second boolean object, which is inserted into the 'should' array
      else if(bool == "and") {
        if(currentQuery.length > 1) {
          mustBoolean.bool.must.push({
            bool: {
              should: currentQuery
            }
          });
        }
        else {
          mustBoolean.bool.must.push(currentQuery[0]);
        }
        shouldArray.push(mustBoolean);
      }

      // Add to the 'must_not' array
      else if(bool == "not") {
        mustNotArray = mustNotArray.concat(currentQuery);
      }
    }

    // Add the subquery boolean objects to the main boolean object
    booleanQuery.bool.should = shouldArray;
    booleanQuery.bool.must_not = mustNotArray;

    /*
     * Add facets and filters:
     */
    // If facets are present, apply filters to the search
    if(facets) {
      let facetKey, count=0;
      for(let facet in facets) {
        for(let value of facets[facet]) {
          let query = {};
          count++;

          // Get the facet key from the configuration, using the facet name
          facetKey = config.facets[facet];

          // Add to filters
          query[facetKey] = value;
          filters.push({
            "match_phrase": query 
          });
        }
      }
    }

    //If a date range is present, add the date range query to the must match array
    if(daterange) {
      filters.push(Helper.getDateRangeQuery(daterange));
    }

    // Do not show collection objects
    if(config.showCollectionObjectsInSearchResults == false) {
      restrictions.push({
        "match": {
          "object_type": "collection"
        }
      });
    }

    // Do not show objects that are children of compound objects
    restrictions.push({
      "exists": {
          "field": "is_child_of"
      }
    });

    // Querystring and facet search.  Add the filter query object if any filters are present
    var queryObj = {}, 
    filter = filters.length > 0 ? filters : {};
    if(queryData[0].terms != "" || facets) {
      queryObj = {
        "bool": {
          "must": booleanQuery,
          "must_not": restrictions,
          "filter": filter
        }
      }
    }

    // If empty querystring, search for all items that are not collections
    else {
      restrictions.push({
        match: {
          "object_type": "collection"
        }
      });
      queryObj = {
        "bool": {
          "must": booleanQuery,
          "must_not": restrictions
        }
      }
    }

    // DEBUG - Output the full structure of the query object
    //console.log("TEST query object:", util.inspect(queryObj, {showHidden: false, depth: null}));

    // Get elasticsearch aggregations object 
    var facetAggregations = Helper.getFacetAggregationObject(config.facets);

    // Apply sort option
    let sortArr = [];
    if(sort) {
      let data = {},
          field = config.searchSortFields[sort.field] || null;

      if(field) {
        if(field.matchField && field.matchField.length > 0) {
          // build nested data sort query
          let filterObj = {
            "term": {}
          };

          // Apply the sort if all of the required values are present and valid
          if(field.matchTerm && field.matchTerm.length > 0) {
            // Build the sort query object
            filterObj.term[field.matchField + ".keyword"] = field.matchTerm;
            data[field.path + ".keyword"] = {
              "order": sort.order,
              "nested_path": field.path.substring(0,field.path.lastIndexOf(".")),
              "nested_filter": filterObj
            }
          }
        }
        else {
          // Sort on non nested data
          data[field.path + ".keyword"] = {
            "order": sort.order
          }
        }
      }

      sortArr.push(data); // sortData
    }

    // Create elasticsearch data object
    var data = {  
      index: config.elasticsearchPublicIndex,
      type: config.searchIndexType,
      body: {
        from : (pageNum - 1) * pageSize, 
        size : pageSize,
        query: queryObj,
        sort: sortArr,
        aggregations: facetAggregations
      }
    }

    // Query the index
    es.search(data, function (error, response, status) {
      if (error || typeof response == 'undefined') {
        callback(error, {});
      }
      else {
        // Remove selected facet from the facet panel list.  The list should not show a facet option if the facet has already been selected
        Helper.removeSelectedFacets(facets, response);
        
        // Return the aggregation results for the facet display
        var responseData = {};
        responseData['facets'] = Helper.removeEmptyFacetKeys(response.aggregations);
        responseData['count'] = response.hits.total;

        try {

          // Create a normalized data object for the search results
          var results = [], tn, resultData, resultObj;
          for(var result of response.hits.hits) {

            // Get the thumbnail for this search result
            tn = config.rootUrl + "/datastream/" + result._source.pid.replace('_', ':') + "/tn";
              
            // Push a new result object to the results data array
            resultObj = {
              title: result._source.title || "No Title",
              tn: tn,
              collection: result._source.is_member_of_collection,
              pid: result._source.pid,
              objectType: result._source.object_type
            }

            // Add the display record
            resultObj[config.displayRecordField] = result._source[config.displayRecordField] || {};

            // Ad current result to the results array
            results.push(resultObj);
          }

          // Add the results array, send the response
          responseData['results'] = results;
          callback(null, responseData);
        }
        catch(error) {
          callback(error, {});
        }
      }
    });
}