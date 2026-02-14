
//

const env = {
	port: Number(process.env.PORT),
	host: process.env.HOST || "",
	protocol: process.env.PROTOCOL || "",
	apikey: process.env.API_KEY || "",
	egg: { imgsz: Number(process.env.EGG_IMGSZ) },
}

//

export default env
