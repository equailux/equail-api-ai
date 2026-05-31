import env from "@/config/env.config.js"
import feedModule from "@/modules/feed.module.js"

//

const boot = async () => {
    let timer = Date.now()
    await feedModule.load(env.feed.imgsz)
    console.info(`[Boot.Feed]: Feed detection model loaded in ${Date.now() - timer}ms.`)

    timer = Date.now()
    await feedModule.warmup()
    console.info(`[Boot.Feed]: Feed detection model warmed-up in ${Date.now() - timer}ms.`)
}

//

export default { boot }
