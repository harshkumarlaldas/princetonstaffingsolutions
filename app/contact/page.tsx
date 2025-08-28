'use client';

import { Box } from '@mui/material';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import ContactForm from '../components/forms/ContactForm';

export default function ContactPage() {
  return (
    <>
      <Header />
      <Box sx={{ pt: 8, pb: 8 }}>
        <ContactForm 
          title="Contact Princeton Staffing Solutions"
          subtitle="Ready to find your next opportunity or hire top talent? Let's discuss how we can help you achieve your goals."
        />
      </Box>
      <Footer />
    </>
  );
}