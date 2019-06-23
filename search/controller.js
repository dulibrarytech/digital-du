 /**
 * @file 
 *
 * Search results view controller.  This is the main search function for the () application
 *
 */

'use strict';

const async = require('async'),
    config = require('../config/' + process.env.CONFIGURATION_FILE),
    Service = require('./service.js'),
    Facets = require('../libs/facets'),
    Paginator = require('../libs/paginator'),
    Helper = require('./helper.js'),
    Metadata = require('../libs/metadata'),
    Format = require("../libs/format");

exports.search = function(req, res) {
	var query = req.query.q || [""],
		field = req.query.field || ["all"], 
		type = req.query.type || ["contains"],
		bool = req.query.bool || ["or"],
		facets = req.query.f || null,
		page = req.query.page || 1,
		pageSize = req.query.resultsPerPage || config.maxResultsPerPage,
		collection = req.query.collection || null,
		showAll = req.query.showAll || [],
		expandFacets = req.query.expand || [],
		daterange = (req.query.from || req.query.to) && (parseInt(req.query.from) < parseInt(req.query.to)) ? {
			from: req.query.from || 0,
			to: req.query.to || new Date().getFullYear()
		} : null;

	var queryData = Helper.getSearchQueryDataObject(query, field, type, bool);
	Service.searchIndex(queryData, facets, collection, page, pageSize, daterange, function(error, response) {
		var data = {
			error: null,
			facets: {},
			facet_breadcrumb_trail: null,
			results: [],
			pageData: null,
			page: req.query.page || 1,
			root_url: config.rootUrl,
			collection_scope: "",
			query: Helper.getResultsLabel(req.query.q, facets),
			view: req.query.view || config.defaultSearchResultsView || "list",
			options: {}
		};

		if(error) {
			console.error(error);
			data.error = "An unexpected error has occurred.  Please contact systems support";
			return res.render('results', data);
		}
		else {

			var path = config.rootUrl + req.url.substring(req.url.indexOf('search')-1);

			data.options["expandFacets"] = expandFacets;
			data.options["perPageCountOptions"] = config.resultCountOptions;
			data.options["resultsViewOptions"] = config.resultsViewOptions;
			data.options["pageSize"] = pageSize;

			// Don't show the daterange limit option if there is a daterange parameter preent, or if there are no search results
			data.options["showDateRange"] = (daterange || response.count == 0) ? false : config.showDateRangeLimiter;

			Metadata.addResultMetadataDisplays(response.results);
			data.results = response.results;

			var facetList = Facets.getFacetList(response.facets, showAll);
			if(facets) {
				facets = Facets.getSearchFacetObject(facets);
			}

			Format.formatFacetDisplay(facetList, function(error, facetList) {
				Format.formatFacetBreadcrumbs(facets, function(error, facets) {
					data.facets = Facets.create(facetList, config.rootUrl, showAll, expandFacets);
					data.facet_breadcrumb_trail = Facets.getFacetBreadcrumbObject(facets, daterange, config.rootUrl); 
					data.pagination = Paginator.create(response.results, data.page, pageSize, response.count, path);
											
					return res.render('results', data);
				});
			});
		}
	});
}

exports.advancedSearch = function(req, res) {
	var data = {
		error: null,
		root_url: config.rootUrl,
		searchFields: config.advancedSearchFields,
		typeFields: config.searchTypes
	};
	return res.render('advanced-search', data);
}