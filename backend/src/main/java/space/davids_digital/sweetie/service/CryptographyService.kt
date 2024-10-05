package space.davids_digital.sweetie.service

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import java.security.InvalidKeyException
import java.security.NoSuchAlgorithmException
import java.util.*
import javax.crypto.*
import javax.crypto.spec.SecretKeySpec

@Service
class CryptographyService(
    @Qualifier("generalSecretKeyBase64") generalSecretKeyBase64: String
) {
    private lateinit var secretKey: SecretKey

    init {
        secretKey = SecretKeySpec(Base64.getDecoder().decode(generalSecretKeyBase64), "AES")
    }

    @Throws(
        NoSuchPaddingException::class,
        NoSuchAlgorithmException::class,
        InvalidKeyException::class,
        IllegalBlockSizeException::class,
        BadPaddingException::class
    )
    fun encrypt(data: ByteArray?): ByteArray {
        val cipher = Cipher.getInstance("AES")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        return cipher.doFinal(data)
    }

    @Throws(
        NoSuchPaddingException::class,
        NoSuchAlgorithmException::class,
        InvalidKeyException::class,
        IllegalBlockSizeException::class,
        BadPaddingException::class
    )
    fun decrypt(data: ByteArray?): ByteArray {
        val cipher = Cipher.getInstance("AES")
        cipher.init(Cipher.DECRYPT_MODE, secretKey)
        return cipher.doFinal(data)
    }
}
