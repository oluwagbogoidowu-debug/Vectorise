
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/Button';

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
        <div className="w-20 h-20 bg-green-100 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify your email</h2>
        
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          We have sent you a verification email to <span className="font-bold text-gray-900 block mt-1">{email}</span>
        </p>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800">
            Please check your inbox (and spam folder), click the link to verify your account, and then log in.
        </div>

        <Link to="/login">
            <Button className="w-full py-3.5 text-lg shadow-lg">
                Log In
            </Button>
        </Link>
        
        <div className="mt-6">
            <p className="text-sm text-gray-500">
                Didn't receive the email? <Link to="/signup" className="text-primary hover:underline">Try signing up again</Link> with a different address.
            </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
