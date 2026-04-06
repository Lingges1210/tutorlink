// lib/certificates/generatePdf.ts
//
// Uses Puppeteer to render the certificate HTML template to a high-quality PDF.
// Install: npm install puppeteer
// For Vercel Edge/Serverless: use `puppeteer-core` + `@sparticuz/chromium` instead.
//
// Alternative: replace the puppeteer block with @react-pdf/renderer if you
// prefer a pure-JS approach (no headless Chrome needed).

import puppeteer from "puppeteer";

interface CertMeta {
  tutorName: string;
  sessionsCompleted: number;
  hoursCompleted: number;
  rating: number;
  ratingCount: number;
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function buildCertificateHtml(meta: CertMeta, certNumber: string): string {
  const issuedDate = new Date().toLocaleDateString("en-SG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const rating =
    meta.ratingCount > 0 ? Number(meta.rating).toFixed(1) + " / 5.0" : "—";

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 297mm;
    height: 210mm;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cert-outer {
    width: 280mm;
    height: 196mm;
    background: linear-gradient(135deg, #fdf8f0 0%, #fef9f2 50%, #fdf6ec 100%);
    border: 2.5px solid #b89a5a;
    padding: 7px;
    position: relative;
  }

  .cert-inner {
    width: 100%;
    height: 100%;
    border: 1px solid #c8a84a;
    padding: 28px 44px 24px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Corner ornaments */
  .corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border-color: #b89a5a;
    border-style: solid;
  }
  .tl { top: 10px; left: 10px; border-width: 1.5px 0 0 1.5px; }
  .tr { top: 10px; right: 10px; border-width: 1.5px 1.5px 0 0; }
  .bl { bottom: 10px; left: 10px; border-width: 0 0 1.5px 1.5px; }
  .br { bottom: 10px; right: 10px; border-width: 0 1.5px 1.5px 0; }

  /* Typography */
  .org {
    font-family: 'Cinzel', serif;
    font-size: 9pt;
    letter-spacing: 0.32em;
    color: #8a7040;
    text-transform: uppercase;
    margin-bottom: 7px;
  }
  .cert-title {
    font-family: 'Cinzel', serif;
    font-size: 22pt;
    font-weight: 700;
    color: #6a4a10;
    letter-spacing: 0.05em;
    margin-bottom: 3px;
  }
  .cert-subtitle {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: 12pt;
    color: #9a8860;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }

  .body-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 12pt;
    color: #6a5a40;
    text-align: center;
    line-height: 1.65;
    margin: 10px 0 4px;
  }

  .tutor-name {
    font-family: 'Cinzel', serif;
    font-size: 24pt;
    font-weight: 600;
    color: #3a2808;
    text-align: center;
    padding: 8px 0;
    border-top: 1px solid #c8a84a;
    border-bottom: 1px solid #c8a84a;
    margin: 8px 0 10px;
    letter-spacing: 0.05em;
    width: 100%;
  }

  /* Stats */
  .stats-row {
    display: flex;
    gap: 14px;
    justify-content: center;
    margin: 6px 0 14px;
  }
  .stat-box {
    background: rgba(184,154,90,0.07);
    border: 1px solid #d8b87a;
    padding: 8px 18px;
    text-align: center;
    min-width: 76px;
  }
  .stat-val {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 17pt;
    font-weight: 600;
    color: #7a5510;
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-lbl {
    font-family: 'Cormorant Garamond', serif;
    font-size: 8pt;
    letter-spacing: 0.18em;
    color: #9a8a6a;
    text-transform: uppercase;
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    margin-top: auto;
    padding-top: 8px;
    border-top: 0.5px solid #d8b87a;
  }

  .sig-block { flex: 1; text-align: center; }
  .sig-line {
    width: 120px;
    height: 1px;
    background: #c8a84a;
    margin: 0 auto 5px;
  }
  .sig-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 11pt;
    font-weight: 600;
    color: #4a3820;
    margin-bottom: 2px;
  }
  .sig-role {
    font-family: 'Cormorant Garamond', serif;
    font-size: 8pt;
    letter-spacing: 0.1em;
    color: #9a8a6a;
    text-transform: uppercase;
  }

  .cert-date {
    font-family: 'Cormorant Garamond', serif;
    font-size: 9pt;
    color: #9a8a6a;
    text-align: center;
    letter-spacing: 0.1em;
    margin-top: 10px;
    width: 100%;
  }
</style>
</head>
<body>
<div class="cert-outer">
  <div class="cert-inner">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <!-- Header -->
    <p class="org">TutorLink Platform</p>

    <!-- Monogram -->
    <svg width="44" height="44" viewBox="0 0 44 44" style="margin-bottom:8px">
      <circle cx="22" cy="22" r="20.5" stroke="#c8a84a" stroke-width="1" fill="none"/>
      <circle cx="22" cy="22" r="15.5" stroke="#c8a84a" stroke-width="0.5" fill="none"/>
      <text x="22" y="29" text-anchor="middle" font-family="'Cinzel', serif" font-size="18" font-weight="700" fill="#b89a5a">T</text>
    </svg>

    <h1 class="cert-title">Certificate of Achievement</h1>
    <p class="cert-subtitle">in Tutoring Excellence</p>

    <!-- Decorative divider -->
    <svg width="480" height="14" viewBox="0 0 480 14" style="margin:2px 0">
      <line x1="0" y1="7" x2="215" y2="7" stroke="#c8a84a" stroke-width="0.8"/>
      <polygon points="218,7 228,3 238,7 228,11" fill="#c8a84a"/>
      <polygon points="242,7 233,4 233,10" fill="#c8a84a"/>
      <!-- centre star -->
      <polygon points="240,2 242.2,8.5 249,8.5 243.6,12.2 245.8,18.8 240,15.1 234.2,18.8 236.4,12.2 231,8.5 237.8,8.5" fill="none" stroke="#c8a84a" stroke-width="0.9" stroke-linejoin="round" transform="translate(0,-5)"/>
      <polygon points="242,7 251,3 261,7 251,11" fill="#c8a84a"/>
      <line x1="264" y1="7" x2="480" y2="7" stroke="#c8a84a" stroke-width="0.8"/>
    </svg>

    <p class="body-text">This is to proudly certify that</p>

    <div class="tutor-name">${meta.tutorName}</div>

    <p class="body-text" style="font-style:italic;font-size:11pt">
      has demonstrated outstanding dedication and proficiency<br/>
      as a certified tutor on the TutorLink platform,<br/>
      having successfully achieved the following milestones:
    </p>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-box">
        <span class="stat-val">${meta.sessionsCompleted}</span>
        <span class="stat-lbl">Sessions</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${meta.hoursCompleted}</span>
        <span class="stat-lbl">Hours</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">${rating}</span>
        <span class="stat-lbl">Rating</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <!-- Left signature -->
      <div class="sig-block">
        <svg width="110" height="28" viewBox="0 0 110 28" style="display:block;margin:0 auto 3px">
          <path d="M8,22 C18,7 26,5 34,15 C40,23 48,9 58,13 C66,17 72,7 82,11 C92,15 96,9 104,17"
            fill="none" stroke="#4a3820" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
        </svg>
        <div class="sig-line"></div>
        <p class="sig-name">Dr. Amanda Chen</p>
        <p class="sig-role">Director of Education</p>
      </div>

      <!-- Seal -->
      <div style="text-align:center">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="40" fill="rgba(184,154,90,0.06)" stroke="#c8a84a" stroke-width="1"/>
          <circle cx="44" cy="44" r="33" fill="none" stroke="#c8a84a" stroke-width="0.5"/>
          <polygon points="44,20 47.8,31.8 60.5,31.8 50.3,39.2 54.1,51 44,43.6 33.9,51 37.7,39.2 27.5,31.8 40.2,31.8"
            fill="none" stroke="#c8a84a" stroke-width="1" stroke-linejoin="round"/>
          <defs>
            <path id="sp" d="M44,44 m-28,0 a28,28 0 1,1 56,0 a28,28 0 1,1 -56,0"/>
          </defs>
          <text font-size="5.5" letter-spacing="2" fill="#b89a5a" font-family="'Cinzel',serif">
            <textPath href="#sp" startOffset="5%">TUTORLINK · CERTIFIED · EXCELLENCE ·</textPath>
          </text>
        </svg>
      </div>

      <!-- Right signature -->
      <div class="sig-block">
        <svg width="110" height="28" viewBox="0 0 110 28" style="display:block;margin:0 auto 3px">
          <path d="M6,20 C14,9 20,8 28,17 C34,25 42,9 52,13 C60,17 68,9 80,15 C90,21 96,8 105,16"
            fill="none" stroke="#4a3820" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
        </svg>
        <div class="sig-line"></div>
        <p class="sig-name">James Tan</p>
        <p class="sig-role">Platform Director</p>
      </div>
    </div>

    <p class="cert-date">
      Issued on ${issuedDate} &nbsp;·&nbsp; Certificate No. ${certNumber}
    </p>
  </div>
</div>
</body>
</html>
`;
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generateCertificatePdf(
  meta: CertMeta,
  certNumber?: string
): Promise<Buffer> {
  const certNo =
    certNumber ??
    "TL-" +
      new Date().getFullYear() +
      "-" +
      String(Math.floor(Math.random() * 9000) + 1000);

  const html = buildCertificateHtml(meta, certNo);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Wait for Google Fonts to load
    await page.setContent(html, { waitUntil: "networkidle0" });

    // A4 landscape
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Vercel Serverless variant (swap in when deploying to Vercel) ────────────
//
// import chromium from "@sparticuz/chromium";
// import puppeteer from "puppeteer-core";
//
// export async function generateCertificatePdf(meta, certNumber?) {
//   const executablePath = await chromium.executablePath();
//   const browser = await puppeteer.launch({
//     args: chromium.args,
//     defaultViewport: chromium.defaultViewport,
//     executablePath,
//     headless: chromium.headless,
//   });
//   // ... rest same as above
// }