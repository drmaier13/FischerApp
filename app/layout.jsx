import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://angelschule.bayern/app/"),
  title: "Angelschule Bayern - PrüfungsApp",
  description: "Mit allen offiziellen Prüfungsfragen für die Fischerprüfung in Bayern lernen.",
  openGraph: {
    title: "Angelschule Bayern – PrüfungsApp",
    description: "Mit System lernen. Sicher bestehen. Offizielle Fragen, Erklärungen und Prüfungssimulationen.",
    type: "website",
    locale: "de_DE",
    images: [{ url: "og.png", width: 1792, height: 896, alt: "Angelschule Bayern – PrüfungsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Angelschule Bayern – PrüfungsApp",
    description: "Mit System lernen. Sicher bestehen.",
    images: ["og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
