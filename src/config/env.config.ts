
//

const env = {
	port: Number(process.env.PORT),
	host: process.env.HOST || "",
	protocol: process.env.PROTOCOL || "",
	apikey: process.env.API_KEY || "",
}

//

export default env
