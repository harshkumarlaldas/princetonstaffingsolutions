/**
 * CAPTCHA verification utilities
 * Using Google reCAPTCHA v3 for better UX
 */

interface CaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyCaptcha(token: string): Promise<{
  success: boolean;
  score?: number;
  error?: string;
}> {
  if (!token) {
    return { success: false, error: 'No CAPTCHA token provided' };
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return { success: false, error: 'CAPTCHA configuration error' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      throw new Error(`CAPTCHA verification failed: ${response.status}`);
    }

    const result: CaptchaVerificationResult = await response.json();

    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      console.warn('CAPTCHA verification failed:', errorCodes);
      return {
        success: false,
        error: `CAPTCHA verification failed: ${errorCodes.join(', ')}`,
      };
    }

    // Check score threshold (0.5 is recommended for contact forms)
    const score = result.score || 0;
    const threshold = 0.5;

    if (score < threshold) {
      console.warn(`CAPTCHA score too low: ${score} (threshold: ${threshold})`);
      return {
        success: false,
        score,
        error: 'CAPTCHA score too low - possible bot activity',
      };
    }

    return {
      success: true,
      score,
    };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CAPTCHA verification failed',
    };
  }
}

export function getCaptchaSiteKey(): string {
  const siteKey = process.env.RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error('RECAPTCHA_SITE_KEY not configured');
  }
  return siteKey;
}

export function isCaptchaConfigured(): boolean {
  return !!(process.env.RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY);
}

