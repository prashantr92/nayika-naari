import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'Nayika Naari - Wholesale B2B Store',
  description: 'Shop the best quality fashion products at true wholesale prices. Exclusive deals and fast delivery.',
  manifest: "/manifest.json", // 🌟 CORRECTED: Root level par aur spelling sahi hai
  openGraph: {
    title: 'Nayika Naari - Wholesale B2B Store',
    description: 'Shop the best quality fashion products at true wholesale prices directly from Nayika Naari.',
    url: 'https://nayikanaari.vercel.app',
    siteName: 'Nayika Naari',
    images: [
      {
        url: '/logo.png', // 🌟 Make sure public folder me logo.png ho
        width: 800,
        height: 600,
        alt: 'Nayika Naari Preview',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
}

// Zoom bondho kora ebong native keyboard UX er jonno viewport set kora holo
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#eaebed] min-h-screen flex justify-center`}>
        <main className="w-full max-w-[450px] bg-white min-h-screen shadow-[0_0_60px_rgba(0,0,0,0.15)] relative overflow-x-hidden border-x border-gray-200">
          {children}
        </main>
      </body>
    </html>
  );
}