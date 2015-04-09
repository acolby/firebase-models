var Q = require('q');

function createRefFromRefReferenceString(baseRef, referenceString, values){
	// reference string has the form /location1/*/location/*, where the *'s refer to the locations that will be accesses

	// example createRefFromRefReferenceString(ref, 'location/*/location/*', ['bob', 'frog']);

	// figure out the number of arguments and make sure there are a proper number of arguments

	if(referenceString === undefined){
		return baseRef;
	}

	var referenceStringArray = referenceString.split('/');
	
	var valuesIndex = 0;

	var compiledReferenceString = '';
	for(var i = 0; i < referenceStringArray.length; i ++){
		var stringToAddToRef = '';

		if(referenceStringArray[i] === '*'){
			stringToAddToRef = values[valuesIndex];
			valuesIndex++;
		}else{
			stringToAddToRef = referenceStringArray[i];
		}

		compiledReferenceString += stringToAddToRef;

		if((i + 1) < referenceStringArray.length){
			compiledReferenceString += '/';
		}
	}
	return baseRef.child(compiledReferenceString);

}

module.exports = {

	doesExistFactory: function(baseRef, referenceString) {
		var doesExistFunction = function(id) {
			var deffered = Q.defer();

			var values = Array.prototype.slice.call(arguments);
			var newRef = createRefFromRefReferenceString(baseRef, referenceString, values);

			newRef.once('value', function(snapshot) {
				var value = snapshot.val();
				if (value === null) {
					deffered.resolve(false);
				} else {
					deffered.resolve(true);
				}
			}, function(error) {
				deffered.reject({"message": "DATABASE_READ_ERROR"});
			});
			return deffered.promise;
		};
		return doesExistFunction;
	},

	getValueAtLocationFactory: function(baseRef, referenceString, err) {
		var getValueAtLocationFunciton = function(element) {
			var deffered = Q.defer();
			var values = Array.prototype.slice.call(arguments);
			var newRef = createRefFromRefReferenceString(baseRef, referenceString, values);
			newRef.once('value', function(snapshot) {
				var value = snapshot.val();
				if (value === null) {
					deffered.reject(err);
				} else {
					deffered.resolve(value);
				}
			});
			return deffered.promise;
		};
		return getValueAtLocationFunciton;
	},

	pushValueToLocationFactory: function(baseRef, referenceString) {
		var pushValueToLocationFunction = function(value) {
			var deffered = Q.defer();

			// convert arguments to array
			var values = Array.prototype.slice.call(arguments);
			values.shift();
			var newRef = createRefFromRefReferenceString(baseRef, referenceString, values);

			// subitem is used to dig deeper for optimization
			var pushRef = newRef.push(value, function(err) {
				if (err) {
					deffered.reject({"message": "DATABASE_WRITE_ERROR"});
				} else {
					
					// add the id to the pushed object
					pushRef.update({
						'id': pushRef.key()
					}, function(err){
						if(err){
							deffered.reject({"message": "DATABASE_WRITE_ERROR"});
						}else{
							deffered.resolve(pushRef.key());
						}
					});

				}
			});
			return deffered.promise;
		};
		return pushValueToLocationFunction;
	},

	writeValueToLocationFactory: function(baseRef, referenceString) {
		var writeValueToLocationFunction = function(value) {
			var deffered = Q.defer();

			// convert arguments to array
			var values = Array.prototype.slice.call(arguments);
			values.shift();

			var newRef = createRefFromRefReferenceString(baseRef, referenceString, values);

			if(typeof value === 'boolean' || typeof value === 'string'){

				// subitem is used to dig deeper for optimization
				newRef.set(value, function(err) {
					if (err) {
						deffered.reject({"message": "DATABASE_WRITE_ERROR"});
					} else {
						deffered.resolve({});
					}
				});

			}else{

				// subitem is used to dig deeper for optimization
				newRef.update(value, function(err) {
					if (err) {
						deffered.reject({"message": "DATABASE_WRITE_ERROR"});
					} else {
						deffered.resolve({});
					}
				});
				
			}

			
			return deffered.promise;
		};
		return writeValueToLocationFunction;
	},

	removeValueAtLocationFactory: function(baseRef, referenceString) {
		var removeValueAtLocationFunction = function() {
			var deffered = Q.defer();
			var values = Array.prototype.slice.call(arguments);
			var newRef = createRefFromRefReferenceString(baseRef, referenceString, values);
			// subitem is used to dig deeper for optimization
			newRef.remove(function(err) {
				if (err) {
					deffered.reject({"message": "DATABASE_WRITE_ERROR"});
				} else {
					deffered.resolve({});
				}
			});
			return deffered.promise;
		};
		return removeValueAtLocationFunction;
	}

};