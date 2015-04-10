var factories = require("./lib/factories.js");
var Firebase = require("firebase");
var q = require("Q");

module.exports = function(s, firebaseUrl, firebaseSecret) {

	var schema = clone(s);

	var id_regex = /(id_)(([^_\s]*)_?(.+)?)/;
	var ids_regex = /(ids_)(([^_\s]*)_?(.+)?)/;

	function returnThirdArgument(){
		return arguments[2];
	}
	function returnForthArgument(){
		return arguments[3];
	}

	// VALIDATE SCHEMA
	// -- for each model check that the references are valid
	for (var k in schema) {
		schema[k].__ref__ = {};
		schema[k].__refs__ = {};
		schema[k].__items__ = {};

		for (var j in schema[k]) {
			// is id_
			var key;
			var error;
			if (id_regex.test(j)) {
				key = j.replace(id_regex, returnThirdArgument);
				ref = j.replace(id_regex, returnForthArgument);
				// check if the key exists
				if (schema[ref] === undefined) {
					error = k + " contains reference " + key + " which does not exist in schema";
					throw error;
				} else {
					schema[k].__ref__[key] = true;
				}
			} else if (ids_regex.test(j)) {
				key = j.replace(ids_regex, returnThirdArgument);
				ref = j.replace(ids_regex, returnForthArgument);
				// check if the key exists
				if (schema[ref] === undefined) {
					error = k + " contains reference " + key + " which does not exist in schema";
					throw error;
				} else {
					schema[k].__refs__[key] = true;
				}
			} else {
				key = j;
				if(!/__/.test(j)){
					schema[k].__items__[key] = true;
				}
			}
		}
	}

	var rootRef = new Firebase(firebaseUrl);

	var SchemaModel = {};

	for (var model in schema) {
		addModelToSchemaObject(model);
	}

	return SchemaModel;

	function addModelToSchemaObject(model) {

		var modelRef = rootRef.child(model);

		var doesExist = factories.doesExistFactory(modelRef, '*');
		var add = factories.writeValueToLocationFactory(modelRef, '*');
		var push = factories.pushValueToLocationFactory(modelRef);
		var update = factories.writeValueToLocationFactory(modelRef, '*');
		var setReference = factories.writeValueToLocationFactory(modelRef, '*/*');
		var addReference = factories.writeValueToLocationFactory(modelRef, '*/*/*');
		var removeReference = factories.removeValueAtLocationFactory(modelRef, '*/*/*');
		var retrieve = factories.getValueAtLocationFactory(modelRef, '*');

		// add base methods
		SchemaModel[model] = {
			'doesExist': function(id) {
				return doesExist(id);
			},
			'add': function(id, obj) {
				for (var item in obj) {
					if (schema[model].__items__[item] === undefined) {
						// return rejected promise with error
						return rejectedPromise({
							'message': model + ' does not contain ' + item
						});
					}
				}
				obj.id = id;
				obj.created = Firebase.ServerValue.TIMESTAMP;
				return add(obj, id);
			},
			'push': function(obj) {
				for (var item in obj) {
					if (schema[model].__items__[item] === undefined) {
						// return rejected promise with error
						return rejectedPromise({
							'message': model + ' does not contain ' + item
						});
					}
				}
				obj.created = Firebase.ServerValue.TIMESTAMP;
				return push(obj);
			},
			'update': function(id, obj) {
				for (var item in obj) {
					if (schema[model].__items__[item] === undefined) {
						// return rejected promise with error
						return rejectedPromise({
							'message': model + ' does not contain ' + item
						});
					}
				}
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return update(obj, id);
					}else{
						throw({'message': 'id does not exist in ' + model});
					}
				});
			},
			'setReference': function(id, referenceName, referenceValue) {
				var modelReference = referenceName.split('_')[0];
				// check if reference name is valid
				if(schema[model].__ref__[referenceName] === undefined){
					return rejectedPromise({'message': model + ' does not contain field: id_' + referenceName});
				}
				// check if modelReference exists
				if(schema[modelReference] === undefined){
					return rejectedPromise({'message': 'schema does not contain field model: ' + modelReference});
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return SchemaModel[modelReference].doesExist(referenceValue);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				})
				.then(function(exists){
					if(exists){
						return setReference(referenceValue, id, 'id_' + referenceName);
					}else{
						throw({'message': modelReference + ' does not contain id: ' + referenceValue});
					}
				})
				.then(function(obj){
					return referenceValue;
				});
			},
			'addReference': function(id, referenceName, referenceValue) {
				var modelReference = referenceName.split('_')[0];
				// check if reference name is valid
				if(schema[model].__refs__[referenceName] === undefined){
					return rejectedPromise({'message': model + ' does not contain field: ids_' + referenceName});
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return SchemaModel[modelReference].doesExist(referenceValue);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				})
				.then(function(exists){
					if(exists){
						return addReference(true, id, 'ids_' + referenceName, referenceValue);
					}else{
						throw({'message': modelReference + ' does not contain id: ' + referenceValue});
					}
				})
				.then(function(obj){
					return referenceValue;
				});
			},
			'removeReference': function(id, referenceName, referenceValue) {
				var modelReference = referenceName.split('_')[0];
				// check if reference name is valid
				if(schema[model].__refs__[referenceName] === undefined){
					return rejectedPromise({'message': model + ' does not contain field: ids_' + referenceName});
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return removeReference(id, 'ids_' + referenceName, referenceValue);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				});
			},
			'retrieve': function(id){
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return retrieve(id);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				});
			}
		};
	}

};
/*
C - add, push
R - retrieve
U - update
D - removeReference
*/

function rejectedPromise(error) {
	var deffered = q.defer();
	setTimeout(function() {
		deffered.reject(error);
	});
	return deffered.promise;
}

function clone(obj) {
	if (null === obj || "object" != typeof obj) return obj;
	var copy = obj.constructor();
	for (var attr in obj) {
		if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
	}
	return copy;
}