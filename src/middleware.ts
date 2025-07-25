import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting için basit bir Map
const rateLimit = new Map<string, number[]>();
const RATE_LIMIT_DURATION = 60 * 1000; // 1 dakika
const MAX_REQUESTS = 100; // 1 dakikada maksimum istek sayısı

export function middleware(request: NextRequest) {
  // Giriş sayfasına yönlendirme kontrolü
  if (request.nextUrl.pathname === '/giris') {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  response.headers.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim());

  // API Rate Limiting
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_DURATION;
    
    const requestHistory = rateLimit.get(ip) || [];
    const recentRequests = requestHistory.filter((time: number) => time > windowStart);
    
    if (recentRequests.length >= MAX_REQUESTS) {
      return new NextResponse(JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }
    
    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);
  }

  return response;
}

// Middleware'in çalışacağı path'leri belirt
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 