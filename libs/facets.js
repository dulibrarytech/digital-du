'use strict';

exports.create = function (facets) {
    var facetObj = {};
    for(var key in facets) {
        facetObj[key] = createList(key, facets[key].buckets);
    }

    return facetObj;
};

exports.getFacetBreadcrumbObject = function(selectedFacets) {

    var breadcrumbs = [], buckets;

    // Create the object to populate the view elements
    for(var key in selectedFacets) {
        buckets = selectedFacets[key];

        for(var index of buckets) {
            breadcrumbs.push({
                type: key,
                name: index
            });
        }
    }

    return createBreadcrumbTrail(breadcrumbs);
};

function createList(facet, data) {
    var i;
    var html = '';
    html += '<div class="panel"><ul>';
    for (i = 0; i < data.length; i++) {
        // If the key is not empty, add the facet to the list
        // if(data[i].key != "") {
        //     html += '<div id="facet-listing"><span class="facet-name-label"><a href="javascript:document.location.href=selectFacet(\'' + facet + '\', \'' + data[i].key + '\');">' + data[i].key + '</a></span><span class="facet-count-label">' + data[i].doc_count + '</span></div><br>';   // good
        //     //html += '<span><a  onclick="selectFacet(\'' + facet + '\', \'' + data[i].key + '\');">' + data[i].key + '</a>&nbsp;&nbsp;(' + data[i].doc_count + ')</span><br>';   // test
        // }

        // Ex4
        if(data[i].key != "") {
            html += '<li><span class="facet-name"><a href="javascript:document.location.href=selectFacet(\'' + facet + '\', \'' + data[i].key + '\');">' + data[i].key + '</a></span><span class="facet-count">' + data[i].doc_count + '</span></li>';
        }
    }
    html += '</ul></div>';
    return html;
};

function createBreadcrumbTrail(data) {
    var i;
    var html = '';
    for (i = 0; i < data.length; i++) {

        html += '<span><a href="javascript:document.location.href=removeFacet(\'' + data[i].type + '\', \'' + data[i].name + '\');"><strong>X</strong></a>' + data[i].type + '&nbsp&nbsp<strong style="color: green"> > </strong>&nbsp&nbsp' + data[i].name + '</span>';   // good
        //html += '<span><a  onclick="removeFacet(\'' + data[i].type + '\', \'' + data[i].name + '\');"><strong id="facet-breadcrumb-remove-link">X</strong></a>' + data[i].type + '&nbsp&nbsp<strong id="facet-breadcrumb-sidearrow"> > </strong>&nbsp&nbsp' + data[i].name + '</span>';   // test
    }

    return html;
};

