import { ArrowLeft, LockKeyhole, Mail, Scale, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

const updated = "10 August 2026"

export default function LegalNotice({ type = "privacy" }) {
  const privacy = type === "privacy"
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200 md:py-14">
    <main className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white text-slate-700 shadow-2xl">
      <header className="bg-gradient-to-br from-slate-950 to-cyan-950 px-6 py-8 text-white md:px-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-200"><ArrowLeft size={16}/> Return to sign in</Link>
        <div className="flex items-center gap-4"><span className="rounded-2xl bg-white/10 p-3">{privacy ? <ShieldCheck/> : <Scale/>}</span><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">UNYRA · KodeIQ</p><h1 className="text-3xl font-black md:text-4xl">{privacy ? "Privacy & POPIA Notice" : "Platform Terms"}</h1></div></div>
        <p className="mt-4 text-sm text-slate-300">Effective and last updated: {updated}</p>
      </header>
      <article className="space-y-7 px-6 py-8 leading-7 md:px-10">
        {privacy ? <Privacy/> : <Terms/>}
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Mail size={18}/> Contact</h2>
          <p>Support: <a className="font-bold text-cyan-800 underline" href="mailto:support@kodeiq.online">support@kodeiq.online</a></p>
          <p>Privacy requests: <a className="font-bold text-cyan-800 underline" href="mailto:privacy@kodeiq.online">privacy@kodeiq.online</a></p>
        </section>
      </article>
      <footer className="flex flex-wrap gap-4 border-t border-slate-200 px-6 py-5 text-sm font-bold md:px-10"><Link className="text-cyan-700" to="/privacy">Privacy & POPIA</Link><Link className="text-cyan-700" to="/terms">Terms</Link><a className="text-cyan-700" href="mailto:support@kodeiq.online">Support</a></footer>
    </main>
  </div>
}

function Section({ title, children }) { return <section><h2 className="mb-2 text-xl font-black text-slate-950">{title}</h2><div className="space-y-2">{children}</div></section> }

function Privacy() {
  return <>
    <p>UNYRA is a sports-club management platform operated by KodeIQ. This notice explains how personal information is handled in accordance with South Africa's Protection of Personal Information Act, 2013 (POPIA).</p>
    <Section title="1. Who is responsible"><p>The club that registers its members and staff is generally the responsible party for club, player, guardian, attendance, health and team information. KodeIQ operates UNYRA on the club's instructions and is responsible for platform account, security, support and service-administration information under its control.</p></Section>
    <Section title="2. Information we process"><p>Account and contact details; club, team and role assignments; player and guardian relationships; attendance and availability; fixtures and performance records; injury, medical and emergency-contact information; communications; consent records; audit and security logs; and technical information needed to operate the service.</p></Section>
    <Section title="3. Why we process it"><p>To authenticate users, administer clubs and teams, coordinate fixtures and attendance, support safeguarding and emergency response, communicate with members, provide support, secure the platform, meet legal obligations and improve the service.</p></Section>
    <Section title="4. Children and special personal information"><p>Clubs must obtain consent from a parent, guardian or other competent person before entering a child's personal information, unless another lawful ground applies. Health, injury and emergency information must be limited to what is necessary and accessed only by authorised people.</p></Section>
    <Section title="5. Sharing and storage"><p>Information is shared only with authorised club personnel, linked guardians and players according to their roles, and with service providers needed to host and secure UNYRA. Firebase and Google Cloud are used for authentication, database, storage and hosting. Information may be processed outside South Africa with appropriate contractual and security safeguards.</p></Section>
    <Section title="6. Retention and security"><p>Information is retained only while needed for club operations, legal obligations, disputes or legitimate records. UNYRA uses authenticated access, role-based permissions, encrypted transport, audit records and restricted administrative tools. No system can guarantee absolute security.</p></Section>
    <Section title="7. Your rights"><p>You may request access to or correction or deletion of your information, object to processing, withdraw consent where consent is the basis, or complain to the Information Regulator of South Africa. Requests may be subject to identity verification and legal retention duties.</p></Section>
    <Section title="8. Your responsibilities"><p>Provide accurate information, protect your password, use only accounts assigned to you, report suspected misuse promptly and do not enter information that the club is not authorised to process.</p></Section>
  </>
}

function Terms() {
  return <>
    <p>These basic terms apply to use of the UNYRA demonstration and club-management platform. By signing in, you agree to use the service lawfully and only for authorised club activities.</p>
    <Section title="1. Accounts and access"><p>Accounts are personal and may not be shared. Users must keep credentials secure and notify support of suspected unauthorised access. Access depends on the role assigned by the club or platform administrator.</p></Section>
    <Section title="2. Acceptable use"><p>Do not upload unlawful, harmful, misleading or unauthorised information; attempt to bypass security; access another club's information; interfere with the service; or use member information outside legitimate club purposes.</p></Section>
    <Section title="3. Club responsibilities"><p>Clubs are responsible for the accuracy and lawfulness of information they enter, obtaining required consents, assigning suitable roles, responding to member requests and ensuring staff use the platform appropriately.</p></Section>
    <Section title="4. Availability and changes"><p>UNYRA may be updated, suspended for maintenance or changed as the platform develops. Demonstration features may be incomplete and should not be relied on for emergency, medical or safety-critical decisions without independent confirmation.</p></Section>
    <Section title="5. Content and intellectual property"><p>Clubs retain rights in their submitted information. KodeIQ retains rights in the UNYRA platform, design, software and documentation. Users grant only the permissions required to operate and support the service.</p></Section>
    <Section title="6. Liability"><p>To the extent permitted by law, UNYRA is provided without guarantees of uninterrupted or error-free operation. Neither KodeIQ nor the club excludes liability that cannot lawfully be excluded.</p></Section>
    <Section title="7. Suspension and termination"><p>Access may be suspended for security risks, misuse, legal requirements or termination of the club's service. Data handling on termination remains subject to POPIA, retention duties and the applicable club agreement.</p></Section>
    <Section title="8. Governing law"><p>These terms are governed by the laws of the Republic of South Africa. Commercial use should also be governed by a written agreement between KodeIQ and the participating club.</p></Section>
  </>
}
