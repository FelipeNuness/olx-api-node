const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { validationResult, matchedData } = require('express-validator');

const User = require('../models/User');
const State = require('../models/State');

module.exports = {
	async signin(req, res) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.json({ error: errors.mapped() });
		}
		const data = matchedData(req);
		// validandi o E-mail

		const user = await User.findOne({ email: data.email });
		if (!user) {
			res.json({ error: { email: { msg: 'E-mail e/ou senha errados' } } });
		}

		// validar a senha
		const match = await bcrypt.compare(data.password, user.passwordHash);
		if (!match) {
			res.json({ error: { email: { msg: 'E-mail e/ou senha errados' } } });
		}
		// token (dps mudar pra JWT)

		const payload = (Date.now() + Math.random()).toString();
		const token = await bcrypt.hash(payload, 10);
		user.token = token;
		await user.save();

		res.json({ token, email: data.email });
	},

	async signup(req, res) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.json({ error: errors.mapped() });
		}
		const data = matchedData(req);

		// Verificando E-mail

		const user = await User.findOne({ email: data.email });
		if (user) {
			res.json({ error: { email: { msg: 'E-mail Já existente' } } });
		}

		// Verificando state

		if (mongoose.Types.ObjectId.isValid(data.state)) {
			const stateItem = await State.findById(data.state);
			if (!stateItem) {
				res.json({ error: { state: { msg: 'Estado não existente' } } });
			}
		} else {
			res.json({ error: { state: { msg: 'Código de estado invalido' } } });
		}

		// encriptando a senha

		const passwordHash = await bcrypt.hash(data.password, 10);

		// token (dps mudar pra JWT)

		const payload = (Date.now() + Math.random()).toString();
		const token = await bcrypt.hash(payload, 10);

		await User.create({
			name: data.name,
			email: data.email,
			passwordHash,
			token,
			state: data.state,
		});

		res.json({ token });
	},
};
