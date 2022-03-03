module.exports = {
	// PIMACO 6187
	pimaco_6187: {
		cols: [5.5, 58.0, 107.5, 157.0],
		rows: [
			12.7, 26.4, 39.6, 52.8, 66.0, 79.2, 93.57, 106.93, 120.3, 133.67,
			146.17, 159.46, 172.75, 186.04, 199.32, 212.61, 225.9, 239.19, 252.48,
			265.76,
		],
		maxTagsInPage: 80,
		tagSize: {
			width: 44.4,
			height: 12.7,
			align: 'center',
		},
		paperSize: [215.9, 279.4],
		paperMargins: {
			top: 12.7,
			bottom: 12.7,
			left: 14.5,
			right: 14.5,
		},
	},

	// PIMACO 680 - Ivan
	pimaco_6080: {
		cols: [13.6, 211.46, 409.32],
		//rows: [6, 78, 150, 222, 294, 366, 438, 510, 582, 654],
		rows: [36, 108, 180, 252, 324, 396, 468, 540, 612, 684],
		maxTagsInPage: 30,
		tagSize: {
			width: 189.07,
			height: 72.0,
			align: 'left',
		},
		paperSize: [612.0, 792.0],
		paperMargins: {
			top: 36,
			bottom: 36,
			left: 13.6,
			right: 13.6,
		},
	},

	// PIMACO 680 - Ivan
	/*pimaco_6080: {
		cols: [13.6, 211.46, 409.32],
		rows: [36, 108, 180, 252, 324, 396, 468, 540, 612, 684],
		maxTagsInPage: 30,
		tagSize: {
			width: 189.07,
			height: 72.0,
			align: 'left',
		},
		paperSize: [612.0, 792.0],
		paperMargins: {
			top: 36,
			bottom: 36,
			left: 13.6,
			right: 13.6,
		},
	},*/

	// PIMACO 6180
	pimaco_6180: {
		cols: [4.8, 74.6, 144.4],
		rows: [12.7, 38.1, 63.5, 88.9, 114.3, 139.7, 165.1, 190.5, 215.9, 241.3],
		maxTagsInPage: 30,
		tagSize: {
			width: 66.7,
			height: 25.4,
			align: 'left',
		},
		paperSize: [215.9, 279.4],
		paperMargins: {
			top: 12.7,
			bottom: 12.7,
			left: 4.8,
			right: 4.8,
		},
	},
	// PIMACO 6081
	pimaco_6081: {
		cols: [4, 110],
		rows: [
			12.7, 38.1, 63.5, 88.9, 114.3, 139.7, 165.1, 190.5, 215.9, 241.3,
			266.7,
		],
		maxTagsInPage: 20,
		tagSize: {
			width: 101.6,
			height: 25.4,
			align: 'center',
		},
		paperSize: [215.9, 279.4],
		paperMargins: {
			top: 12.7,
			bottom: 12.7,
			left: 4,
			right: 4,
		},
	},
	// PIMACO A4355
	pimaco_a4355: {
		cols: [7.2, 74, 141],
		rows: [9, 40, 71, 102, 133, 164, 195, 226, 257],
		maxTagsInPage: 27,
		tagSize: {
			width: 63.5,
			height: 31,
			align: 'center',
		},
		paperSize: [210.0, 297.0],
		paperMargins: {
			top: 9,
			bottom: 0,
			left: 7.2,
			right: 0,
		},
	},
}
