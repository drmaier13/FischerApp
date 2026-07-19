import "./globals.css";

export const metadata = {
  title: "Fischerprüfung Bayern 2026",
  description: "Mit allen offiziellen Prüfungsfragen für die Fischerprüfung in Bayern lernen.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
