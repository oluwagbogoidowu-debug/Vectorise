
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const HomePage: React.FC = () => {
  return (
    <div className="text-center py-16 px-4">
      <h1 className="text-4xl md:text-6xl font-extrabold text-dark tracking-tight mb-4">
        Achieve <span className="text-primary">Visible Progress</span>, Fast.
      </h1>
      <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-8">
        Vectorise is a personal growth sprint platform. Join short, high-impact programs designed by expert coaches to bring you clarity and results in 7-21 days.
      </p>
      <div className="flex justify-center gap-4">
        <Link to="/onboarding/welcome">
            <Button variant="primary" className="text-lg px-8 py-3">Get Started</Button>
        </Link>
      </div>
       <div className="mt-16 max-w-4xl mx-auto">
        <img src="https://picsum.photos/800/600" alt="Inspirational dashboard" className="rounded-lg shadow-2xl"/>
      </div>
    </div>
  );
};

export default HomePage;
