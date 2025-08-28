'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Snackbar,
  FormHelperText,
} from '@mui/material';
import { Send, CheckCircle, Error } from '@mui/icons-material';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { contactFormSchema, type ContactFormData } from '@/lib/validation/contact.schema';

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const ContactFormInner: React.FC<ContactFormProps> = ({
  title = "Send us a message",
  subtitle = "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
  className = "",
}) => {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [formStartTime] = useState(Date.now());
  const { executeRecaptcha } = useGoogleReCaptcha();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setValue,
    watch,
    register,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      subject: '',
      message: '',
      website: '', // Honeypot field
      privacyConsent: false,
    },
  });

  // Watch form values for real-time validation
  const watchedValues = watch();

  // Update form age on every render
  useEffect(() => {
    const formAge = Math.max(3, Math.floor((Date.now() - formStartTime) / 1000));
    setValue('formAge', formAge);
  }, [formStartTime, setValue]);

  // Update CAPTCHA token in form
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      // For reCAPTCHA v3, we don't need to set the token beforehand
      // It will be generated when the form is submitted
      setValue('captchaToken', 'pending');
    } else {
      // If CAPTCHA is not configured, set a dummy token to pass validation
      setValue('captchaToken', 'captcha-not-configured');
    }
  }, [setValue]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const onSubmit = async (data: ContactFormData) => {
    setSubmitStatus('loading');

    try {
      // Execute reCAPTCHA before form submission
      if (executeRecaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        const token = await executeRecaptcha('contact_form');
        data.captchaToken = token;
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        showSnackbar(result.message || 'Thank you for your message! We will get back to you soon.', 'success');
        reset();
      } else {
        setSubmitStatus('error');
        showSnackbar(result.error || 'Failed to send message. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
      showSnackbar('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 3000);
    }
  };

  const isFormValid = isValid && 
    watchedValues.privacyConsent &&
    (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? true : true); // reCAPTCHA v3 token is generated on submit

  // Debug logging
  console.log('Form validation debug:', {
    isValid,
    privacyConsent: watchedValues.privacyConsent,
    errors,
    formValues: watchedValues,
    // Add detailed validation info
    nameLength: watchedValues.name?.length,
    emailValid: watchedValues.email?.includes('@'),
    phoneValid: watchedValues.phone ? /^\+?[1-9]\d{1,14}$/.test(watchedValues.phone) : 'optional',
    messageLength: watchedValues.message?.length,
    formAge: watchedValues.formAge,
    captchaToken: watchedValues.captchaToken
  });

  return (
    <Box className={className}>
      <Container maxWidth="md">
        <Card
          sx={{
            p: 4,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: (theme) =>
              `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)'
              }`,
          }}
        >
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
            {title}
          </Typography>
          
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              {subtitle}
            </Typography>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* Name Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('name')}
                  fullWidth
                  label="Full Name *"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.name && (
                  <div id="name-error" className="sr-only">
                    {errors.name.message}
                  </div>
                )}
              </Grid>

              {/* Email Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email Address *"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.email && (
                  <div id="email-error" className="sr-only">
                    {errors.email.message}
                  </div>
                )}
              </Grid>

              {/* Phone Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone')}
                  fullWidth
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  error={!!errors.phone}
                  helperText={errors.phone?.message || 'Optional'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.phone && (
                  <div id="phone-error" className="sr-only">
                    {errors.phone.message}
                  </div>
                )}
              </Grid>

              {/* Company Field */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('company')}
                  fullWidth
                  label="Company"
                  error={!!errors.company}
                  helperText={errors.company?.message || 'Optional'}
                  aria-describedby={errors.company ? 'company-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.company && (
                  <div id="company-error" className="sr-only">
                    {errors.company.message}
                  </div>
                )}
              </Grid>

              {/* Subject Field */}
              <Grid item xs={12}>
                <TextField
                  {...register('subject')}
                  fullWidth
                  label="Subject"
                  error={!!errors.subject}
                  helperText={errors.subject?.message || 'Optional'}
                  aria-describedby={errors.subject ? 'subject-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.subject && (
                  <div id="subject-error" className="sr-only">
                    {errors.subject.message}
                  </div>
                )}
              </Grid>

              {/* Message Field */}
              <Grid item xs={12}>
                <TextField
                  {...register('message')}
                  fullWidth
                  label="Message *"
                  multiline
                  rows={4}
                  error={!!errors.message}
                  helperText={errors.message?.message || `${watch('message')?.length || 0}/5000 characters`}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                    },
                  }}
                />
                {errors.message && (
                  <div id="message-error" className="sr-only">
                    {errors.message.message}
                  </div>
                )}
              </Grid>

              {/* Honeypot Field - Hidden from users */}
              <Grid item xs={12} sx={{ display: 'none' }}>
                <TextField
                  {...register('website')}
                  fullWidth
                  label="Website"
                  tabIndex={-1}
                  autoComplete="off"
                  sx={{ display: 'none' }}
                />
              </Grid>

              {/* CAPTCHA */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? (
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        textAlign: 'center',
                        color: 'text.secondary',
                        backgroundColor: '#f5f5f5',
                      }}
                    >
                      <Typography variant="body2">
                        reCAPTCHA v3 is active and will run automatically when you submit the form.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        p: 2,
                        border: '1px dashed #ccc',
                        borderRadius: 1,
                        textAlign: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography variant="body2">
                        CAPTCHA not configured. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables.
                      </Typography>
                    </Box>
                  )}
                </Box>
                {errors.captchaToken && (
                  <FormHelperText error sx={{ textAlign: 'center' }}>
                    {errors.captchaToken.message}
                  </FormHelperText>
                )}
              </Grid>

              {/* Privacy Consent */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      {...register('privacyConsent')}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{' '}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </a>{' '}
                      *
                    </Typography>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
                {errors.privacyConsent && (
                  <FormHelperText error>
                    {errors.privacyConsent.message}
                  </FormHelperText>
                )}
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={!isFormValid || submitStatus === 'loading'}
                      endIcon={
                        submitStatus === 'loading' ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : submitStatus === 'success' ? (
                          <CheckCircle />
                        ) : submitStatus === 'error' ? (
                          <Error />
                        ) : (
                          <Send />
                        )
                      }
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        background:
                          submitStatus === 'success'
                            ? 'linear-gradient(45deg, #4caf50, #81c784)'
                            : submitStatus === 'error'
                            ? 'linear-gradient(45deg, #f44336, #e57373)'
                            : 'linear-gradient(45deg, #1976d2, #dc004e)',
                        '&:hover': {
                          background:
                            submitStatus === 'success'
                              ? 'linear-gradient(45deg, #388e3c, #66bb6a)'
                              : submitStatus === 'error'
                              ? 'linear-gradient(45deg, #d32f2f, #ef5350)'
                              : 'linear-gradient(45deg, #1565c0, #9a0036)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 10px 30px rgba(25, 118, 210, 0.3)',
                        },
                        '&:disabled': {
                          background: 'rgba(0, 0, 0, 0.12)',
                        },
                      }}
                    >
                      {submitStatus === 'loading'
                        ? 'Sending...'
                        : submitStatus === 'success'
                        ? 'Message Sent!'
                        : submitStatus === 'error'
                        ? 'Send Failed'
                        : 'Send Message'}
                    </Button>
                  </motion.div>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Card>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const ContactForm: React.FC<ContactFormProps> = (props) => {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    return <ContactFormInner {...props} />;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: 'head',
        nonce: undefined,
      }}
    >
      <ContactFormInner {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default ContactForm;
