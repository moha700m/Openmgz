# Signing the IPA with ESign

Openmgz produces an **unsigned** IPA. iOS refuses to install unsigned code, so the file must be
signed on the device before installation. ESign does that locally with a certificate and a
provisioning profile you supply.

## What the build produces

```
app.ipa
└── Payload/
    └── YourApp.app/
        ├── YourApp            (Mach-O executable)
        ├── Info.plist
        ├── Assets.car
        └── www/               (bundled web assets, when the wrapper strategy was used)
```

No `_CodeSignature/` directory and no `embedded.mobileprovision`. That is expected for an unsigned IPA.

## Requirements

| Item | Where it comes from |
|---|---|
| Certificate (`.p12` + password) | Apple Developer account, or a signing service |
| Provisioning profile (`.mobileprovision`) | Apple Developer portal, tied to the same App ID |
| Device UDID registered in that profile | Required for ad-hoc and development profiles |
| ESign (or any signing tool) | Installed on the iPhone |

The bundle identifier in the IPA must match the App ID of the provisioning profile. Openmgz sets it
from the project settings (default `com.openmgz.<name>`); change it before building if you already
have a profile.

## ESign workflow

1. **Download** — in Openmgz open the build → *Download IPA*. On the iPhone this lands in Files.
2. **Import the IPA** — in ESign: *Files* → *Import* → pick the `.ipa`, or share the file to ESign.
3. **Import the certificate** — ESign → *Certificates* → *Import* → `.p12` + password.
4. **Import the profile** — ESign → *Profiles* → *Import* → `.mobileprovision`.
5. **Sign** — tap the app → *Signature* → choose the certificate and profile → *Start signing*.
6. **Install** — ESign offers an install link; confirm the profile in *Settings → General → VPN &
   Device Management* on iOS 16+ (the exact path varies by iOS version).
7. **Launch** — if iOS shows "Untrusted Developer", trust the certificate under
   *Settings → General → VPN & Device Management*.

## Limits you will hit

- **Free Apple ID certificates** expire after 7 days and allow 3 apps. Resigning is manual.
- **Ad-hoc profiles** only install on devices whose UDIDs are in the profile.
- **Entitlements must match the profile.** Push notifications, App Groups, iCloud, HealthKit,
  associated domains, and Sign in with Apple cannot be added during local signing unless the
  profile already contains them. Apps that need those will install but crash or fail to register.
- **App Store distribution is not possible** from a unsigned IPA + local signing; that path needs a
  proper App Store profile and upload through App Store Connect.
- **Extensions and watchOS targets** must each be signed with a matching profile; ESign handles the
  common single-app case best.
- **Bundle ID mismatch** is the most common failure: the profile's App ID must match the IPA's
  `CFBundleIdentifier` exactly (wildcards are allowed only for profiles created as wildcard).

## Why not sign automatically?

Automatic signing would require storing an Apple certificate and its password on the server, plus
the device list. That is a far larger security surface than this project needs, and it would make
the platform useless without a paid Apple Developer account. Unsigned + ESign keeps credentials on
the phone, where they belong.

## Verifying an IPA locally

```bash
unzip -l app.ipa | head            # Payload/YourApp.app/…
unzip -p app.ipa Payload/YourApp.app/Info.plist | plutil -p -   # macOS
```
