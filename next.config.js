/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async serverOptions() {
    return {
      port: 3001, // You can change this to any port you prefer
    }
  }
};

module.exports = nextConfig;