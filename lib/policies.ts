// ---------------------------------------------------------------
// STOREFRONT POLICY PAGES — PLACEHOLDERS ONLY.
// Every store shows these until its own policies are written with its
// own adviser. They describe what each page must cover; they are not
// legal text and do not claim compliance with any law. Replace the
// `sections` text per client before launch.
// ---------------------------------------------------------------

export type PolicyId = "privacy" | "terms" | "delivery" | "returns";

export interface Policy {
  id: PolicyId;
  href: string;
  title: string;
  /** "{store}" is replaced with the store's name. */
  sections: string[];
}

export const POLICIES: Policy[] = [
  {
    id: "privacy",
    href: "/privacy",
    title: "Privacy policy",
    sections: [
      "This page will explain how {store} collects and uses personal information — for example the name, email, phone number and delivery address given at checkout or in the contact form.",
      "It should say why the information is needed, who it is shared with (such as delivery companies), how long it is kept, and how a customer can ask to see, correct or delete it.",
    ],
  },
  {
    id: "terms",
    href: "/terms",
    title: "Terms and conditions",
    sections: [
      "This page will set out the terms on which {store} sells its products: ordering, prices and currency, payment (cash on delivery or bank transfer), cancellations, and who to contact with a complaint.",
    ],
  },
  {
    id: "delivery",
    href: "/delivery",
    title: "Delivery information",
    sections: [
      "This page will explain where {store} delivers, how long delivery usually takes, and how delivery fees work. The delivery fee for an order is shown at checkout before it is placed.",
    ],
  },
  {
    id: "returns",
    href: "/returns",
    title: "Returns and refunds",
    sections: [
      "This page will explain whether and when products can be returned or exchanged, the condition they must be in, how refunds are paid, and how long they take.",
    ],
  },
];

export const PLACEHOLDER_NOTICE =
  "Placeholder: {store} has not published this policy yet. The text below only describes what the page will cover and is not a legal document.";

export function policyText(text: string, storeName: string) {
  return text.replaceAll("{store}", storeName);
}

export function findPolicy(id: PolicyId): Policy {
  return POLICIES.find((policy) => policy.id === id)!;
}
