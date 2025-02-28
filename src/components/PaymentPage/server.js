import express from 'express';
import { Paynow } from 'paynow';
import cors from 'cors';

const app = express();
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
const THIRTY_DAYS_MS = 150 * ONE_DAY_MS; // 150 days in milliseconds

// CORS configuration
const corsOptions = {
  origin: ['https://chikoro-ai.com', 'http://13.246.95.40:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type'],
};

app.use(cors());
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Paynow credentials and settings
const paynow = new Paynow("19208", "1569d49f-67e7-4e3b-9b7c-168c7d37e312");
paynow.resultUrl = "http://example.com/gateways/paynow/update"; // Should be your backend callback URL
paynow.returnUrl = "https://www.chikoro-ai.com"; // Ensure this is a full URL


// Utility function to check if the user token has expired
const checkTokenValidity = (expirationDate) => {
  const currentDate = new Date().getTime();
  return currentDate < expirationDate;
};

// Endpoint to initiate payment
app.post('/bhadhara', async (req, res) => {
  try {
    const { phoneNumber, token } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    // Create payment with a unique reference
    const payment = paynow.createPayment(`Order-${Date.now()}`, "ronaldbvirinyangwe@icloud.com");

    // Add items to the payment (amount in USD)
    payment.add("Chikoro AI Subscription", 0.50);

    // Send mobile money payment
    const response = await paynow.sendMobile(payment, phoneNumber, 'ecocash');

    if (response.success) {
      const { pollUrl, instructions } = response; // Get the payment instructions and poll URL

      // Return payment initiation details to the client
      return res.status(200).json({
        success: true,
        pollUrl,
        instructions,
      });

    } else {
      throw new Error(response.error || "Payment initiation failed");
    }
  } catch (error) {
    console.error("Payment Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Function to check the payment status with retries
const checkPaymentStatusWithRetry = async (pollUrl, retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const status = await paynow.pollTransaction(pollUrl); // Poll Paynow API
      console.log(`Attempt ${i + 1} - Payment Status:`, status);

      if (status.status === 'paid') {
        console.log("Payment completed successfully");
        return { success: true, status: 'paid' }; // Return success if payment is completed
      }

      console.log("Payment status not 'paid', retrying...");
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay)); // Retry after a delay
      }
    } catch (error) {
      console.error(`Error checking payment status (Attempt ${i + 1}):`, error);
      if (i === retries - 1) {
        return { success: false, message: 'Payment failed after multiple attempts' };
      }
    }
  }
  return { success: false, message: 'Payment still pending' }; // If all retries fail
};

// Endpoint to check payment status
app.post('/check-payment-status', async (req, res) => {
  const { pollUrl } = req.body;

  if (!pollUrl) {
    return res.status(400).json({ success: false, error: 'pollUrl is required.' });
  }

  try {
    const status = await checkPaymentStatusWithRetry(pollUrl);
    console.log('Payment Status:', status);

    if (status.success) {
      // Set the payment status token with expiration (150 days)
      const expirationDate = new Date().getTime() + THIRTY_DAYS_MS; // 150 days from now
      const paymentToken = {
        status: 'paid',
        expirationDate,
      };

      res.status(200).json({
        success: true,
        message: 'Payment completed successfully',
        status: 'paid',
        expirationDate,
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Payment is still pending or failed.',
      });
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


app.listen(3080, () => {
  console.log('Server listening on port 3080');
});
