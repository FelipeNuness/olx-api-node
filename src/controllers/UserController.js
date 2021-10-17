const { validationResult, matchedData } = require('express-validator');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const State = require('../models/State');
const User = require('../models/User');
const Category = require('../models/Category');
const Ad = require('../models/Ad');

module.exports = {
	async getStates(req, res) {
		const stats = await State.find();
		res.json({ stats });
	},
	async info(req, res) {
		const token = req.query.token;
		const user = await User.findOne({ token });
		const state = await State.findById(user.state);
		const ads = await Ad.find({ idUser: user._id.toString() });

		const adList = [];

		for (let i in ads) {
			const cat = await Category.findById(ads[i].category);

			adList.push({ ...ads[i], category: cat.slug });
		}

		res.json({
			name: user.name,
			email: user.email,
			state: state.name,
			ads: adList,
		});
	},
	async editAction(req, res) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.json({ error: errors.mapped() });
		}
		const data = matchedData(req);

		const updates = {};

		if (data.name) {
			updates.name = data.name;
		}

		if (data.email) {
			const emailCheck = await User.findOne({ email: data.email });
			if (emailCheck) {
				res.json({ error: 'Email já existente' });
			}
			updates.email = data.email;
		}

		if (data.state) {
			if (mongoose.Types.ObjectId.isValid(data.state)) {
				const stateCheck = await State.findById(data.state);
				if (!stateCheck) {
					res.json({ error: 'Estado não existente' });
				}
				updates.state = data.state;
			} else {
				res.json({ error: 'Código de estado invalido' });
			}
		}

		if (data.password) {
			updates.passwordHash = await bcrypt.hash(data.password, 10);
		}

		await User.findOneAndUpdate({ token: data.token }, { $set: updates });
		res.json({});
	},
};
