var testSchema = require('./testSchema.json');
var firebaseModels = require('../');
var Firebase = require('Firebase');

var testURL = "https://tttests.firebaseio.com/";
var testFirebaseSecret = "cI2lwD7QVtvRLTn8gGuBGawbKHdN0NYTHQg3rgYv";
var rootRef = new Firebase(testURL);

test = {};

test.setTestDb = {
	'set': function(test){
		rootRef.set({}, function(err){
			if(!err){
				test.done();
			}else{
				throw new Error('error pushing test db');
			}
		});
	}
};

test.schemaValidation = {
	'bad reference id_': function(test){
		try{
			console.log('ersadfasdfasdf');
			firebaseModels({
				"users": {
					"id_people": ""
				}
			});
			FAILTEST(test, 'should not be here');
		} catch(err){
			test.done();
		}
	},
	'bad reference ids_': function(test){
		try{
			firebaseModels({
				"users": {
					"ids_people": ""
				}
			});
			FAILTEST(test, 'should not be here');
		} catch(err){
			test.done();
		}
	},
	'validSchema': function(test){
		try{
			firebaseModels(testSchema, testURL, testFirebaseSecret);
			test.done();
		} catch(err){
			console.log(err);
			FAILTEST(test, 'should not be here');	
		}
	},
};

var SchemaModel = firebaseModels(testSchema, testURL, testFirebaseSecret);

var addedUserId = null;
var addedTeamId = null;
var addedEmailsId = null;
test.push = {
	'success': function(test){
		var user = {
			'name': 'bob'
		};
		SchemaModel.users.push(user)
		.then(function(successObj){
			addedUserId = successObj;
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'invalid': function(test){
		var user = {
			'emailAddressss': 'bob'
		};
		SchemaModel.users.push(user)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	},
	'add team': function(test){
		var user = {
			'name': 'teamname'
		};
		SchemaModel.teams.push(user)
		.then(function(successObj){
			addedTeamId = successObj;
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'add email': function(test){
		var email = {
			'email': 'teamname'
		};
		SchemaModel.emails.push(email)
		.then(function(successObj){
			addedEmailsId = successObj;
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	}
};

test.add = {
	'success': function(test){
		var user = {
			'name': 'bob'
		};
		SchemaModel.users.add('idetoadddude', user)
		.then(function(successObj){
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'invalid': function(test){
		var user = {
			'emailAddressss': 'bob'
		};
		SchemaModel.users.add('shouldnotseethis', user)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	}
};

test.doesExist = {
	'yes it does': function(test){
		SchemaModel.users.doesExist(addedUserId)
		.then(function(successObj){
			test.equal(successObj, true);
			test.done();
		}).catch(function(error){
			FAILTEST(test, 'should not reject');
		});
	},
	'no it does not': function(test){
		SchemaModel.users.doesExist('bullishId')
		.then(function(successObj){
			test.equal(successObj, false);
			test.done();
		}).catch(function(error){
			FAILTEST(test, 'should not reject');
		});
	}
};

test.update = {
	'success': function(test){
		var user = {
			'name': 'frank'
		};
		SchemaModel.users.update('idetoadddude', user)
		.then(function(successObj){
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'invalid': function(test){
		var user = {
			'emailAddressss': 'bob'
		};
		SchemaModel.users.update('shouldnotseethis', user)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	},
	'does not exist': function(test){
		var user = {
			'name': 'jane'
		};
		SchemaModel.users.update('shouldnotseethis', user)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	}
};

test.retrieve = {
	'success': function(test){
		SchemaModel.users.retrieve(addedUserId)
		.then(function(successObj){
			test.equal(successObj.id, addedUserId);
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'invalid reference': function(test){
		SchemaModel.users.retrieve('shouldnotseethis')
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	}
};

test.setReference = {
	'success': function(test){
		SchemaModel.users.setReference(addedUserId, 'emails', addedEmailsId)
		.then(function(successObj){
			test.equal(addedEmailsId, successObj);
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'success with sublable': function(test){
		SchemaModel.users.setReference(addedUserId, 'emails_primary', addedEmailsId)
		.then(function(successObj){
			test.equal(addedEmailsId, successObj);
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'secondary referecne does not exist': function(test){
		SchemaModel.users.setReference(addedUserId, 'emails', 'asdfasdfasdfa fasdf')
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	},
	'primary index does not exiset': function(test){
		SchemaModel.users.setReference('asdfasdfasdfasdf', 'emails', addedEmailsId)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	}
};

test.addReference = {
	'success': function(test){
		SchemaModel.users.addReference(addedUserId, 'teams', addedTeamId)
		.then(function(successObj){
			test.equal(addedTeamId, successObj);
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'success adding secondary ref': function(test){
		SchemaModel.teams.addReference(addedTeamId, 'users_members', addedUserId)
		.then(function(successObj){
			test.equal(addedUserId, successObj);
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'secondary referecne does not exist': function(test){
		SchemaModel.users.addReference(addedUserId, 'teams', 'asdfasdfasdfa fasdf')
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	},
	'primary index does not exiset': function(test){
		SchemaModel.users.addReference('asdfasdfasdfasdf', 'teams', addedEmailsId)
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	}
};

test.removeReference = {
	'primary index does not exist': function(test){
		SchemaModel.users.removeReference('asdfasdfasdf', 'teams', 'asdfasdfasdfa fasdf')
		.then(function(successObj){
			FAILTEST(test, 'should not resolve');
		}).catch(function(error){
			test.done();
		});
	},
	'success': function(test){
		SchemaModel.users.removeReference(addedUserId, 'teams', addedTeamId)
		.then(function(successObj){
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
	'success with sub reference': function(test){
		SchemaModel.teams.removeReference(addedTeamId, 'users_members', addedUserId)
		.then(function(successObj){
			test.done();
		}).catch(function(error){
			console.log(error);
			FAILTEST(test, 'should not reject');
		});
	},
};

//run last test
test.lastTest = function(test){
    //do_clear_all_things_if_needed();
    setTimeout(process.exit, 500); // exit in 500 milli-seconds    
    test.done();
} ;

function FAILTEST(test, message){
	if(message){
		console.log(message);
	}
	test.equal(true, false);
	test.done();
}

module.exports = test;