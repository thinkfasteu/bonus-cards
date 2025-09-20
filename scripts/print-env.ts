import 'dotenv/config';

function maskUrl(url: string | undefined): string {
  if (!url) return 'undefined';
  
  // Mask everything between :// and @
  return url.replace(/(postgresql:\/\/)([^@]+)(@.+)/, '$1***$3');
}

console.log('=== Environment Verification ===');
console.log('DATABASE_URL (masked):', maskUrl(process.env.DATABASE_URL));

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  
  // Extract host and port
  const hostMatch = url.match(/@([^:]+):(\d+)/);
  if (hostMatch) {
    const [, host, port] = hostMatch;
    console.log('Host:', host);
    console.log('Port:', port);
    console.log('Is Session pooler?', host.includes('pooler.supabase.com') && port === '6543');
  }
  
  // Check for conflicting query parameters
  if (url.includes('sslmode=')) {
    console.warn('WARNING: sslmode query parameter found in DATABASE_URL');
  }
}

console.log('PGSSLMODE:', process.env.PGSSLMODE);
console.log('=== End ===');