/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow OAuth provider avatar hosts (Google, Facebook, Apple relay, etc.)
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "*.xx.fbcdn.net" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
