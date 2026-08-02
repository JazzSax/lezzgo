import "./globals.css";

export const metadata = {
  title: "Lezzgo — plan trips together",
  description:
    "Create day-by-day travel routes on an interactive map and share them with friends.",
  icons: { icon: "/lezzgo_logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
