package space.davids_digital.vk_gpt_chatbot;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

public class AESKeyGen {
    public static void main(String[] args) {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance("AES");
            keyGen.init(256);
            SecretKey secretKey = keyGen.generateKey();
            byte[] keyBytes = secretKey.getEncoded();
            String encodedKey = Base64.getEncoder().encodeToString(keyBytes);
            System.out.println(encodedKey);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}