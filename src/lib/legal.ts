// Centralised legal copy for self-employed traffic-management operatives.
// Bump AGREEMENTS_VERSION whenever any document below is materially changed —
// the value is stored against each worker profile at signup.

export const COMPANY_NAME = "Light Work Live Ltd";
export const AGREEMENTS_VERSION = "2026-05-v1";

export type LegalDoc = {
  slug: string;
  title: string;
  short: string;
  sections: { heading: string; body: string }[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "operative-agreement",
    title: "Self-Employed Traffic Management Operative Agreement",
    short:
      "General terms & conditions covering engagement, conduct, PPE, RAMS, payment, insurance and termination.",
    sections: [
      {
        heading: "1. Status",
        body: `You are engaged by ${COMPANY_NAME} ("the Company") on a self-employed basis under the Construction Industry Scheme (CIS). Nothing in this agreement creates a contract of employment. You are responsible for your own income tax, National Insurance and VAT (where applicable) and must hold a valid UTR.`,
      },
      {
        heading: "2. Right to Work & Documents",
        body: "Prior to your first shift you must provide: proof of right to work in the UK, valid CSCS card, all relevant NHSS 12A/B / 12D / Lantra / TTMBC qualifications, photo ID, UTR, proof of public liability insurance (or opt into the Company scheme), and bank details. Expired or revoked tickets must be reported within 24 hours.",
      },
      {
        heading: "3. Acceptance of Work",
        body: "Shifts are offered on a non-exclusive basis. You are free to accept or decline any shift. Once accepted, you must attend on time, in full PPE, fit for work, and remain on site for the agreed duration. Late cancellation (<12 hours) or failure to attend may result in a chargeback of any client penalty.",
      },
      {
        heading: "4. On-Site Conduct & PPE",
        body: "You must wear full Class 2 hi-vis (jacket & trousers), safety boots, hard hat, gloves and eye protection at all times on site. You must comply with the site-specific RAMS, the client's site rules, all signage, and all instructions from the site supervisor or works manager. Aggressive, abusive or discriminatory behaviour is a gross breach.",
      },
      {
        heading: "5. Safe Systems of Work",
        body: "All works must be carried out in accordance with Chapter 8 of the Traffic Signs Manual, the NHSS scheme applicable to the site, and the approved Traffic Management Plan. You must not deviate from the signed RAMS without written approval. You must complete an on-site dynamic risk assessment at the start of every shift and stop work immediately if conditions become unsafe.",
      },
      {
        heading: "6. Reporting & Photos",
        body: "You must use the Light Work Live app to start your shift, share live location for the duration, upload hourly site photos, and end your shift at handover. Failure to provide hourly photos or location may result in non-payment for the affected hours.",
      },
      {
        heading: "7. Payment",
        body: "Hours are paid at the agreed rate, less the standard 20% CIS deduction (or 30% if unverified). Invoices are generated weekly by the platform on your behalf and paid within 7 days of period end, subject to receipt of all required photos, signed timesheets and any client sign-off.",
      },
      {
        heading: "8. Insurance",
        body: "You must hold (or opt into the Company scheme for) public liability insurance of at least £5,000,000. You indemnify the Company against any loss arising from your negligence, breach of site rules, or wilful misconduct.",
      },
      {
        heading: "9. Confidentiality & Data",
        body: "Client site details, plans, drawings and personnel information are confidential. You must not post site photos, locations or client names on social media. Personal data is processed under the Company's Privacy Notice in line with UK GDPR.",
      },
      {
        heading: "10. Termination",
        body: "Either party may terminate this engagement at any time on written notice. The Company may terminate immediately for: a positive drug or alcohol test, breach of safety rules, theft, falsification of timesheets/photos, loss of right to work, or any conduct bringing the Company into disrepute.",
      },
      {
        heading: "11. Governing Law",
        body: "This agreement is governed by the laws of England and Wales and subject to the exclusive jurisdiction of the English courts.",
      },
    ],
  },
  {
    slug: "vehicle-policy",
    title: "Vehicle Use Policy — Company & Client Vehicles",
    short:
      "Rules for driving Company or client-supplied vehicles, including licences, inspections, fuel, damage and tolls.",
    sections: [
      {
        heading: "1. Licence & Eligibility",
        body: "You must hold a valid UK (or recognised) driving licence for the category of vehicle you are operating (B, BE, C1, C, CE, D1 or D as required) and have declared all endorsements. Licences are checked via the DVLA share-code at engagement and at least every 6 months. You must notify the Company within 24 hours of any new endorsement, ban, medical condition, or licence change.",
      },
      {
        heading: "2. Pre-Use Inspection",
        body: "Before driving any Company or client vehicle you must complete the daily walk-round check (tyres, lights, fluids, beacons, load security, defects). Defects must be logged in the vehicle book and reported to the transport manager before use. Driving a vehicle with a known defect is prohibited.",
      },
      {
        heading: "3. Driving Standards",
        body: "You must obey all traffic laws, speed limits and site speed limits. No use of mobile phones whilst driving (hands-free for work calls only). No passengers other than authorised operatives. Seatbelts must be worn by all occupants at all times.",
      },
      {
        heading: "4. Drivers' Hours",
        body: "Where the Working Time (Road Transport) Regulations or EU/GB drivers' hours rules apply, you must comply with all daily, weekly and fortnightly limits and take all required breaks and rest periods. Tachograph cards must be used correctly; manual entries must be accurate.",
      },
      {
        heading: "5. Fuel, Tolls & Charges",
        body: "Fuel cards are for the assigned vehicle only and must not be used for personal use. Congestion Charge, ULEZ, Dart Charge and toll fees incurred during legitimate work travel are reimbursed; PCNs, speeding fines and parking fines are the responsibility of the driver and will be deducted from the next invoice.",
      },
      {
        heading: "6. Accidents & Damage",
        body: "Any accident, damage (however minor), or third-party incident must be reported immediately to the duty manager and recorded with photos, location, and details of any other party. Failure to report damage will result in the full cost of repair being deducted and may lead to termination.",
      },
      {
        heading: "7. Personal Use",
        body: "Company and client vehicles are for work use only. They must not be taken home without written authorisation and must not be used to transport non-work passengers or goods.",
      },
      {
        heading: "8. Client Vehicles",
        body: "When operating a client-supplied vehicle you must additionally comply with the client's vehicle policy, induction and any site-specific restrictions (e.g. banksman required, reversing rules, speed limits).",
      },
    ],
  },
  {
    slug: "drug-alcohol-policy",
    title: "Drugs & Alcohol Policy (Including Random Site Testing)",
    short:
      "Zero-tolerance substance policy with for-cause and random drug & alcohol testing on Company and client sites.",
    sections: [
      {
        heading: "1. Zero Tolerance",
        body: "Traffic management is a safety-critical activity. You must not attend site, drive any vehicle, or operate any equipment whilst under the influence of alcohol, illegal drugs, psychoactive substances, or any prescription/over-the-counter medication that may impair your ability to work safely.",
      },
      {
        heading: "2. Limits",
        body: "The Company applies the lower Scottish drink-drive limit as the workplace limit: 22 µg of alcohol per 100 ml of breath (equivalent to 50 mg per 100 ml of blood). The threshold for all controlled drugs is the manufacturer's cut-off for a non-negative oral fluid test.",
      },
      {
        heading: "3. Testing Programme",
        body: "By signing this policy you consent to drug and alcohol testing in any of the following circumstances: (a) pre-engagement, (b) randomly during any shift on Company or client sites (selection by independent third party), (c) for-cause where a supervisor has reasonable grounds to suspect impairment, (d) after any accident, near-miss, or dangerous occurrence, and (e) where required by the client's site induction (e.g. Network Rail, National Highways, HS2, TfL).",
      },
      {
        heading: "4. Procedure",
        body: "Testing is carried out by a UKAS-accredited provider using oral fluid (saliva) screening with laboratory confirmation of any non-negative result. You may request a B-sample analysis at your own cost. Refusal to test, tampering with a sample, or failure to attend a scheduled test is treated as a positive result.",
      },
      {
        heading: "5. Consequences",
        body: "A confirmed positive test, refusal, or tampering will result in immediate removal from site, suspension of all shift offers, and termination of engagement. The Company will notify relevant clients and scheme operators (e.g. Sentinel) where required. You will be liable for the cost of the confirmation test.",
      },
      {
        heading: "6. Prescription Medication",
        body: "If you are prescribed any medication that carries a 'do not drive or operate machinery' warning you must inform the duty manager before your next shift. The Company will work with you to find suitable alternative duties where reasonably practicable.",
      },
      {
        heading: "7. Support",
        body: "Operatives who voluntarily disclose a substance-misuse problem before being selected for a test will be supported to access confidential help via the Construction Industry Helpline (0345 605 1956) and will not, in themselves, face disciplinary action for the disclosure.",
      },
    ],
  },
  {
    slug: "working-time-optout",
    title: "Working Time Regulations 1998 — 48-Hour Opt-Out",
    short:
      "Voluntary individual opt-out from the average 48-hour weekly working limit. You may withdraw on 3 months' written notice.",
    sections: [
      {
        heading: "1. The Right",
        body: "Regulation 4(1) of the Working Time Regulations 1998 limits average weekly working time to 48 hours, calculated over a 17-week reference period. Regulation 5 permits a worker to agree in writing that this limit shall not apply to them.",
      },
      {
        heading: "2. Your Opt-Out",
        body: "By ticking the opt-out box at signup you agree, voluntarily and in writing, that the 48-hour average weekly working limit shall not apply to you. You confirm that no pressure has been placed on you to sign and that you understand you are free not to sign.",
      },
      {
        heading: "3. Other Protections Still Apply",
        body: "This opt-out does NOT remove your other rights under the Regulations, which continue to apply in full: minimum 11 hours' daily rest, minimum 24 hours' weekly rest, a 20-minute break in any shift over 6 hours, paid annual leave (where applicable), and the night-workers' 8-hour average limit.",
      },
      {
        heading: "4. Withdrawal",
        body: "You may withdraw this opt-out at any time by giving the Company 3 months' written notice (or such shorter period as may be agreed in writing). On expiry of the notice the 48-hour average limit will apply to you and shift offers will be adjusted accordingly.",
      },
      {
        heading: "5. No Detriment",
        body: "You will not be subjected to any detriment, dismissal or reduction in shift offers for refusing to sign, or for withdrawing, this opt-out.",
      },
    ],
  },
];

export function getLegalDoc(slug: string) {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

export const COPYRIGHT = `© ${new Date().getFullYear()} Light Work Live Ltd. All rights reserved.`;
