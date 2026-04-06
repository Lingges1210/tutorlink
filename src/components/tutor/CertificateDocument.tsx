"use client";

interface CertMeta {
  sessionsCompleted: number;
  hoursCompleted: number;
  rating: number;
  ratingCount: number;
  tutorName?: string;
}

interface Cert {
  issuedAt: string;
  pdfUrl?: string;
  certNumber?: string;
  metadata?: CertMeta;
}

interface Props {
  cert: Cert;
}

export default function CertificateDocument({ cert }: Props) {
  const meta = cert.metadata;
  const tutorName = meta?.tutorName ?? "Tutor";
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-SG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const certNumber = cert.certNumber ?? "TL-" + new Date(cert.issuedAt).getFullYear() + "-" + String(Math.floor(Math.random() * 9000) + 1000);
  const rating =
    meta && meta.ratingCount > 0 ? Number(meta.rating).toFixed(1) : "—";

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

        .cert-page {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        @media print {
          body * { visibility: hidden !important; }
          .cert-printable, .cert-printable * { visibility: visible !important; }
          .cert-printable {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            padding: 0 !important;
          }
          .cert-outer {
            box-shadow: none !important;
            width: 700px !important;
          }
        }
      `}</style>

      <div className="cert-printable cert-page flex justify-center px-2 py-4">
        <div
          className="cert-outer w-full max-w-2xl"
          style={{
            background: "linear-gradient(135deg, #fdf8f0 0%, #fef9f2 50%, #fdf6ec 100%)",
            border: "2.5px solid #b89a5a",
            borderRadius: "4px",
            padding: "7px",
            boxShadow: "0 8px 48px rgba(120,90,40,0.15), inset 0 0 60px rgba(184,154,90,0.06)",
          }}
        >
          {/* Inner border */}
          <div
            style={{
              border: "1px solid #c8a84a",
              borderRadius: "2px",
              padding: "36px 48px 32px",
              position: "relative",
            }}
          >
            {/* Corner ornaments */}
            {["tl", "tr", "bl", "br"].map((pos) => (
              <div
                key={pos}
                style={{
                  position: "absolute",
                  width: 22,
                  height: 22,
                  ...(pos === "tl" && { top: 10, left: 10, borderTop: "1.5px solid #b89a5a", borderLeft: "1.5px solid #b89a5a" }),
                  ...(pos === "tr" && { top: 10, right: 10, borderTop: "1.5px solid #b89a5a", borderRight: "1.5px solid #b89a5a" }),
                  ...(pos === "bl" && { bottom: 10, left: 10, borderBottom: "1.5px solid #b89a5a", borderLeft: "1.5px solid #b89a5a" }),
                  ...(pos === "br" && { bottom: 10, right: 10, borderBottom: "1.5px solid #b89a5a", borderRight: "1.5px solid #b89a5a" }),
                }}
              />
            ))}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 10,
                letterSpacing: "0.32em",
                color: "#8a7040",
                textTransform: "uppercase",
                margin: "0 0 8px",
              }}>
                TutorLink Platform
              </p>

              {/* Logo / monogram */}
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                  <circle cx="21" cy="21" r="19.5" stroke="#c8a84a" strokeWidth="1"/>
                  <circle cx="21" cy="21" r="15" stroke="#c8a84a" strokeWidth="0.5"/>
                  <text x="21" y="27" textAnchor="middle" fontFamily="'Cinzel', serif" fontSize="16" fontWeight="700" fill="#b89a5a">T</text>
                </svg>
              </div>

              <h1 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 24,
                fontWeight: 700,
                color: "#6a4a10",
                letterSpacing: "0.06em",
                margin: "0 0 4px",
              }}>
                Certificate of Achievement
              </h1>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "#9a8860",
                letterSpacing: "0.08em",
                margin: 0,
              }}>
                in Tutoring Excellence
              </p>
            </div>

            {/* Divider */}
            <Divider />

            {/* Body text */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 14,
              color: "#6a5a40",
              textAlign: "center",
              lineHeight: 1.7,
              margin: "16px 0 6px",
            }}>
              This is to proudly certify that
            </p>

            {/* Name */}
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 28,
              fontWeight: 600,
              color: "#3a2808",
              textAlign: "center",
              padding: "10px 0",
              borderTop: "1px solid #c8a84a",
              borderBottom: "1px solid #c8a84a",
              margin: "10px 0 14px",
              letterSpacing: "0.05em",
            }}>
              {tutorName}
            </div>

            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 14,
              fontStyle: "italic",
              color: "#7a6a50",
              textAlign: "center",
              lineHeight: 1.7,
              margin: "0 0 16px",
            }}>
              has demonstrated outstanding dedication and proficiency<br />
              as a certified tutor on the TutorLink platform,<br />
              having successfully achieved the following milestones:
            </p>

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, margin: "0 0 24px" }}>
              {[
                { label: "Sessions", value: meta?.sessionsCompleted ?? "—" },
                { label: "Hours", value: meta?.hoursCompleted ?? "—" },
                { label: "Rating", value: rating !== "—" ? `${rating} / 5.0` : "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(184,154,90,0.07)",
                    border: "1px solid #d8b87a",
                    borderRadius: 3,
                    padding: "10px 18px",
                    textAlign: "center",
                    minWidth: 76,
                  }}
                >
                  <span style={{
                    display: "block",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#7a5510",
                    lineHeight: 1,
                    marginBottom: 5,
                  }}>
                    {s.value}
                  </span>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "#9a8a6a",
                    textTransform: "uppercase",
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Thin divider */}
            <div style={{ borderTop: "0.5px solid #d8b87a", margin: "0 0 22px" }} />

            {/* Footer: signatures + seal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>

              {/* Sig left */}
              <SignatureBlock name="Dr. Amanda Chen" role="Director of Education" />

              {/* Seal centre */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Seal />
              </div>

              {/* Sig right */}
              <SignatureBlock name="James Tan" role="Platform Director" />
            </div>

            {/* Date + cert number */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 11,
              color: "#9a8a6a",
              textAlign: "center",
              letterSpacing: "0.1em",
              margin: "18px 0 0",
            }}>
              Issued on {issuedDate}&nbsp;&nbsp;·&nbsp;&nbsp;Certificate No. {certNumber}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <svg style={{ flex: 1 }} height="14" viewBox="0 0 240 14" preserveAspectRatio="none">
        <line x1="0" y1="7" x2="215" y2="7" stroke="#c8a84a" strokeWidth="0.8" />
        <polygon points="218,7 228,3 238,7 228,11" fill="#c8a84a" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <polygon
          points="11,1 13.2,7.8 20.5,7.8 14.6,12 16.8,18.8 11,14.6 5.2,18.8 7.4,12 1.5,7.8 8.8,7.8"
          fill="none"
          stroke="#c8a84a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <svg style={{ flex: 1, transform: "scaleX(-1)" }} height="14" viewBox="0 0 240 14" preserveAspectRatio="none">
        <line x1="0" y1="7" x2="215" y2="7" stroke="#c8a84a" strokeWidth="0.8" />
        <polygon points="218,7 228,3 238,7 228,11" fill="#c8a84a" />
      </svg>
    </div>
  );
}

function SignatureBlock({ name, role }: { name: string; role: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      {/* Simulated handwritten signature using SVG */}
      <svg width="110" height="32" viewBox="0 0 110 32" style={{ display: "block", margin: "0 auto 4px" }}>
        <path
          d={
            name.includes("Amanda")
              ? "M10,24 C20,8 28,6 36,16 C42,24 48,10 56,14 C64,18 68,8 78,12 C88,16 92,10 102,18"
              : "M8,22 C16,10 22,8 30,18 C36,26 44,8 54,12 C62,16 68,10 80,16 C90,22 96,8 104,16"
          }
          fill="none"
          stroke="#4a3820"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
      <div style={{ width: 120, height: 1, background: "#c8a84a", margin: "0 auto 6px" }} />
      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 13,
        fontWeight: 600,
        color: "#4a3820",
        margin: "0 0 2px",
      }}>
        {name}
      </p>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 10,
        letterSpacing: "0.1em",
        color: "#9a8a6a",
        textTransform: "uppercase",
        margin: 0,
      }}>
        {role}
      </p>
    </div>
  );
}

function Seal() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="rgba(184,154,90,0.06)" stroke="#c8a84a" strokeWidth="1" />
      <circle cx="40" cy="40" r="30" fill="none" stroke="#c8a84a" strokeWidth="0.5" />
      {/* Star */}
      <polygon
        points="40,18 43.8,30.2 57,30.2 46.6,37.8 50.4,50 40,42.4 29.6,50 33.4,37.8 23,30.2 36.2,30.2"
        fill="none"
        stroke="#c8a84a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Circular text */}
      <defs>
        <path id="sc" d="M40,40 m-25,0 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0" />
      </defs>
      <text fontSize="5" letterSpacing="2.2" fill="#b89a5a" fontFamily="'Cinzel', serif">
        <textPath href="#sc" startOffset="6%">TUTORLINK · CERTIFIED · EXCELLENCE ·</textPath>
      </text>
    </svg>
  );
}