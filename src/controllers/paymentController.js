import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(500).json({ error: 'Failed to create Razorpay order' });
    }

    res.json({
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
