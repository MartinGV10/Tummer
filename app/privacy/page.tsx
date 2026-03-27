import Link from 'next/link'
import type { Metadata } from 'next'
import Nav from '../Nav'
import Footer from '../Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | Tummer',
  description: 'Learn how Tummer collects, uses, stores, and protects personal and health-related information.',
}

const sections = [
  {
    title: 'Information We Collect',
    items: [
      'Account and profile information, such as your email address, password credentials handled by Supabase Auth, first and last name, username, avatar, selected condition, gender, and stated reason for using the app.',
      'Health and wellness information you choose to log, including meals, meal items, food reactions, symptoms, bowel entries, daily log details, medication changes, hydration, sleep, energy, stress, weight, flare data, notes, and related timestamps.',
      'Community content you choose to share, such as posts, comments, likes, and condition tags associated with community activity.',
      'Basic technical and service information needed to operate the app, such as authentication session data, database record metadata, and storage references for uploaded profile images.',
    ],
  },
  {
    title: 'How We Use Information',
    items: [
      'Provide the core Tummer experience, including account access, profile management, symptom and meal tracking, and community features.',
      'Personalize the app based on the information you enter, such as your selected condition and logged trends.',
      'Maintain account security, support password resets, troubleshoot errors, and keep the product functioning.',
      'Improve features, safety, and reliability. If we use information for analytics, product improvement, or research, we will aim to use aggregated or de-identified data where reasonably possible.',
    ],
  },
  {
    title: 'When Information May Be Shared',
    items: [
      'With service providers that help us operate the app, such as hosting, authentication, database, and storage vendors, subject to contractual or operational controls.',
      'With other users when you intentionally post in community spaces. Your username, avatar, posts, comments, and related engagement may be visible to other users.',
      'If required by law, regulation, legal process, or to protect rights, safety, security, or the integrity of the service.',
      'As part of a business transfer such as a merger, acquisition, financing, or sale of assets, subject to applicable law.',
    ],
  },
  {
    title: 'Health Information and HIPAA',
    items: [
      'Tummer is a consumer health-tracking product. Based on the product flow currently implemented, Tummer appears to collect health-related information directly from users rather than on behalf of a hospital, health plan, or other HIPAA covered entity.',
      'HIPAA generally applies to covered entities and their business associates. If Tummer is not acting as a covered entity or business associate for a covered entity, HIPAA may not apply to all data processed in the app even though the information may be sensitive health information.',
      'Even where HIPAA does not apply, we treat health-related information as sensitive and aim to protect it with reasonable administrative, technical, and organizational safeguards.',
      'If Tummer later provides services to a HIPAA covered entity or receives protected health information on behalf of one, additional HIPAA obligations, including a business associate agreement where required, may apply.',
    ],
  },
  {
    title: 'Security',
    items: [
      'We use reasonable safeguards designed to protect personal and health-related information from unauthorized access, loss, misuse, or disclosure.',
      'No method of storage or transmission is completely secure, so we cannot guarantee absolute security.',
      'You are responsible for maintaining the confidentiality of your login credentials and for notifying us if you believe your account has been compromised.',
    ],
  },
  {
    title: 'Security Incidents',
    items: [
      'If we become aware of a breach involving personal or health-related information, we will investigate, mitigate, and provide any notices required by applicable law.',
      'Depending on the nature of the service and the data involved, this may include obligations under consumer privacy, breach-notification, or health-data laws that can apply even when HIPAA does not.',
    ],
  },
  {
    title: 'Data Retention',
    items: [
      'We retain information for as long as needed to provide the service, maintain your account, comply with legal obligations, resolve disputes, and enforce our agreements.',
      'Community content and health logs may remain in backups or archival systems for a limited period after deletion requests, where reasonably necessary for security, continuity, or legal compliance.',
    ],
  },
  {
    title: 'Your Choices and Rights',
    items: [
      'You may update certain profile information within the app.',
      'You may request password resets and may be able to request account-related changes by contacting us.',
      'Depending on where you live, you may have rights to access, correct, delete, or receive a copy of personal information, or to appeal a privacy decision, subject to applicable law and exceptions.',
    ],
  },
  {
    title: 'Children',
    items: [
      'Tummer is not intended for children under 13, and we do not knowingly collect personal information from children under 13 without appropriate authorization.',
      'If you believe a child has provided personal information to us, contact us so we can review and take appropriate action.',
    ],
  },
  {
    title: 'Changes to This Policy',
    items: [
      'We may update this Privacy Policy from time to time. If we make material changes, we may update the effective date and provide additional notice where appropriate.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 px-4 py-10 md:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-green-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Legal</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Effective date: March 27, 2026</p>
          <p className="mt-5 text-sm leading-7 text-gray-700">
            This Privacy Policy explains how Tummer collects, uses, stores, and shares information when you use the
            service. Tummer is designed to help users track digestive-health-related patterns, meals, symptoms, and
            community activity. By using Tummer, you agree to the practices described in this Policy.
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
            Because privacy and health-data rules can depend on how a product is offered, this Policy should be reviewed
            by qualified counsel before production launch, especially if Tummer will be marketed to providers, plans, or
            other HIPAA-regulated organizations.
          </section>

          <section className="mt-8 border-t border-green-100 pt-6 text-sm leading-7 text-gray-700">
            <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
            <p className="mt-3">
              Questions about this Privacy Policy can be sent to{' '}
              <a className="font-medium text-green-700 hover:text-green-800" href="mailto:martinganen10@gmail.com">
                martinganen10@gmail.com
              </a>
              .
            </p>
            <p className="mt-4">
              You can also review our{' '}
              <Link className="font-medium text-green-700 hover:text-green-800" href="/terms">
                Terms of Service
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
