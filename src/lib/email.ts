import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendApprovalEmail(email: string, name?: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "✅ Your TutorLink account has been verified",
    html: `
      <p>Hi ${name ?? "there"},</p>
      <p>Your TutorLink account has been <strong>successfully verified</strong>.</p>
      <p>You now have full access to all features.</p>
      <br />
      <p>Welcome aboard,<br/>TutorLink Team</p>
    `,
  });
}

export async function sendRejectionEmail(email: string, reason?: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "⚠️ TutorLink verification update",
    html: `
      <p>Hello,</p>
      <p>Your TutorLink verification was <strong>not approved</strong>.</p>
      ${
        reason
          ? `<p><strong>Reason:</strong> ${reason}</p>`
          : ""
      }
      <p>You may re-upload your matric card or contact support.</p>
      <br />
      <p>TutorLink Admin</p>
    `,
  });
}
