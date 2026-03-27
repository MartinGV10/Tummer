import Link from 'next/link'
import type { Metadata } from 'next'
import Nav from '../Nav'
import Footer from '../Footer'

export const metadata: Metadata = {
  title: 'Terms of Service | Tummer',
  description: 'Read the terms that govern access to and use of Tummer.',
}

const sections = [
  {
    title: 'Using Tummer',
    items: [
      'You may use Tummer only in compliance with applicable law and these Terms.',
      'You are responsible for the accuracy of information you submit and for activity that occurs under your account.',
      'You may not use Tummer to interfere with the service, access data you do not have permission to access, or post unlawful, abusive, threatening, deceptive, or infringing content.',
    ],
  },
  {
    title: 'Health Disclaimer',
    items: [
      'Tummer is not a medical provider and does not provide medical advice, diagnosis, or treatment.',
      'Content, tracking outputs, trends, summaries, community posts, and support materials are for informational and self-management purposes only.',
      'You should seek qualified medical guidance for diagnosis, treatment decisions, emergencies, medication questions, or any issue requiring professional care.',
    ],
  },
  {
    title: 'Community Rules',
    items: [
      'You remain responsible for community posts, comments, replies, and other content you submit.',
      "Do not post content that is defamatory, harassing, hateful, sexually explicit, unlawful, misleading, or invasive of another person's privacy.",
      'We may remove content or suspend access if we believe behavior creates risk for users, violates these Terms, or harms the integrity of the service.',
    ],
  },
  {
    title: 'Privacy and Health Data',
    items: [
      'Our handling of personal and health-related information is described in the Privacy Policy.',
      'Tummer is currently structured as a direct-to-consumer app, and HIPAA may not apply unless Tummer is operating as, or on behalf of, a HIPAA covered entity or business associate in a way that triggers HIPAA obligations.',
      'If Tummer later contracts with HIPAA-regulated organizations, separate compliance terms or agreements may apply.',
    ],
  },
  {
    title: 'Account Termination',
    items: [
      'You may stop using Tummer at any time.',
      'We may suspend or terminate access if you violate these Terms, create legal or security risk, or misuse the service.',
      'Sections that reasonably should survive termination, including disclaimers, limitations of liability, indemnity, and dispute provisions, will survive.',
    ],
  },
  {
    title: 'Intellectual Property',
    items: [
      'Tummer, including its design, branding, software, and non-user-generated content, is owned by Tummer or its licensors and protected by applicable law.',
      'You retain rights in content you submit, but you grant Tummer a non-exclusive license to host, store, display, reproduce, and process that content as needed to operate and improve the service.',
    ],
  },
  {
    title: 'Disclaimers and Liability Limits',
    items: [
      'Tummer is provided on an as-is and as-available basis to the fullest extent permitted by law.',
      'We do not guarantee uninterrupted service, complete accuracy, or that the service will meet every need or be error-free.',
      'To the fullest extent permitted by law, Tummer and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or business interruption.',
    ],
  },
  {
    title: 'Changes to These Terms',
    items: [
      'We may revise these Terms from time to time. Continued use of Tummer after revised Terms become effective means you accept the updated Terms.',
    ],
  },
]

export default function TermsPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Legal</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600">Effective date: March 27, 2026</p>
          <p className="mt-5 text-sm leading-7 text-gray-700">
            These Terms of Service govern your access to and use of Tummer. By creating an account or using the
            service, you agree to these Terms.
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-gray-700">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-2xl border border-green-100 bg-green-50/40 px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
            These Terms are a product-ready draft, not a substitute for legal advice. A licensed attorney should review
            them before launch, especially if paid plans, provider partnerships, advertising, or formal HIPAA workflows
            are added.
          </section>

          <section className="mt-8 border-t border-green-100 pt-6 text-sm leading-7 text-gray-700">
            <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
            <p className="mt-3">
              Questions about these Terms can be sent to{' '}
              <a className="font-medium text-green-700 hover:text-green-800" href="mailto:martinganen10@gmail.com">
                martinganen10@gmail.com
              </a>
              .
            </p>
            <p className="mt-4">
              You can also review our{' '}
              <Link className="font-medium text-green-700 hover:text-green-800" href="/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
