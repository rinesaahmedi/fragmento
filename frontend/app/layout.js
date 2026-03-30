import "./globals.css";

export const metadata = {
  title: "Fragmento Kitchen Configurator",
  description: "Next.js frontend for the Fragmento kitchen configurator.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
