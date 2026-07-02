import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

dotenv.config();

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync(new URL('./serviceAccountKey.json', import.meta.url))
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("Failed to load serviceAccountKey.json. Make sure the file exists and is valid.");
}

const db = admin.firestore && admin.apps.length ? admin.firestore() : null;

// Initialize Twilio
let twilioClient;
if (process.env.VITE_TWILIO_ACCOUNT_SID && process.env.VITE_TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.VITE_TWILIO_ACCOUNT_SID,
    process.env.VITE_TWILIO_AUTH_TOKEN
  );
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/send-fee-warning', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    
    if (!db) {
      return res.status(500).json({ error: 'Firebase Admin not initialized properly' });
    }

    const doc = await db.collection('students').doc(studentId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Student not found in Firestore' });
    }

    const data = doc.data();
    const { studentName, studentPhone, parentPhone, courseName, pendingFee } = data;

    const messageBody = `Dear Parent/Student, This is a reminder from CoreLearn LMS that the course fee pending for ${studentName} (${courseName}) is Rs.${pendingFee}. Please clear it soon.`;
    const fromNumber = process.env.VITE_TWILIO_WHATSAPP_NUMBER;

    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio Client not initialized properly' });
    }

    const promises = [];
    if (studentPhone) {
      promises.push(
        twilioClient.messages.create({
          body: messageBody,
          from: fromNumber,
          to: `whatsapp:${studentPhone}`
        })
      );
    }
    if (parentPhone) {
      promises.push(
        twilioClient.messages.create({
          body: messageBody,
          from: fromNumber,
          to: `whatsapp:${parentPhone}`
        })
      );
    }

    if (promises.length === 0) {
      return res.status(400).json({ error: 'No phone numbers found for the student' });
    }

    await Promise.all(promises);
    return res.status(200).json({ success: true, message: 'Fee warning sent successfully' });

  } catch (error) {
    console.error('Error in send-fee-warning:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/send-attendance-alert', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    
    if (!db) {
      return res.status(500).json({ error: 'Firebase Admin not initialized properly' });
    }

    const doc = await db.collection('students').doc(studentId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Student not found in Firestore' });
    }

    const data = doc.data();
    const { studentName, parentPhone, courseName } = data;

    const messageBody = `Dear Parent, This is to inform you that your ward ${studentName} was ABSENT for today's ${courseName} live class session.`;
    const fromNumber = process.env.VITE_TWILIO_WHATSAPP_NUMBER;
    
    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio Client not initialized properly' });
    }

    if (parentPhone) {
      await twilioClient.messages.create({
        body: messageBody,
        from: fromNumber,
        to: `whatsapp:${parentPhone}`
      });
      return res.status(200).json({ success: true, message: 'Attendance alert sent successfully' });
    } else {
      return res.status(400).json({ error: 'Parent phone number not found for the student' });
    }

  } catch (error) {
    console.error('Error in send-attendance-alert:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/send-attendance-whatsapp', async (req, res) => {
  try {
    const { parentPhone, studentName, batchName } = req.body;
    
    if (!parentPhone || !studentName || !batchName) {
      return res.status(400).json({ error: 'parentPhone, studentName, and batchName are required' });
    }

    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio Client not initialized properly' });
    }

    const fromNumber = process.env.VITE_TWILIO_WHATSAPP_NUMBER;
    
    if (!fromNumber) {
       return res.status(500).json({ error: 'VITE_TWILIO_WHATSAPP_NUMBER not configured' });
    }

    // Since VITE_TWILIO_WHATSAPP_NUMBER might already have "whatsapp:" prefix or not, we handle it
    const fromString = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
    const toString = parentPhone.startsWith('whatsapp:') ? parentPhone : `whatsapp:${parentPhone}`;

    const messageBody = `Dear Parent, your ward ${studentName} did not attend the ${batchName} session today. We kindly request you to ensure their regular attendance, and please try to avoid absences in the future for their continuous learning progress. Thank you, Team CoreLearn.`;

    const response = await twilioClient.messages.create({
      from: fromString,
      to: toString,
      body: messageBody
    });

    return res.status(200).json({ 
      success: true, 
      message: 'WhatsApp notification sent successfully',
      messageSid: response.sid
    });
    
  } catch (error) {
    console.error('Error in send-attendance-whatsapp:', error);
    return res.status(500).json({ error: 'Failed to send WhatsApp message', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
