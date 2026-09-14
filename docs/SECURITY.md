# Security notes

- Electron renderer: sandboxing and context isolation enabled, Node integration disabled, no general-purpose IPC or filesystem bridge.
- Privileged IPC only accepts the main application window and main frame. Capture inputs are validated again in the main process.
- Login pages use a temporary, isolated partition without preload, Node access, permissions, popup windows or downloads.
- Vault data is encrypted with Electron safeStorage; no plaintext fallback. Sessions are selected explicitly and loaded only for the recorded exact origin.
- HTTP(S) navigation only. URL credentials and non-web protocols are rejected. No stealth, CAPTCHA bypass or paywall removal.
- Each capture gets a fresh browser context, closed after success, error, timeout or cancellation.
- Capture browser runs locally with the ordinary browser sandbox. This is not a public screenshot proxy.
- Input images are restricted to PNG/JPEG, limited to 10MB, decoded by the browser, resized and encoded as JPEG before document generation.

Dependency audit, 2026-09-15: Sharp upgraded to patched 0.35.4. Upstream `pptxgenjs` still depends on `image-size` with unpatched ICNS/JXL/HEIF parser advisories; this application only passes internally generated JPEGs into that parser. ExcelJS has a transitive uuid advisory affecting supplied output buffers; this application does not call those uuid functions or supply buffers. Re-evaluate upstream releases before a commercial launch. These restrictions reduce exposure; they do not mean the upstream advisories are fixed.
