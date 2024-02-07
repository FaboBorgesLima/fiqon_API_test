//@ts-check
const https = require('https');
const { Buffer } = require('node:buffer');

const User = { password: '', name: '' };

getToken({
	User: User,
	onReceiveToken: (token) => {
		getPillarsInOrder({
			token: token,
			from: 0,
			to: 5,
			onReceivePillarsInOrder: (pillars) => {
				sendPillars({
					token: token,
					pillars: pillars,
					onMessage: (msg) => {
						console.log(msg);
					},
					onDeniedAccess: (msg) => {
						console.log('sendPillars DeniedAccess:', msg);
					},
					onError: (er) => {
						console.error(er);
					},
				});
			},
			onDeniedAccess: (msg) => {
				console.log('getPillar DeniedAccess:', msg);
			},
			onError: (er) => {
				console.error(er);
			},
		});
	},
	onDeniedAccess: (msg) => {
		console.log('getToken DeniedAccess:', msg);
	},
	onError: (er) => {
		console.error(er);
	},
});

/**
 *
 * @param {object} param0
 * @param {string} param0.token - API token
 * @param {PillarT[]} param0.pillars - fiqon pillars
 * @param {(msg:string)=>any} param0.onMessage - receives msg
 * @param {((msg:string)=>any) } param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error)=>any) } param0.onError - handle errors that might occur
 */
function sendPillars({
	token,
	pillars,
	onMessage,
	onDeniedAccess = () => {},
	onError = () => {},
}) {
	const APIURL = new URL(
			'https://instance.fique.online/webhook/merge/88d8701e-a1d6-4fee-b15b-53e90dc1d126/envia_resposta/7b56940678e89802e02e1981a8657206d639f657d4c58efb8d8fb74814799d1c001ec121c6?api_token=' +
				token
		),
		base64EncondedPillars = Buffer.from(concatPillarsData(pillars)).toString(
			'base64'
		),
		postData = JSON.stringify({ answer: base64EncondedPillars }),
		/**@type {https.RequestOptions} */
		APIConfig = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'content-length': Buffer.byteLength(postData),
			},
		};

	const APIRequest = https.request(APIURL, APIConfig, (res) => {
		let data = '';

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			const parseBody = JSON.parse(data);

			if (!parseBody.hasOwnProperty('code')) {
				onMessage(parseBody.message);
				return;
			}

			onDeniedAccess(parseBody.message);
		});

		res.on('error', (er) => {
			onError(er);
		});
	});

	APIRequest.write(postData);

	APIRequest.end();
}

/**
 * @param {PillarT[]} pillars
 * @returns {string}
 */
function concatPillarsData(pillars) {
	let concatData = pillars[0].data ? pillars[0].data : '';

	for (let i = 1; i < pillars.length; i++)
		concatData += '' + (pillars[i].data ? pillars[i].data : '');

	return concatData;
}

/**
 * @typedef {object} PillarT
 * @prop {string?} data
 * @prop {"true"|"false"} more_itens
 * @prop {string} next_page
 */

/**
 * @param {Object} param0
 * @param {string} param0.token - api_token, can be obtained from getToken in onReceiveToken property
 * @param {number} param0.from - start pagination
 * @param {number} param0.to - end pagination
 * @param {(pillars:PillarT[])=>any} param0.onReceivePillarsInOrder - receives pillars from pages in range,if an error occurs or access is denied the page.data will be substituted by "missing page" and page.more items will be "true"
 * @param {((msg:string,page:number)=>any) | undefined} param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error,page:number)=>any) | undefined} param0.onError - handle errors that might occur
 */
function getPillarsInOrder({
	from,
	to,
	token,
	onReceivePillarsInOrder,
	onDeniedAccess = () => {},
	onError = () => {},
}) {
	const start = Math.min(from, to),
		end = Math.max(from, to),
		missingPillarData = 'missing page',
		neededPillars = end - start;

	/**@type {PillarT[]} */
	let pillars = new Array(end - start),
		settedPillars = 0;

	/**
	 *
	 * @param {number} index
	 * @param {PillarT} pillar
	 */
	function setPillar(
		index,
		pillar = {
			data: missingPillarData,
			more_itens: 'true',
			next_page: (index + 1).toString(),
		}
	) {
		// adding start of loop so index is aways right
		pillars[index - start] = pillar;
		settedPillars++;
		if (settedPillars >= neededPillars) onReceivePillarsInOrder(pillars);
	}

	for (let i = start; i < end; i++) {
		getPillar({
			token: token,
			page: i,
			onReceivePillar: (pillar) => {
				setPillar(i, pillar);
			},
			onDeniedAccess: (msg) => {
				setPillar(i);

				if (!onDeniedAccess) return;

				onDeniedAccess(msg, i);
			},
			onError: (er) => {
				setPillar(i);

				if (!onError) return;

				onError(er, i);
			},
		});
	}
}

/**
 *
 * @param {Object} param0
 * @param {string} param0.token - api_token, can be obtained from getToken in onReceiveToken property
 * @param {number} param0.page
 * @param {(pillar:PillarT)=>any} param0.onReceivePillar - receives API pillar
 * @param {((msg:string)=>any) } param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error)=>any) }param0.onError - handle errors that might occur
 */
function getPillar({
	token,
	page,
	onReceivePillar,
	onDeniedAccess = () => {},
	onError = () => {},
}) {
	const APIRequest = https.get(
		`https://instance.fique.online/webhook/merge/88d8701e-a1d6-4fee-b15b-53e90dc1d126/listar_pilares/76b07f1dbf18eabde7b8e3611ab078daa0f34b094cc9856d20d6d0b15fb3b7a99f697e451d?api_token=${token}&page=${page}`,
		(res) => {
			let body = '';
			res.on('data', (chunk) => {
				body += chunk;
			});

			res.on('end', () => {
				const parseBody = JSON.parse(body);

				if (parseBody.hasOwnProperty('data')) {
					onReceivePillar(parseBody);

					return;
				}

				onDeniedAccess(parseBody.message);
			});

			res.on('error', (er) => {
				onError(er);
			});
		}
	);

	APIRequest.end();
}

/**
 * @param {Object} param0
 * @param {{name:string,password:string}} param0.User - user for Basic Authentication
 * @param {(token:string)=>any} param0.onReceiveToken - receives the API token when it's received
 * @param {((msg:string)=>any) } param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error)=>any) }param0.onError - handle errors that might occur
 */
function getToken({
	User,
	onReceiveToken,
	onDeniedAccess = () => {},
	onError = () => {},
}) {
	const APIURL = new URL(
			'https://instance.fique.online/webhook/merge/88d8701e-a1d6-4fee-b15b-53e90dc1d126/autenticacao/57441afd5a59ccd4c62816683fcc8d665c42bb7b12857fc64a6cace4ababdc67f78c70b044'
		),
		APIConfig = {
			hostname: APIURL.hostname,
			path: APIURL.pathname,
			port: 443,
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${User.name}:${User.password}`
				).toString('base64')}`,
			},
		};

	const APIRequest = https.request(APIConfig, (APIResponse) => {
		let body = '';

		APIResponse.on('data', (chunk) => {
			body += chunk;
		});

		APIResponse.on('end', () => {
			const parseBody = JSON.parse(body);

			if (parseBody.code == 200) {
				onReceiveToken(parseBody.api_token);
				return;
			}

			onDeniedAccess(parseBody.message);
		});

		APIResponse.on('error', (er) => {
			onError(er);
		});
	});
	APIRequest.end();
}
