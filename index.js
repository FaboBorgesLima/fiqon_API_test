//@ts-check
const https = require("https");
const { Buffer } = require("node:buffer");

const User = { password: "", name: "" };

getToken({
	User: User,
	onReceiveToken: (token) => {
		getPillar({
			token: token,
			page: -2,
			onReceivePillar: (pilar) => {
				console.log(pilar);
			},
			onDeniedAccess: (msg) => {
				console.log("getPillar DeniedAccess:", msg);
			},
			onError: (er) => {
				console.error(er);
			},
		});
	},
	onDeniedAccess: (msg) => {
		console.log("getToken DeniedAccess:", msg);
	},
	onError: (er) => {
		console.error(er);
	},
});

/**
 *
 * @param {Object} param0
 * @param {string} param0.token - api_token, can be obtained from getToken in onReceiveToken property
 * @param {number} param0.page
 * @param {(pilar:{data?:string,more_itens:"true"|"false",next_page:string})=>any} param0.onReceivePillar - receives API pillar
 * @param {((msg:string)=>any) | undefined} param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error)=>any) | undefined}param0.onError - handle errors that might occur
 */
function getPillar({ token, page, onReceivePillar, onDeniedAccess, onError }) {
	const APIRequest = https.get(
		`https://instance.fique.online/webhook/merge/88d8701e-a1d6-4fee-b15b-53e90dc1d126/listar_pilares/76b07f1dbf18eabde7b8e3611ab078daa0f34b094cc9856d20d6d0b15fb3b7a99f697e451d?api_token=${token}&page=${page}`,
		(res) => {
			let body = "";
			res.on("data", (chunk) => {
				body += chunk;
			});

			res.on("end", () => {
				const parseBody = JSON.parse(body);

				if (parseBody.hasOwnProperty("data")) {
					onReceivePillar(parseBody);

					return;
				}

				if (!onDeniedAccess) return;

				onDeniedAccess(parseBody.message);
			});

			res.on("error", (er) => {
				if (!onError) return;

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
 * @param {((msg:string)=>any) | undefined} param0.onDeniedAccess - handle the denied access message
 * @param {((er:Error)=>any) | undefined}param0.onError - handle errors that might occur
 */
function getToken({ User, onReceiveToken, onDeniedAccess, onError }) {
	const APIURL = new URL(
			"https://instance.fique.online/webhook/merge/88d8701e-a1d6-4fee-b15b-53e90dc1d126/autenticacao/57441afd5a59ccd4c62816683fcc8d665c42bb7b12857fc64a6cace4ababdc67f78c70b044"
		),
		APIConfig = {
			hostname: APIURL.hostname,
			path: APIURL.pathname,
			port: 443,
			method: "POST",
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${User.name}:${User.password}`
				).toString("base64")}`,
			},
		};

	const APIRequest = https.request(APIConfig, (APIResponse) => {
		let body = "";

		APIResponse.on("data", (chunk) => {
			body += chunk;
		});

		APIResponse.on("end", () => {
			const parseBody = JSON.parse(body);

			if (parseBody.code == 200) {
				onReceiveToken(parseBody.api_token);
				return;
			}

			if (!onDeniedAccess) return;

			onDeniedAccess(parseBody.message);
		});

		APIResponse.on("error", (er) => {
			if (!onError) return;
			onError(er);
		});
	});
	APIRequest.end();
}
