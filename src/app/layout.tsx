import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AstraAI · 나의 학습실",
  description:
    "학습팩으로 개념을 익히고, 문제를 풀고, 다시 복습하는 개인 학습실. 로컬 개발 데모.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
