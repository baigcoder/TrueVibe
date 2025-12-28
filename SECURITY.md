# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of TrueVibe seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the project maintainer or through GitHub's private vulnerability reporting feature.

### What to Include

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Updates**: We will provide updates every 5 business days
- **Resolution**: We aim to resolve critical issues within 14 days

### Safe Harbor

We consider security research and vulnerability disclosure activities conducted consistent with this policy to be:

- Authorized concerning applicable anti-hacking laws
- Authorized concerning applicable anti-circumvention laws
- Exempt from restrictions in our Terms of Service that would interfere with conducting security research

## Security Best Practices

### For Users

1. **Strong Passwords**: Use unique, complex passwords
2. **Enable 2FA**: When available, enable two-factor authentication
3. **Keep Updated**: Use the latest version of the application
4. **Report Issues**: Report any suspicious activity

### For Self-Hosters

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Always use HTTPS in production
3. **Updates**: Keep dependencies updated
4. **Backups**: Regularly backup your database
5. **Monitoring**: Monitor logs for suspicious activity

## Security Features

TrueVibe implements several security measures:

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request rate limiting
- **CORS**: Strict Cross-Origin Resource Sharing
- **Helmet**: Security headers via Helmet.js
- **Input Sanitization**: XSS prevention
- **E2E Encryption**: Optional end-to-end encryption for DMs

---

<div align="center">

**Security is everyone's responsibility 🔐**

</div>
