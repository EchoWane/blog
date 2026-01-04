---
author: "amir"
pubDatetime: 2025-01-01T15:46:45.51
title: "معرفی:‌ NixOS"
featured: false
draft: false
archived: false
tags:
  - linux
  - nixos
  - review
description: "بالاخره:‌ یه توزیع لینوکس غیر تکراری"

---

## فهرست مطالب

## مقدمه

NixOS یه توزیع لینوکسه که با همه چیزی که تا الان دیدی فرق داره. نه Debian-based هست نه Arch-based. سیستم پکیج منیجرش از صفر نوشته شده و به جای اینکه فایلارو توی `/usr/bin` ریخته باشه همه چیو توی `/nix/store` نگه میداره با hash مربوطه.

چرا این مهمه؟ چون میتونی 10 تا ورژن مختلف از یه برنامه داشته باشی بدون اینکه باهم conflict کنن. میتونی سیستمتو به 3 ماه پیش برگردونی. میتونی کل config توی یه فایل بنویسی و روی 50 تا سرور مختلف deploy کنی.

## چی فرق داره؟

### Declarative Configuration

همه چی توی `/etc/nixos/configuration.nix` نوشته میشه. میخوای nginx نصب کنی؟ این:

```nix
services.nginx.enable = true;
```

میخوای user بسازی؟ این:

```nix
users.users.amir = {
  isNormalUser = true;
  extraGroups = [ "wheel" "networkmanager" ];
  shell = pkgs.fish;
};
```

یه بار `nixos-rebuild switch` میزنی، تموم. نه دستی service enable کردن، نه دستی فایل config کپی کردن، نه چیزی.

### Rollback

هر باری که `nixos-rebuild` میزنی یه generation جدید میسازه. خراب کردی؟ boot میکنی، از grub generation قبلیو انتخاب میکنی، تموم. سیستمت دقیقا همون حالت قبلیه.

```bash
nixos-rebuild switch --rollback
```

### Reproducibility

config تو git میزنی، روی هر سیستمی clone میکنی، rebuild میکنی، دقیقا همون محیطو داری. هیچ چیزی manual نصب نمیشه، هیچ چیزی hidden state نداره.

```bash
git clone https://github.com/USERNAME/nixos-config
cd nixos-config
sudo nixos-rebuild switch
```

همین.

### Multiple Versions

میخوای Python 3.9 و 3.11 و 3.12 هر سه تاشونو داشته باشی؟ بدون virtualenv، بدون pyenv، بدون هیچی:

```nix
environment.systemPackages = with pkgs; [
  python39
  python311
  python312
];
```

هر کدوم تو path جدا هستن، conflict ندارن.

## چرا ارزششو داره؟

### Nix-Shell

`nix-shell` یه محیط موقت با پکیج‌های خاص میسازه بدون اینکه سیستمی نصبشون کنی.

استفاده ساده:

```bash
nix-shell -p python3 nodejs
```

این یه shell با Python 3 و Node.js میده. از shell که خارج شدی، از PATH حذف میشن.

میتونی فایل `shell.nix` هم بسازی:

```nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    nodejs
    gcc
  ];
}
```

تو اون دایرکتوری `nix-shell` بزن، اون پکیج‌ها رو داری.

کاربردش:

- تست پکیج قبل اضافه کردن به configuration.nix
- dependency های مخصوص هر پروژه
- بیلد گرفتن بدون شلوغ کردن سیستم

با `nix-shell --run "command"` یه دستور رو تو محیط اجرا میکنه و بلافاصله خارج میشه.

### Server Management

یه config file، صد تا سرور. همه یکسان، همه reproducible. نه Ansible playbook، نه bash script، نه دستی ssh کردن.

### Package Manager

nixpkgs بزرگترین مخزن package توی دنیاست. **بیش از ۱۲۰ هزار تا پکیج**. حتی پکیج هایی که توی Arch AUR هستن اینجا official هستن.

میخوای custom package بسازی؟ یه nix expression مینویسی، تموم:

```nix
pkgs.stdenv.mkDerivation {
  pname = "myapp";
  version = "1.0";
  src = ./.;
  buildInputs = [ pkgs.gcc ];
}
```

## مشکلات

### Learning Curve

Nix language خاصه. expression-based، lazy evaluation داره، syntax عجیبه.

### Documentation

بعضی جاها documentation خوب نیست. ولی داره بهتر میشه.

### Proprietary Software

بعضی برنامه های proprietary مثل Chrome یا Spotify نیاز به patchelf دارن که nixpkgs خودش هندل میکنه ولی بعضی وقتا خراب میشه.

## جمع بندی

NixOS برای کسایی که میخوان سیستمشون declarative، reproducible و rollback-able باشه. برای sysadmin ها، devops ها، developer ها.

سخته؟ اولش آره. ارزششو داره؟ صد درصد. یه بار یاد بگیری، هیچ وقت بر نمی گردی. من یکی که نه حداقل. 