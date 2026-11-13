<div align="center">

# Openmgz

**ارفع مشروعًا → نحلّله → نبني تطبيق iOS → نُخرج IPA جاهزًا لـ ESign.**

`Node.js` · `GitHub Actions` · `macOS runners` · **صفر اعتماديات npm** · MIT

</div>

---

Openmgz منصّة محلية (control plane) تحوّل أرشيف مشروع إلى تطبيق iOS وملف IPA غير موقّع،
باستخدام GitHub Actions كعامل بناء macOS. كل شيء آخر — التحليل، التوليد، الطابور، السجلات —
يعمل على جهازك.

> **ما هي وما ليست:** هي سيرفر محلي تفتحه من المتصفح (واجهة موبايل أولًا، قابلة للتثبيت كـ PWA).
> ليست موقعًا مستضافًا، ولا تحتفظ بأي مفاتيح Apple.

## المزايا

- **تحليل حقيقي للمشروع** — يتعرّف على Swift/Xcode، SwiftUI، Flutter، React Native، Capacitor،
  Next.js، تطبيقات الويب، والمواقع الثابتة. لا يحوّل كل شيء إلى SwiftUI.
- **مولّد iOS فعلي** — لتطبيقات الويب يُنشئ تطبيق SwiftUI + WKWebView يحزم الموقع داخل `.app`
  ويعمل بدون إنترنت، مع تعامل مع الروابط الخارجية ونوافذ JS.
- **مصنع IPA** — workflow على `macos-15` يبني بـ `xcodebuild` بدون توقيع، يحزم `Payload/`،
  ويرفع الـ IPA كـ artifact ثم ينزّله الخادم ويعرضه للتحميل.
- **واجهة موبايل بريميوم** — عربي/إنجليزي، RTL، داكن/فاتح، معاينة داخل إطار iPhone، تقدّم حي،
  سجلات، وتاريخ بناءات.
- **حماية** — استخراج آمن للأرشيف، التوكن لا يغادر الخادم، ومنع دفع الكود إلى مستودع عام إلا بموافقة.

## أسرع طريقة (نقرتان)

1. **نزّل المشروع:** GitHub → زر `Code` → `Download ZIP`، ثم فُكّ الضغط في أي مجلد.
2. **شغّله:**
   - **ماك:** دبل كلك على `start.command` (إن ظهر تحذير أمني: كلك يمين → Open).
   - **ويندوز:** دبل كلك على `start.bat`.
3. **أول مرة فقط:** سيفتح المتصفح على صفحة إنشاء توكن GitHub، الصق التوكن في النافذة السوداء.
4. بعد ثانيتين يفتح المتصفح على `http://localhost:4400` — جاهز.

المشغّل يتحقق من Node.js، ينشئ `.env`، ويحفظ التوكن محليًا. لا يحتاج `npm install`.

## البدء

```bash
git clone https://github.com/moha700m/Openmgz.git
cd Openmgz
cp .env.example .env
# ضع GITHUB_TOKEN في .env
node server.mjs
# → http://localhost:4400
```

### التوكن

أنشئ **Fine-grained personal access token** على المستودع `moha700m/Openmgz` بالصلاحيات:

| Scope | لماذا |
|---|---|
| Contents — Read and write | دفع فروع البناء |
| Actions — Read and write | تشغيل الـ workflow وقراءة النتائج |
| Workflows — Read and write | ملف الـ workflow موجود في المستودع |

> المستودع **عام** حاليًا: البناء يدفع كود المشروع إليه، لذلك يرفض الخادم البناء ما لم تُفعّل
> خيار «السماح بالدفع إلى مستودع عام» في إعدادات المشروع. للاستخدام الجاد، اجعل `GITHUB_REPO`
> مستودعًا خاصًا بك.

### من الآيفون

الخادم يعمل على جهازك؛ افتح `http://<IP-الجهاز>:4400` من الآيفون على نفس الشبكة، ثم
*مشاركة → إضافة إلى الشاشة الرئيسية* ليعمل كتطبيق.

## الاستخدام

1. **ارفع** أرشيف `.tar.gz` (المشروع كاملًا، بدون `node_modules`).
2. راجع **نظرة عامة**: النوع، الاستراتيجية، الثقة، الأدلة، الشاشات المكتشفة، ومعاينة حية.
3. اضبط **الإعدادات**: اسم التطبيق، Bundle ID، الإصدار، أمر البناء ومجلد الإخراج (لتطبيقات الويب).
4. اضغط **ابنِ IPA** — يُدفع المشروع إلى فرع `openmgz/build-<id>`، يُشغَّل الـ workflow، وتتابع
   التقدّم مباشرة.
5. عند الاكتمال: **تنزيل IPA** → ESign → توقيع → تثبيت. التفاصيل في [`docs/esign.md`](docs/esign.md).

## المعمارية

```
server.mjs            HTTP + SSE + المعاينة
src/untar.mjs         قارئ tar/tar.gz آمن (يرفض .. و symlinks والملفات الضخمة)
src/analyzer.mjs      كشف النوع واختيار الاستراتيجية + الأدلة
src/generator.mjs     توليد مشروع SwiftUI + XcodeGen + أيقونة
src/github.mjs        Git Data API + Actions API
src/builds.mjs        آلة الحالة: push → dispatch → poll → أرشيف الـ IPA
.github/workflows/ios-ipa.yml   مصنع الـ IPA على macOS
```

التفاصيل الكاملة في [`docs/architecture.md`](docs/architecture.md).

## الاختبارات

```bash
node tests/run.mjs
```

**نتائج حقيقية:** بناءان ناجحان على runners ماك فعلية — [IPA لتطبيق ويب](docs/testing.md)
(131 KB، يحتوي `www/` داخل الحزمة) و[IPA لتطبيق SwiftUI](docs/testing.md) (18 KB) — كلاهما غير موقّع
وبنيته صحيحة (`Payload/App.app` + Mach-O arm64). التفاصيل في [`docs/testing.md`](docs/testing.md).

تغطّي: أمان استخراج الأرشيف (15 حالة)، تحليل 10 أنواع مشاريع، توليد مشروع iOS، ودورة الخادم
كاملة (رفع → تحليل → معاينة → توليد → منع البناء بدون توكن → حذف).

## ما لا يفعله

مصفوفة التحويل الكاملة والحدود في [`docs/limitations.md`](docs/limitations.md). باختصار:
Next.js بدون `output: "export"`، و Expo بدون مجلد `ios/`، و Swift Package بدون app target،
وخدمات Node الخلفية — كلها تُرفض برسالة صريحة بدل توليد تطبيق وهمي.

## الرخصة

MIT — انظر [`LICENSE`](LICENSE).

---

<details>
<summary><b>English</b></summary>

Openmgz is a local control plane that turns a project archive into a working iOS app and an
unsigned IPA. It analyzes the archive, picks a build strategy that preserves the original
functionality (native Xcode project, Flutter, React Native, Capacitor, or a generated
SwiftUI + WKWebView shell for web apps), pushes the code to a build branch, dispatches a macOS
GitHub Actions workflow, and downloads the resulting IPA.

```bash
cp .env.example .env   # add GITHUB_TOKEN
node server.mjs        # http://localhost:4400
```

No npm dependencies. `node tests/run.mjs` runs the full suite. Signing is done on-device with
ESign — see `docs/esign.md`. Limits: `docs/limitations.md`.

</details>
