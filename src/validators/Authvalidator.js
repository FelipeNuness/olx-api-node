const { checkSchema } = require('express-validator');

module.exports = {
	signup: checkSchema({
		name: {
			trim: true,
			isLength: {
				options: { min: 2 },
			},
			errorMessage: 'Nome precissa ter mais de 2 caracteres',
		},
		email: {
			isEmail: true,
			normalizeEmail: true,
			errorMessage: 'E-mail invalido',
		},
		password: {
			isLength: {
				options: { min: 2 },
			},
			errorMessage: 'Senha presisa ter no minimo 2 caracteres',
		},
		state: {
			notEmpty: true,
			errorMessage: 'Estado não prenchido',
		},
	}),
	signin: checkSchema({
		email: {
			isEmail: true,
			normalizeEmail: true,
			errorMessage: 'E-mail invalido',
		},
		password: {
			isLength: {
				options: { min: 2 },
			},
		},
	}),
};
