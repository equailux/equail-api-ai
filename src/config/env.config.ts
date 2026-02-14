
//

const env = {
	port: Number(process.env.PORT),
	host: process.env.HOST || "",
	protocol: process.env.PROTOCOL || "",
	apikey: process.env.API_KEY || "",
	egg: { size: Number(process.env.EGG_SIZE) },
}

//

export default env
