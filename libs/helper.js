exports.testObject = function(object) {
	return (object && typeof object != "undefined");
}

exports.isParentObject = function(object) {
  return (object && typeof object.children != 'undefined');
}

exports.isObjectEmpty = function(object) {
	//return (Object.entries(object).length === 0 && object.constructor === Object)
	for(var key in object) {
        if(object.hasOwnProperty(key))
            return false;
    }
    return true;
}

// Extract values from jsonObject. Values to parse out are set in the valueMap:
exports.parseJSONObjectValues = function(valueMap, jsonObject) {
	var valuesObject = {};

	// Locate nested fields in the index
	for(var key in valueMap) {
		var mapObject, recordItem, insert=true, showValue;

		if(valueMap[key][0] == "{") {

			try {
				mapObject = JSON.parse(valueMap[key]) || {};
			}
			catch (e) {
				console.log("Error: Could not parse configuration json object", valueMap);
			}

			for(var subKey in mapObject) {	// Should only be 1 at first
				recordItem = jsonObject[subKey] || [];

				if(typeof recordItem[0] == "string") {
					valuesObject[key] = recordItem;
				}

				else if(typeof recordItem[0] == "object") {
					showValue = [];
					for(var index in recordItem) {
						for(var data in mapObject[subKey][0]) {
							console.log("TEST", mapObject[subKey][0][data]);
							if(recordItem[index][data] != mapObject[subKey][0][data] && mapObject[subKey][0][data] != "VALUE") {
								insert = false;
							}

							if(mapObject[subKey][0][data]== "VALUE" &&
								typeof recordItem[index][data] != "undefined") {
								showValue.push(recordItem[index][data]);
							}
						}
					}
					if(insert && showValue.length > 0) {
						valuesObject[key] = showValue;
					}
				}
			}
		}

		// Use the value from a flat field
		else {
			if(typeof jsonObject[valueMap[key]] != 'undefined') {
				valuesObject[key] = jsonObject[valueMap[key]];
			}
		}
	}

	return valuesObject;
}