import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Conquest of Etheria",
  description: "Privacy policy for Conquest of Etheria, a real-time multiplayer strategy game.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-stone-800">
      <h1 className="mb-2 font-serif text-4xl font-bold text-stone-900">Privacy Policy</h1>
      <p className="mb-10 text-sm text-stone-500">Last updated: June 2026</p>

      <Section title="1. Information We Collect">
        <p>When you use Conquest of Etheria, we collect:</p>
        <ul>
          <li><strong>Account data:</strong> email address and username, used for authentication and in-game identity.</li>
          <li><strong>Game progress:</strong> buildings, troops, resources, technologies, alliances, and other in-game state.</li>
          <li><strong>Usage data:</strong> game actions, timestamps, and interactions stored to run the game correctly.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul>
          <li>To create and manage your account.</li>
          <li>To save and synchronize your game progress across devices.</li>
          <li>To display your in-game name and alliance to other players as part of normal gameplay.</li>
          <li>To send push notifications about game events (optional — can be disabled in your device settings).</li>
        </ul>
      </Section>

      <Section title="3. Data Sharing">
        <p>
          We do not sell your personal data. We do not share your data with third parties except as required by law.
          Your in-game name and alliance are visible to other players as part of normal gameplay.
        </p>
      </Section>

      <Section title="4. Push Notifications">
        <p>
          We use Firebase Cloud Messaging (FCM) to send push notifications about game events.
          You can disable notifications at any time in your device settings or in the game's settings panel.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <p>
          Your account data is retained as long as your account exists.
          You can request account deletion by contacting us at the email address below.
          Upon deletion, your data is permanently removed within 30 days.
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          All data is transmitted over HTTPS. Passwords are hashed using industry-standard algorithms
          and never stored in plain text. We regularly review our security practices.
        </p>
      </Section>

      <Section title="7. Children's Privacy">
        <p>
          Conquest of Etheria is rated E10+ and is not directed at children under 13.
          We do not knowingly collect personal data from children under 13.
          If you believe a child under 13 has provided us with data, please contact us immediately.
        </p>
      </Section>

      <Section title="8. Contact Us">
        <p>
          For questions, data access requests, or account deletion:
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a href="mailto:elbardelorencia990@gmail.com" className="text-amber-700 underline">
            elbardelorencia990@gmail.com
          </a>
          <br />
          <strong>Website:</strong>{" "}
          <a href="https://conquestofetheria.com" className="text-amber-700 underline">
            conquestofetheria.com
          </a>
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this privacy policy from time to time.
          Changes will be posted at{" "}
          <a href="https://conquestofetheria.com/privacy" className="text-amber-700 underline">
            conquestofetheria.com/privacy
          </a>{" "}
          with an updated date. Continued use of the app after changes constitutes acceptance.
        </p>
      </Section>

      <p className="mt-12 text-center text-sm text-stone-400">
        Esta política también está disponible en español a pedido.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-serif text-xl font-semibold text-stone-900">{title}</h2>
      <div className="space-y-2 text-stone-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
