import React, { useState, useEffect } from 'react';
import { Quote } from '../../types';
import { quoteService } from '../../services/quoteService';

const AdminQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      try {
        const fetched = await quoteService.getQuotes();
        setQuotes(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <h3 className="text-2xl font-black text-gray-900 italic">Quotes</h3>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Quote</th><th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Author</th></tr></thead>
          <tbody>{quotes.map(quote => (
              <tr key={quote.id} className="hover:bg-gray-50/50"><td className="px-8 py-5"><p className="font-bold text-gray-900 text-sm">{quote.text}</p></td><td className="px-8 py-5"><p className="text-[10px] text-gray-400 uppercase">{quote.author}</p></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminQuotes;
