---
author: "amir_rabiee"
pubDatetime: 2025-11-16T22:58:45.51
title: "نگاهی بر حمله Padding Oracle"
featured: false
draft: false
archived: false
tags:
  - cbc
  - cryptography
description: "چطوری لاگ کردن یک ارور ساده میتونه یک رمزنگاری رو بشکونه..."
---

## فهرست مطالب

## CBC، چیست و چرا ازش استفاده می کنیم؟

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

