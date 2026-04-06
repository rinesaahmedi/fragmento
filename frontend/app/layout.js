import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Fragmento Kitchen Configurator",
  description: "Next.js frontend for the Fragmento kitchen configurator.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
