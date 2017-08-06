'use strict';

const es = require('../config/index'),
    config = require('../config/config');

// Compose links to backend repository
var createCollectionList= function(pidArray) {
	var updatedArray = [], fedoraPid;

	for(var index of pidArray) {
		fedoraPid = index.replace('_', ':');
		updatedArray.push({
			pid: index,
	    	tn: config.fedoraPath + "/fedora/objects/" + fedoraPid + "/datastreams/TN/content"
	    });
	}
	return updatedArray;
};

exports.getCollections = function(pid, callback) {
	var collections = [], collectionList = [];

	// Query ES for all objects with rels-ext/isMemberOfCollection == pid
	es.search({
        index: config.elasticsearchIndex,
        type: "data",
  		q: "rels-ext_isMemberOfCollection:" + pid
    }).then(function (body) {

    	for(var i=0; i<body.hits.total; i++) {
    		collections.push(body.hits.hits[i]._source.pid);
    	}

    	collectionList = createCollectionList(collections);
	    callback({status: true, data: collectionList});

    }, function (error) {
        console.log("Error: ", error);
        callback({status: false, message: error, data: null});
    });
};

exports.searchIndex = function(query, type, callback) {

    var field = { match: "" };
    var matchFields = [], results = [];
    if(type == 'all') {

        // TODO: Add fields dynamically based on config settings (loop config object)
        var q = {};
         q['title'] = query;
        matchFields.push({
            "match": q
        });
        var q = {};
         q['namePersonal'] = query;
        matchFields.push({
            "match": q
        });
        var q = {};
         q['subjectTopic'] = query;
        matchFields.push({
            "match": q
        });
    }
    else {
        var q = {};
        q[type] = query;
        field.match = q;
        matchFields.push(field);
    }

    var tObj = {  
      index: config.elasticsearchIndex,
      type: 'mods',
      body: {
        query: {
            "bool": {
              "should": matchFields
            }
          },
      }
    }

    console.log("Query:", tObj.body.query.bool.should);


    es.search(tObj,function (error, response, status) {
        if (error){
          console.log("search error: " + error);
          callback({status: false, message: error, data: null});
        }
        else {
          console.log("--- Response ---");
          console.log(response);
          console.log("--- Hits ---");
          response.hits.hits.forEach(function(hit){
            console.log(hit);
          })
          callback({status: true, data: response});
        }
    });
};