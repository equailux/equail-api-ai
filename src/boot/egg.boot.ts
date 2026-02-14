import env from "@/config/env.config.js"
import eggModule from "@/modules/egg.module.js"

//

const boot = async () => {
    let timer = Date.now()
    await eggModule.load(env.egg.size)
    console.info(`[Boot.Egg]: Egg detection model loaded in ${Date.now() - timer}ms.`)
    
    timer = Date.now()
    await eggModule.warmup()
    console.info(`[Boot.Egg]: Egg detection model warmed-up in ${Date.now() - timer}ms.`)
}

//

export default { boot }
