# پرامپت‌های ElevenLabs برای نریشن و افکت صوتی

ElevenLabs هنگام ساخت فایل‌ها خطا داد: اول محدودیت تعداد درخواست (rate limit) و بعد پیام «Free Tier access has been disabled». یعنی برای ادامه، حساب ElevenLabs به پلن پولی نیاز دارد. با پرامپت‌های زیر می‌توانید فایل‌ها را خودتان در ElevenLabs بسازید و در ویدئو قرار دهید.

## ۱. نریشن (Text to Speech)

- **صدا:** Sara - Neutral Persian Female (Voice ID: `RBEKbcQ62sKk2tsmPsAU`). صدای زن، با لهجهٔ تهرانی و لحن روشن و رسمی
  - جایگزین مرد: Aran Parsi (Voice ID: `PEdcOLzbXYhL8IKOswXB`)
- **مدل:** Eleven v4 (یا Eleven v3). تگ‌های داخل کروشه مثل `[serious]` فقط در همین دو مدل اجرا می‌شوند؛ در مدل‌های دیگر آن‌ها را حذف کنید.
- **تنظیمات پیشنهادی:** Stability حدود ۵۰٪، Speed روی ۱٫۰. اگر کلیپی از «حداکثر طول» جدول بلندتر شد، Speed را تا ۱٫۱ بالا ببرید.
- **خروجی:** MP3، هر جمله در یک فایل جداگانه با همان نامی که در جدول آمده. چون هر کلیپ زمان شروع مشخصی دارد، با تصویر هم‌زمان می‌شود.

| فایل | شروع (ثانیه) | حداکثر طول | متن برای ElevenLabs |
|---|---|---|---|
| `vo-01.mp3` | ۰٫۲ | ۳ ثانیه | `[serious] هشدار! این محصولات آرایشی، غیرمجازند.` |
| `vo-02.mp3` | ۳٫۷ | ۵ ثانیه | `سازمان غذا و دارو به شهروندان توصیه کرده، از خرید این محصولات خودداری کنند.` |
| `vo-03.mp3` | ۹٫۲ | ۲٫۲ ثانیه | `دوازده محصول، در چهار دسته.` |
| `vo-04.mp3` | ۱۱٫۹ | ۷٫۳ ثانیه | `کرم پودر و پرایمر: گابرینی میکاپ کاوِر، کرم پودر مات گابرینی، پرایمر گابرینی، و کرم پودر لورآل.` |
| `vo-05.mp3` | ۱۹٫۹ | ۶٫۹ ثانیه | `رژگونه: دودو گِرل، رژگونه مایع مودا گلد، رژگونه تراکوتا باریش، و رژگونه آرت‌اسکین.` |
| `vo-06.mp3` | ۲۷٫۳ | ۴ ثانیه | `کانسیلر و کانتور صورت، جولیوس بیوتی.` |
| `vo-07.mp3` | ۳۱٫۸ | ۴ ثانیه | `کرم جوان‌ساز ماتیا، و کرم آنتی‌اکسیدان بایوآکوا.` |
| `vo-08.mp3` | ۳۶٫۳ | ۵ ثانیه | `این دوازده محصول را نخرید.` |
| `vo-09.mp3` | ۴۱٫۸ | ۳٫۵ ثانیه | `فقط از فروشگاه‌های معتبر خرید کنید.` |
| `vo-10.mp3` | ۴۵٫۷ | ۳٫۲ ثانیه | `[warmly] این هشدار را برای عزیزانتان بفرستید.` |

نام برندها را به فارسی نوشته‌ام تا صدای فارسی آن‌ها را درست بخواند. اگر تلفظ برندی به نظرتان اشتباه بود، فقط همان کلیپ را دوباره بسازید.

## ۲. افکت‌های صوتی (Sound Effects)

مدل: Eleven Text to Sound v2. پرامپت‌ها را به همین شکل انگلیسی وارد کنید.

| فایل | شروع (ثانیه) | طول | پرامپت |
|---|---|---|---|
| `sfx-alarm.mp3` | ۰ | ۱٫۵ ثانیه | `Two short urgent electronic warning alarm beeps, clean digital news alert tone` |
| `sfx-marker.mp3` | ۵٫۲۵ | ۰٫۶ ثانیه | `Single quick felt-tip marker stroke on paper, one fast squeaky swipe` |
| `sfx-whoosh.mp3` | ۹ | ۱ ثانیه | `Fast airy whoosh swipe transition, soft and powdery like a big makeup brush sweeping past the microphone` |
| `sfx-stamp-1.mp3`، `sfx-stamp-2.mp3` و `sfx-stamp-3.mp3` | ۱۲ بار، هم‌زمان با خوردن هر مهر | ۰٫۵ ثانیه | `Single heavy rubber stamp slamming down on paper on a wooden desk, sharp punchy thud, dry` |
| `sfx-impact.mp3` | ۳۷٫۴ | ۱٫۵ ثانیه | `Deep cinematic bass impact hit, short punchy boom with sub rumble tail` |

برای مهر، سه نسخهٔ متفاوت بسازید و جدا ذخیره کنید. ویدئو این سه نسخه را به نوبت پخش می‌کند تا ۱۲ ضربهٔ مهر تکراری و ماشینی به نظر نرسد.

## ۳. موسیقی زمینه (اختیاری؛ Eleven Music)

- **فایل:** `music.mp3`، حدود ۵۰ ثانیه
- **پرامپت:**

```
Tense minimal news-alert underscore, 105 BPM, pulsing low synth bass and soft ticking percussion, dark and serious but clean, no vocals, slight lift around 36 seconds, soft resolve at the end, 50 seconds
```

صدای موسیقی در ویدئو روی ۰٫۱۴ تنظیم شده تا زیر نریشن بماند و در ۲ ثانیهٔ آخر محو می‌شود.

## ۴. اضافه کردن صداها به ویدئو

1. فایل‌ها را با همین نام‌ها در پوشهٔ `banned-cosmetics/video/assets/audio/` بگذارید.
2. در فایل `banned-cosmetics/video/index.html` علامت‌های کامنت (`<!--` و `-->`) را از دور خط‌های `<audio>` مربوط به همان فایل‌ها بردارید.
3. ویدئو را دوباره رندر کنید:

```bash
cd banned-cosmetics/video
npx hyperframes render --quality delivery --output ../out/banned-cosmetics.mp4
```

راه ساده‌تر: فایل‌ها را برای من بفرستید تا خودم آن‌ها را جای‌گذاری کنم، صداها را هم‌سطح کنم و رندر نهایی را بگیرم.
