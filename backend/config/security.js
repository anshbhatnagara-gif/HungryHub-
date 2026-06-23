import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const configureSecurity = (app) => {
  // Use Helmet to secure HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        connectSrc: ["'self'", "https://api.razorpay.com", "wss://*.hungryhub.com", "ws://localhost:*"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      }
    }
  }));

  // Enable CORS
  app.use(cors({
    origin: '*', // Allow all for development & testing simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Limit API requests
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
  });

  app.use('/api/', apiLimiter);
};
