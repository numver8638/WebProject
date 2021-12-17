import crypto from "crypto"

const hashOf = (...buffers: Buffer[]): Buffer => {
    let hash = crypto.createHash("sha256")

    for (const buffer of buffers) {
        hash.update(buffer)
    }

    return hash.digest()
}

const generateKeyPair = (): Promise<{publicKey: Buffer, privateKey: Buffer}> => {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        }, (err: Error|null, publicKey: Buffer, privateKey: Buffer) => {
            if (err) {
                reject(err)
            }
            else {
                resolve({ publicKey: publicKey, privateKey: privateKey })
            }
        })
    })
}

const cipher = (passphrase: string, obj: any): string => {
    let json = JSON.stringify(obj)
    let iv = crypto.randomBytes(32)
    let key = crypto.createHash("sha256").update(passphrase).digest()
    let cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

    let update = cipher.update(json)
    let final = cipher.final()

    let authTag = cipher.getAuthTag()

    return Buffer.concat([iv, authTag, update, final]).toString("base64")
}

const decipher = (passphrase: string, encrypted: string) => {
    let buffer = Buffer.from(encrypted, "base64")

    let iv = buffer.slice(0, 32)
    let authTag = buffer.slice(32, 48)
    let key = crypto.createHash("sha256").update(passphrase).digest()
    let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)

    decipher.setAuthTag(authTag)
    let update = decipher.update(buffer.slice(48))
    let final = decipher.final()

    return Buffer.concat([update, final]).toString()
}

const hashPassword = (password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(64)
        crypto.pbkdf2(password, salt, 10000, 64, "sha256", (err, key) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(salt.toString("base64") + "$" + key.toString("base64"))
            }
        })
    })
}

const checkPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
    const [salt, hashed] = hashedPassword.split("$")

    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, Buffer.from(salt, "base64"), 10000, 64, "sha256", (err, key) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(key.toString("base64") === hashed)
            }
        })
    })
}

const generateUID = () => crypto.randomBytes(6).toString("hex")

const generateRandom = (length: number): string => crypto.randomBytes(length / 2).toString("hex")

export { hashOf, generateKeyPair, cipher, decipher, hashPassword, checkPassword, generateUID, generateRandom }