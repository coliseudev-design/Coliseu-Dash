import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

enc_key_b64 = "9Q0AQbR0tCbrEfqHWre0YiOQrxqX1KQtuCRjcfizO+g="
ciphertext_b64 = "uPASlSadVkzX26HV7LmP0h/VoFZ2ERfCpmRj9qryYr0J+fFdAcXW5vNpdbdOeQ=="

try:
    key = base64.b64decode(enc_key_b64)
    data = base64.b64decode(ciphertext_b64)
    
    # Format: nonce[12] + ciphertext + tag[16]
    nonce = data[:12]
    # In cryptography AESGCM, the decrypt method takes: decrypt(nonce, ciphertext + tag, associated_data)
    ciphertext_and_tag = data[12:]
    
    aesgcm = AESGCM(key)
    decrypted = aesgcm.decrypt(nonce, ciphertext_and_tag, None)
    print("Decrypted API Key:", decrypted.decode('utf-8'))
except Exception as e:
    print("Error during decryption:", e)
