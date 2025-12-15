---
author: "amir_rabiee"
pubDatetime: 2025-12-13T16:46:45.51
title: "رفع مشکل اتصال OpenVPN پلتفرم های HTB ،THM و غیره"
featured: false
draft: false
archived: false
tags:
  - hackthebox
  - tryhackme
description: "اتصال به کانفیگ ماشین های این پلتفرم ها با وجود فیلترینگ"
---

برای حل این مشکل، فقط وصل کردن یه VPN دیگه قبل اتصال جواب نیست چون OpenVPN از پروکسی سیستم استفاده نمیکنه. باید فایل کانفیگ که ازین پلتفرم ها دانلود کردید رو یه خط بهش اضافه کنید که ترافیک از VPN دیگه ای که داریم رد بشه.

اول اطمینان حاصل کنید که یه VPN متصل با پورت باز دارید، مثل V2rayN. لازم نیست پروکسی سیستم ست باشه. فقط توی options گزینه Allow Connections from LAN فعال باشه و پورت رو به خاطر داشته باشید.

اگر فایل کافیگ .ovpn رو باز کنید اولش یه همچین خطوطی هست: 

```
client
dev tun
proto udp
remote eu-west-1-vpn.vm.tryhackme.com 1194
resolv-retry infinite
nobind
persist-key
...
```

حالا ما این خط `socks-proxy YOUR_IP PORT` رو بهش اضافه می کنیم. به جای YOUR_IP و PORT آیپی محلی و پورت VPN رو قرار بدید. دوباره امتحان کنید و به احتمال خیلی زیاد وصل میشه.

