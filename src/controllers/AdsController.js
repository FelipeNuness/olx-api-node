const { v4: uuId } = require('uuid');
const jimp = require('jimp');

const Category = require('../models/Category');
const User = require('../models/User');
const Ad = require('../models/Ad');
const State = require('../models/State');
require('dotenv').config();

async function addImage(buffer) {
	const newName = `${uuId()}.jpg`;
	const tmpImage = await jimp.read(buffer);
	tmpImage.cover(500, 500).quality(80).write(`./public/media/${newName}`);
	return newName;
}

module.exports = {
	async getCategories(req, res) {
		const cats = await Category.find();

		const categories = [];

		for (const i in cats) {
			categories.push({
				...cats[i]._doc,
				img: `${process.env.BASE}/assets/images/${cats[i].slug}.png`,
			});
		}

		res.json({ categories });
	},
	addAction: async (req, res) => {
		let { title, price, priceneg, desc, cat, token } = req.body;
		const user = await User.findOne({ token }).exec();

		if (!title || !cat) {
			res.json({ error: 'Titulo e/ou categoria não foram preenchidos' });
			return;
		}

		if (cat.length < 12) {
			res.json({ error: 'ID de categoria inválido' });
			return;
		}

		const category = await Category.findById(cat);
		if (!category) {
			res.json({ error: 'Categoria inexistente' });
			return;
		}

		if (price) {
			// R$ 8.000,35 = 8000.35
			price = price.replace('.', '').replace(',', '.').replace('R$ ', '');
			price = parseFloat(price);
		} else {
			price = 0;
		}

		const newAd = new Ad();
		newAd.status = true;
		newAd.idUser = user._id;
		newAd.state = user.state;
		newAd.dateCreated = new Date();
		newAd.title = title;
		newAd.category = cat;
		newAd.price = price;
		newAd.priceNegotiable = priceneg == 'true' ? true : false;
		newAd.description = desc;
		newAd.views = 0;

		if (req.files && req.files.img) {
			if (req.files.img.length == undefined) {
				if (
					['image/jpeg', 'image/jpg', 'image/png'].includes(
						req.files.img.mimetype,
					)
				) {
					let url = await addImage(req.files.img.data);
					newAd.images.push({
						url,
						default: false,
					});
				}
			} else {
				for (let i = 0; i < req.files.img.length; i++) {
					if (
						['image/jpeg', 'image/jpg', 'image/png'].includes(
							req.files.img[i].mimetype,
						)
					) {
						let url = await addImage(req.files.img[i].data);
						newAd.images.push({
							url,
							default: false,
						});
					}
				}
			}
		}

		if (newAd.images.length > 0) {
			newAd.images[0].default = true;
		}

		const info = await newAd.save();
		res.json({ id: info._id });
	},
	async getList(req, res) {
		const { sort = 'asc', offset = 0, limit = 8, q, cat, state } = req.query;
		let total = 0;

		const filters = { status: true };

		if (q) {
			filters.title = { $regex: q, $options: 'i' };
		}

		if (cat) {
			const c = await Category.findOne({ slug: cat }).exec();
			if (c) {
				filters.category = c._id.toString();
			}
		}
		if (state) {
			const s = await State.findOne({ name: state.toUpperCase() }).exec();
			if (s) {
				filters.state = s._id.toString();
			}
		}

		const adsTotal = await Ad.find(filters).exec();
		total = adsTotal.length;

		const adsData = await Ad.find(filters)
			.sort({ dateCreated: sort == 'asc' ? 1 : -1 })
			.skip(parseInt(offset))
			.limit(parseInt(limit))
			.exec();
		const ads = [];

		for (const i in adsData) {
			let image;
			const defaultImg = adsData[i].images.find((e) => e.default);
			if (defaultImg) {
				image = `${process.env.BASE}/media/${defaultImg.url}`;
			} else {
				image = `${process.env.BASE}/media/default.jpg`;
			}

			ads.push({
				id: adsData[i]._id,
				title: adsData[i].title,
				price: adsData[i].price,
				priceNegotiable: adsData[i].priceNegotiable,
				image,
			});
		}
		res.json({ ads, total });
	},
	async getItem(req, res) {
		const { id, other = null } = req.query;
		if (!id) {
			res.json({ error: 'Sem Produto' });
		}

		if (id.length < 12) {
			res.json({ error: 'ID inválido' });
		}

		const ad = await Ad.findById(id);
		if (!ad) {
			res.json({ error: 'Produto inexistente' });
		}

		ad.views++;
		await ad.save();

		const images = [];

		for (const i in ad.images) {
			images.push(`${process.env.BASE}/media/${ad.images[i].url}`);
		}
		const category = await Category.findById(ad.category).exec();
		const userInfo = await User.findById(ad.idUser).exec();
		const stateInfo = await State.findById(ad.state).exec();

		const others = [];
		if (other) {
			const otherData = await Ad.find({
				status: true,
				idUser: ad.idUser,
			}).exec();

			for (const i in otherData) {
				if (otherData[i]._id.toString() != ad._id.toString()) {
					let image = `${process.env.BASE}/media/default.jpg`;

					const defaultImg = otherData[i].images.find((e) => e.default);
					if (defaultImg) {
						image = `${process.env.BASE}/meida/${defaultImg.url}`;
					}
					others.push({
						id: otherData[i]._id,
						title: otherData[i].title,
						price: otherData[i].price,
						priceNegotiable: otherData[i].priceNegotiable,
						image,
					});
				}
			}
		}
		res.json({
			id: ad._id,
			title: ad.title,
			price: ad.price,
			priceNegotiable: ad.priceNegotiable,
			views: ad.views,
			images,
			category,
			userInfo: {
				name: userInfo.name,
				email: userInfo.email,
			},
			stateName: stateInfo.name,
			others,
		});
	},

	async editAction(req, res) {
		const { id } = req.params;
		const { title, status, price, priceneg, desc, cat, images, token } =
			req.body;

		if (id.length < 12) {
			res.json({ error: 'ID inválido' });
		}

		const ad = await Ad.findById(id).exec();
		const user = await User.findOne({ token }).exec();

		if (!ad) {
			res.json({ error: 'Anúncio inexistente' });
		}

		if (user._id.toString() != ad.idUser) {
			res.json({ error: 'Voçê não tem permição de alterar esse anúncio' });
		}

		const updates = {};
		if (title) {
			updates.title = title;
		}
		if (price) {
			price = price.replace('.', '').replace(',', '.').replace('R$', '');
			price = parseFloat(price);
			updates.price = price;
		}
		if (priceneg) {
			updates.priceNegotiable = priceneg;
		}
		if (status) {
			updates.status = status;
		}
		if (desc) {
			updates.description = desc;
		}
		if (cat) {
			const category = await Category.findOne({ slug: cat });
			if (!category) {
				res.json({ error: 'Categoria inexistente' });
			}
			updates.category = category._id.toString();
		}
		if (images) {
			updates.images = images;
		}
		// novas images

		await Ad.findByIdAndUpdate(id, { $set: updates });

		if (req.files && req.files.img) {
			const adI = await Ad.findById(id);

			if (req.files.img.length == undefined) {
				if (
					['image/jpeg', 'image/jpg', 'image/png'].includes(
						req.files.img.mimetype,
					)
				) {
					let url = await addImage(req.files.img.data);
					adI.images.push({
						url,
						default: false,
					});
				}
			} else {
				for (let i = 0; i < req.files.img.length; i++) {
					if (
						['image/jpeg', 'image/jpg', 'image/png'].includes(
							req.files.img[i].mimetype,
						)
					) {
						let url = await addImage(req.files.img[i].data);
						adI.images.push({
							url,
							default: false,
						});
					}
				}
			}

			adI.images = [...adI.images];
			await adI.save();
		}

		res.json({});
	},
};
