import multer from "multer";

//

const filter: multer.Options["fileFilter"] = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Only images are allowed."))
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fieldSize: 5 * 1024 * 1024 },
    fileFilter: filter,
})

//

export default { upload }
