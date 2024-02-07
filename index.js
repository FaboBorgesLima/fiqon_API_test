//@ts-check
const https = require("https");

/**
 * @param {{name:string,password:string}} User - user for Basic Authentication
 * @param {(token:string)=>any} handleToken - receives the API token when it's received
 * @param {(msg:string)=>any} handleDeniedAcess - handle the denied access message
 * @param {(er:Error)=>any} handleError - handle errors that might occur
 */
function getToken(User, handleToken, handleDeniedAcess, handleError) {
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

		APIResponse.on("close", () => {
			const parseBody = JSON.parse(body);

			if (parseBody.code == 200) {
				handleToken(parseBody.api_token);
				return;
			}

			handleDeniedAcess(parseBody.message);
		});

		APIResponse.on("error", (er) => {
			handleError(er);
		});
	});
	APIRequest.end();
}
