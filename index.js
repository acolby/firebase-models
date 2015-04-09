var factories = require("./lib/factories.js");
var Firebase = require("firebase");
var q = require("Q");

module.exports = function(s, firebaseUrl, firebaseSecret) {

	var schema = clone(s);

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
			if (/id_/.test(j)) {
				key = j.substring(3, j.length);
				// check if the key exists
				if (schema[key] === undefined) {
					error = k + " contains reference " + key + " which does not exist in schema";
					throw error;
				} else {
					schema[k].__ref__[key] = true;
				}
			} else if (/ids_/.test(j)) {
				key = j.substring(4, j.length);
				// check if the key exists
				if (schema[key] === undefined) {
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
		var addReference = factories.pushValueToLocationFactory(modelRef, '*/*/*');
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
				for (var item in schema[model].__ref__) {
					var hasRef = false;
					if (item === referenceName) {
						hasRef = true;
					}
					if(!hasRef){
						return rejectedPromise({'message': model + ' does not contain field: id_' + referenceName});
					}
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return SchemaModel[referenceName].doesExist(referenceValue);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				})
				.then(function(exists){
					if(exists){
						referenceName = 'id_' + referenceName;
						return setReference(referenceValue, id, referenceName);
					}else{
						throw({'message': referenceName + ' does not contain id: ' + referenceValue});
					}
				})
				.then(function(obj){
					return referenceValue;
				});
			},
			'addReference': function(id, referenceName, referenceValue) {
				for (var item in schema[model].__refs__) {
					var hasRef = false;
					if (item === referenceName) {
						hasRef = true;
					}
					if(!hasRef){
						return rejectedPromise({'message': model + ' does not contain field: ids_' + referenceName});
					}
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					if(exists){
						return SchemaModel[referenceName].doesExist(referenceValue);
					}else{
						throw({'message': model + ' does not contain id: ' + id});
					}
				})
				.then(function(exists){
					referenceName = 'ids_' + referenceName;
					if(exists){
						referenceName = 'ids_' + referenceName;
						return addReference(true, id, referenceName, referenceValue);
					}else{
						throw({'message': referenceName + ' does not contain id: ' + referenceValue});
					}
				})
				.then(function(obj){
					return referenceValue;
				});
			},
			'removeReference': function(id, referenceName, referenceValue) {
				for (var item in schema[model].__refs__) {
					var hasRef = false;
					if (item === referenceName) {
						hasRef = true;
					}
					if(!hasRef){
						return rejectedPromise({'message': model + ' does not contain field: ids_' + referenceName});
					}
				}
				// check if the reference exists in model reference name
				return this.doesExist(id)
				.then(function(exists){
					referenceName = 'ids_' + referenceName;
					if(exists){
						referenceName = 'ids_' + referenceName;
						return removeReference(id, referenceName, referenceValue);
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