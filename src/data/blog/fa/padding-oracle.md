---
author: "amir_rabiee"
pubDatetime: 2025-11-16T22:58:45.51
title: "نگاهی بر حمله Padding Oracle"
featured: false
draft: true
archived: false
tags:
  - cbc
  - cryptography
description: "چطوری لاگ کردن یک ارور ساده میتونه یک رمزنگاری رو بشکونه..."
---

## فهرست مطالب

## CBC، چیه و چرا ازش استفاده می کنیم؟

اگر ما بخوایم هر بلوک plaintext رو جداگانه رمزنگاری کنیم،‌بلوک های تکراری به بلوک های رمزنگاری شده یکسانی تبدیل خواهد شد. 

این یعنی یه میزان زیادی از اطلاعات و الگو ها از رمزنگاری رد میشن.

![ebc_problem](@/assets/images/ebc_problem.png)

برای رفع این مشکل مود CBC ارائه شد. 

چطور کار می‌کنه:

هر plaintext block رو قبل از رمزنگاری با ciphertext block قبلی XOR می‌کنه
اولین block با یک IV (Initialization Vector) رندم XOR میشه.

فرمول: 

$$
C_i = E(P_i ⊕ C_{i-1})
$$

$$
C_0 = E(P_0 ⊕ IV) 
$$

رمزگشایی:

$$
P_i = D(C_i) ⊕ C_{i-1}
$$

$$
P_0 = D(C_0) ⊕ IV
$$

![cbc](@/assets/images/CBC_decryption.png)

## Padding چیه و چرا لازمه؟

block cipher ها فقط با سایزهای ثابت کار می‌کنن (مثلا AES با بلوک های ۱۶ بایتی). اگه plaintext ما درست ۱۶ بایت نباشه، باید پدینگ اضافه کنیم.

استاندارد PKCS#7:
- اگه n بایت کم داریم، n بار عدد n رو اضافه می‌کنیم
- مثال: اگه ۵ بایت کم داریم: `05 05 05 05 05`
- اگه سایز دقیقا مضرب block size باشه، یه بلوک کامل پدینگ اضافه میشه

مثال:
```
plaintext: "HELLO" (5 bytes)
block size: 8 bytes
padding: 03 03 03
result: "HELLO\x03\x03\x03"
```

## حمله Padding Oracle چیه؟

فرض کن یه سرور داری که وقتی یه ciphertext رو decrypt می‌کنه:
- اگه padding درست باشه: پیام عادی برمی‌گردونه یا ۲۰۰ OK
- اگه padding غلط باشه: ارور می‌ده یا ۵۰۰ Internal Error

این تفاوت کوچیک به ما یه oracle (پیشگو) میده که میگه padding درسته یا نه.

![padding_oracle_concept](@/assets/images/padding_oracle_concept.jpg)

## مکانیزم حمله

یادت باشه decrypt در CBC اینجوریه:
$$
P_i = D(C_i) ⊕ C_{i-1}
$$

اگه ما $C_{i-1}$ رو عوض کنیم، $P_i$ هم عوض میشه، بدون اینکه نیاز باشیم key رو بدونیم!

### مراحل حمله برای یک بایت

فرض کن می‌خوایم آخرین بایت یه بلوک رو پیدا کنیم.

1. یه IV فیک درست می‌کنیم و بایت آخرش رو از ۰۰ تا FF تست می‌کنیم
2. وقتی padding درست شد (مثلا `01`) سرور ارور نمیده
3. حالا می‌دونیم: `D(C) ⊕ IV_guess = 0x01`
4. پس: `D(C) = IV_guess ⊕ 0x01`
5. و plaintext واقعی: `P = D(C) ⊕ IV_real`

برای بایت بعدی، باید padding `02 02` درست کنیم، و همینطور ادامه میده.

### مثال عملی
```python
def padding_oracle_attack(ciphertext, iv, oracle):
    block_size = 16
    plaintext = b''
    
    for block_num in range(len(ciphertext) // block_size):
        block = ciphertext[block_num * block_size:(block_num + 1) * block_size]
        prev = iv if block_num == 0 else ciphertext[(block_num - 1) * block_size:block_num * block_size]
        
        intermediate = bytearray(block_size)
        
        for pad_value in range(1, block_size + 1):
            for byte_val in range(256):
                test_iv = bytearray(prev)
                
                for i in range(1, pad_value):
                    test_iv[-i] = intermediate[-i] ^ pad_value
                
                test_iv[-pad_value] = byte_val
                
                if oracle(bytes(test_iv), block):
                    intermediate[-pad_value] = byte_val ^ pad_value
                    break
        
        plaintext += bytes([intermediate[i] ^ prev[i] for i in range(block_size)])
    
    return plaintext
```

## چرا این حمله کارآمده؟

- هر بایت رو جداگانه می‌شکونیم (۲۵۶ تلاش به جای $2^{128}$)
- برای یه بلوک ۱۶ بایتی: حداکثر $256 \times 16 = 4096$ تلاش
- برای رمزنگاری AES-128 که $2^{128}$ حالت داره، این خیلی کمه

## مثال های واقعی

1. **ASP.NET (2010)**: به خاطر leak کردن padding errors، vulnerable بود
2. **Java JSF ViewState (2010)**: همین مشکل
3. **Ruby on Rails (2013)**: در timing attacks
4. **OpenSSL**: در نسخه های قدیمی‌تر

## دفاع در برابر حمله

### ۱. Encrypt-then-MAC
```python
ciphertext = encrypt(plaintext)
mac = HMAC(key, ciphertext)
send(ciphertext + mac)
```
اول MAC رو چک کن، بعد decrypt کن. اگه MAC غلط بود، اصلا decrypt نکن.

### ۲. یکسان سازی ارورها
```python
def decrypt_safe(ciphertext):
    try:
        plaintext = decrypt(ciphertext)
        if not valid_padding(plaintext):
            raise Exception("Invalid")
        return plaintext
    except:
        time.sleep(random.uniform(0.1, 0.2))
        raise Exception("Decryption failed")
```

### ۳. استفاده از AEAD
مثل AES-GCM یا ChaCha20-Poly1305 که authentication رو توی خودشون دارن.
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

aesgcm = AESGCM(key)
ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
```

### ۴. Constant-time operations
همیشه یه مقدار ثابت زمان صرف کن، حتی اگه padding غلط بود.

## نتیجه گیری

یه ارور ساده padding میتونه کل امنیت رمزنگاری رو بشکونه. همیشه:
- از MAC استفاده کن
- ارورها رو leak نکن
- به timing حملات توجه کن
- اگه ممکنه از AEAD استفاده کن

امنیت فقط به الگوریتم رمزنگاری بستگی نداره، پیاده سازی هم مهمه.

## منابع

- [OWASP Padding Oracle](https://owasp.org/www-community/attacks/Padding_Oracle_Attack)
- [Practical Padding Oracle Attacks](https://robertheaton.com/2013/07/29/padding-oracle-attack/)
