const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const modelSchema = new mongoose.Schema({
	name: String,
	slug: String,
});

const modelName = 'Category';

if (mongoose.connection && mongoose.models[modelName]) {
	module.exports = mongoose.models[modelName];
} else {
	module.exports = mongoose.model(modelName, modelSchema);
}
