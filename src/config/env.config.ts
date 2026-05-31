
//

const imageSize = (value: string | undefined) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 256
}

//

const env = {
	port: Number(process.env.PORT),
	host: process.env.HOST || "",
	protocol: process.env.PROTOCOL || "",
	apikey: process.env.API_KEY || "",
	egg: { imgsz: imageSize(process.env.EGG_IMGSZ) },
	feed: { imgsz: imageSize(process.env.FEED_IMGSZ) },
}

//

export default env
