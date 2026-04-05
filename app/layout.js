import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata = {
  title: "인스타그램 월간 성과 대시보드",
  description: "마케터 전용 인스타그램 데이터 분석 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${dmSans.variable} ${dmMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
