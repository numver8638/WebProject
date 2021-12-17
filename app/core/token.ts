import crypto from "crypto"

import jwt, { NotBeforeError, TokenExpiredError } from "jsonwebtoken"

import { ACCESS_TOKEN_SECRET, TOKEN_ENCRYPT_SECRET } from "@app/config"
import { generateKeyPair, cipher, hashOf, decipher } from "@app/core/crypto";
import { HTTPError, HTTP_STATUS_CODE } from "@app/core/error";

const TOKEN_EXPIRE_TIME = 15 * 1000; // 15 seconds

interface RequestToken {
    key: string;
    token: string;
}

const generateRequestToken = async (requestID: string): Promise<RequestToken> => {
    const { publicKey, privateKey } = await generateKeyPair()

    let token = {
        request_id: requestID,
        private_key: privateKey.toString("base64"),
        issue_at: Date.now()
    }

    return { key: publicKey.toString("base64"), token: cipher(TOKEN_ENCRYPT_SECRET, token) }
}

const extractRequestToken = (encryptedData: string, encryptedToken: string): any => {
    let token = JSON.parse(decipher(TOKEN_ENCRYPT_SECRET, encryptedToken))

    if (token.issue_at >= Date.now() + TOKEN_EXPIRE_TIME) {
        throw new HTTPError(HTTP_STATUS_CODE.REQUEST_TIMEOUT)
    }

    let privateKey = crypto.createPrivateKey({
        key: Buffer.from(token.private_key, "base64"),
        format: "der",
        type: "pkcs8"
    })

    let data = crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(encryptedData, "base64")).toString()
    return JSON.parse(data)
}

const generateAccessToken = (data: any): string => {
    return jwt.sign(data, ACCESS_TOKEN_SECRET, {
        algorithm: 'HS256'
    })
}

const extractAccessToken = (token: string): any => {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET, {
            complete: false
        })
    }
    catch (error) {
        if (error instanceof TokenExpiredError) {
            throw HTTPError.loginRequired()
        }
        else if (error instanceof NotBeforeError) {
            throw HTTPError.badRequest(error.message)
        }
        else {
            throw error
        }
    }
}

export { RequestToken, generateRequestToken, extractRequestToken, generateAccessToken, extractAccessToken }